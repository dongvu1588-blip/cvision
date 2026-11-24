
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AIJobMatcher from "@/components/AIJobMatcher";

type Company = {
  id: string;
  name: string;
};

type Job = {
  id: string;
  title: string;
  company_id: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  status: string;
  created_at?: string;
  companies: { name: string } | null;
};

type JobForm = {
  title: string;
  company_id: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
  status: string;
};

const EMPTY_FORM: JobForm = {
  title: "",
  company_id: "",
  location: "",
  salary: "",
  description: "",
  requirements: "",
  status: "Đang tuyển",
};

const JOB_STATUSES = ["Đang tuyển", "Tạm dừng", "Đã đóng"];

const JOB_JSON_PROMPT = `Hãy đọc JD tôi gửi và trích xuất thông tin thành MỘT JSON hợp lệ.
Chỉ trả về JSON, không giải thích, không Markdown, không dùng dấu code fence.
Không tự bịa thông tin; trường không có trong JD để chuỗi rỗng.
Trả đúng cấu trúc:
{
  "title": "",
  "company": "",
  "location": "",
  "salary": "",
  "description": "",
  "requirements": ""
}`;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [companyFilter, setCompanyFilter] = useState("Tất cả");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonNotice, setJsonNotice] = useState("");

  async function loadData() {
    setLoading(true);

    const [jobResult, companyResult, applicationResult] = await Promise.all([
      supabase
        .from("jobs")
        .select("*, companies(name)")
        .order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("applications").select("job_id"),
    ]);

    if (jobResult.error) {
      alert("Lỗi tải việc làm: " + jobResult.error.message);
    } else {
      setJobs((jobResult.data || []) as unknown as Job[]);
    }

    if (companyResult.error) {
      alert("Lỗi tải công ty: " + companyResult.error.message);
    } else {
      setCompanies(companyResult.data || []);
    }

    if (applicationResult.error) {
      console.warn(
        "Không tải được số lượng hồ sơ theo việc làm:",
        applicationResult.error.message
      );
      setApplicationCounts({});
    } else {
      const counts: Record<string, number> = {};
      (applicationResult.data || []).forEach(
        (item: { job_id: string | null }) => {
          if (item.job_id) {
            counts[item.job_id] = (counts[item.job_id] || 0) + 1;
          }
        }
      );
      setApplicationCounts(counts);
    }

    setLoading(false);
  }

  function updateForm<K extends keyof JobForm>(key: K, value: JobForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingJob(null);
    setJsonText("");
    setJsonError("");
    setJsonNotice("");
  }

  async function copyJobPrompt() {
    try {
      await navigator.clipboard.writeText(JOB_JSON_PROMPT);
      setJsonError("");
      setJsonNotice("Đã sao chép hướng dẫn. Hãy gửi hướng dẫn này cùng JD cho ChatGPT.");
    } catch {
      setJsonError("Không thể sao chép tự động. Bạn có thể mở phần 'Xem hướng dẫn' và sao chép thủ công.");
    }
  }

  function decodeHtmlEntities(value: string): string {
    return value
      .replace(/&quot;/gi, '"')
      .replace(/&apos;|&#39;|&#x27;/gi, "'")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/&#([0-9]+);/g, (_, number: string) =>
        String.fromCodePoint(Number(number))
      );
  }

  function extractJsonBlock(value: string): string {
    const start = value.search(/[\[{]/);
    if (start < 0) {
      throw new Error("Không tìm thấy JSON. Hãy dán phần kết quả JSON từ ChatGPT.");
    }

    const opening = value[start];
    const closing = opening === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < value.length; i++) {
      const char = value[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === opening) {
        depth++;
      } else if (char === closing) {
        depth--;
        if (depth === 0) return value.slice(start, i + 1);
      }
    }

    throw new Error("JSON chưa đầy đủ dấu ngoặc. Hãy copy lại toàn bộ kết quả ChatGPT.");
  }

  function parseJobJson(input: string): Record<string, unknown> {
    let raw = decodeHtmlEntities(input)
      .replace(/^\uFEFF/, "")
      .trim()
      .replace(/^```(?:json|javascript|js)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!raw) throw new Error("Bạn chưa dán nội dung JD.");

    const attempts: string[] = [raw];

    // Xử lý trường hợp toàn bộ JSON được bọc trong một chuỗi JSON.
    try {
      const decoded = JSON.parse(raw);
      if (typeof decoded === "string") attempts.unshift(decoded);
      else if (decoded && typeof decoded === "object") {
        const item = Array.isArray(decoded) ? decoded[0] : decoded;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return item as Record<string, unknown>;
        }
      }
    } catch {
      // Tiếp tục thử các dạng văn bản khác.
    }

    // Nếu có lời dẫn trước/sau JSON, chỉ lấy khối JSON cân bằng.
    try {
      attempts.push(extractJsonBlock(raw));
    } catch {
      // Giữ lỗi để báo ở cuối nếu không có cách nào đọc được.
    }

    for (const candidate of [...attempts]) {
      // JSON bị escape kiểu {\"title\":\"...\"}
      attempts.push(candidate.replace(/\\"/g, '"'));
      // Một số nội dung copy có dấu gạch chéo ngược thừa ngay trước dấu đóng } hoặc ].
      attempts.push(candidate.replace(/\\(?=\s*[}\]])/g, ""));
      // Chuẩn hóa dấu nháy cong, dấu phẩy thừa và ký tự HTML.
      attempts.push(
        candidate
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/\\(?=\s*[}\]])/g, "")
          .replace(/,\s*([}\]])/g, "$1")
      );
    }

    const uniqueAttempts = [...new Set(attempts)];

    for (const candidate of uniqueAttempts) {
      try {
        let parsed: unknown = JSON.parse(candidate.trim());

        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }

        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        if (data && typeof data === "object" && !Array.isArray(data)) {
          return data as Record<string, unknown>;
        }
      } catch {
        // Thử ứng viên tiếp theo.
      }
    }

    // Thử sửa key không có dấu nháy: {title: "..."}.
    for (const candidate of uniqueAttempts) {
      const normalized = candidate
        .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, '$1"$2"$3')
        .replace(/,\s*([}\]])/g, "$1");

      try {
        const parsed: unknown = JSON.parse(normalized);
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        if (data && typeof data === "object" && !Array.isArray(data)) {
          return data as Record<string, unknown>;
        }
      } catch {
        // Báo lỗi rõ ràng ở dưới.
      }
    }

    throw new Error(
      "Không đọc được JSON. Hãy copy toàn bộ câu trả lời ChatGPT, không chỉnh sửa nội dung trong lúc copy."
    );
  }

  function importJobJson() {
    setJsonError("");
    setJsonNotice("");

    try {
      const data = parseJobJson(jsonText);

      const readText = (...keys: string[]) => {
        for (const key of keys) {
          const value = data[key];
          if (typeof value === "string" || typeof value === "number") {
            return String(value).trim();
          }
        }
        return "";
      };

      const companyName = readText(
        "company",
        "company_name",
        "companyName",
        "employer"
      );
      const normalizedCompany = companyName.toLocaleLowerCase("vi").trim();
      const matchedCompany = companies.find(
        (company) =>
          company.name.toLocaleLowerCase("vi").trim() === normalizedCompany
      );

      const title = readText("title", "position", "job_title", "jobTitle");
      const location = readText("location", "job_location", "work_location");
      const salary = readText("salary", "salary_range", "income");
      const description = readText(
        "description",
        "job_description",
        "responsibilities"
      );
      const requirements = readText(
        "requirements",
        "job_requirements",
        "qualifications"
      );

      if (!title && !description && !requirements) {
        throw new Error(
          "JSON đã đọc được nhưng không có tên vị trí, mô tả hoặc yêu cầu tuyển dụng."
        );
      }

      setForm((current) => ({
        ...current,
        title: title || current.title,
        company_id: matchedCompany?.id || "",
        location: location || current.location,
        salary: salary || current.salary,
        description: description || current.description,
        requirements: requirements || current.requirements,
      }));

      setJsonNotice(
        companyName && !matchedCompany
          ? `Đã đọc JD. Chưa tìm thấy doanh nghiệp "${companyName}" trong hệ thống; vui lòng chọn doanh nghiệp trong danh sách.`
          : "Đã đọc JD thành công và tự động điền biểu mẫu. Vui lòng kiểm tra trước khi lưu."
      );
    } catch (error) {
      setJsonError(
        error instanceof Error
          ? error.message
          : "Không đọc được nội dung. Vui lòng kiểm tra lại."
      );
    }
  }

  async function saveJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Vui lòng nhập tên vị trí tuyển dụng.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      company_id: form.company_id || null,
      location: form.location.trim() || null,
      salary: form.salary.trim() || null,
      description: form.description.trim() || null,
      requirements: form.requirements.trim() || null,
      status: form.status,
    };

    const result = editingJob
      ? await supabase.from("jobs").update(payload).eq("id", editingJob.id)
      : await supabase.from("jobs").insert(payload);

    setSaving(false);

    if (result.error) {
      alert(
        (editingJob ? "Không thể cập nhật" : "Không thể tạo") +
          " tin tuyển dụng: " +
          result.error.message
      );
      return;
    }

    alert(
      editingJob
        ? "Đã cập nhật tin tuyển dụng!"
        : "Đã tạo tin tuyển dụng thành công!"
    );

    resetForm();
    await loadData();
  }

  function startEditing(job: Job) {
    setEditingJob(job);

    setForm({
      title: job.title || "",
      company_id: job.company_id || "",
      location: job.location || "",
      salary: job.salary || "",
      description: job.description || "",
      requirements: job.requirements || "",
      status: job.status || "Đang tuyển",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteJob(job: Job) {
    const count = applicationCounts[job.id] || 0;

    const message =
      count > 0
        ? `Tin này đang có ${count} hồ sơ ứng tuyển. Bạn có chắc muốn xóa? Nếu cơ sở dữ liệu đang ràng buộc hồ sơ với tin tuyển dụng, thao tác xóa có thể bị từ chối.`
        : "Bạn có chắc muốn xóa tin tuyển dụng này?";

    if (!window.confirm(message)) return;

    setDeletingId(job.id);

    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id);

    setDeletingId("");

    if (error) {
      alert(
        "Không thể xóa tin tuyển dụng: " +
          error.message +
          "\n\nGợi ý: Nếu đã có ứng viên ứng tuyển, hãy chuyển trạng thái sang 'Đã đóng' thay vì xóa."
      );
      return;
    }

    await loadData();
  }

  async function updateStatus(id: string, newStatus: string) {
    const previousJobs = jobs;

    setJobs((current) =>
      current.map((job) =>
        job.id === id ? { ...job, status: newStatus } : job
      )
    );

    const { error } = await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      setJobs(previousJobs);
      alert("Không thể cập nhật trạng thái: " + error.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredJobs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !keyword ||
        `${job.title} ${job.companies?.name || ""} ${job.location || ""} ${job.salary || ""}`
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "Tất cả" || job.status === statusFilter;

      const matchesCompany =
        companyFilter === "Tất cả" || job.company_id === companyFilter;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [jobs, search, statusFilter, companyFilter]);

  const activeCount = jobs.filter((job) => job.status === "Đang tuyển").length;
  const pausedCount = jobs.filter((job) => job.status === "Tạm dừng").length;
  const closedCount = jobs.filter((job) => job.status === "Đã đóng").length;

  const totalApplications = Object.values(applicationCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const inputClass =
    "w-full rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100 p-4 text-slate-800 md:p-8">
      {/* Họa tiết nền */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <a
          href="/admin/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-white/90 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
        >
          ← Quay lại Dashboard
        </a>

        {/* Tiêu đề */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            CVISION RECRUITMENT SYSTEM
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
            Quản lý việc làm
          </h1>

          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Tạo, chỉnh sửa và theo dõi các vị trí tuyển dụng của doanh nghiệp.
          </p>
        </div>

        {/* AI đề xuất việc làm cho ứng viên */}
        <AIJobMatcher />

        {/* Thống kê */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Tổng tin tuyển dụng",
              value: jobs.length,
              icon: "📋",
              color: "text-slate-800",
              bg: "bg-slate-100",
            },
            {
              label: "Đang tuyển",
              value: activeCount,
              icon: "🟢",
              color: "text-sky-700",
              bg: "bg-sky-100",
            },
            {
              label: "Tạm dừng",
              value: pausedCount,
              icon: "⏸️",
              color: "text-blue-700",
              bg: "bg-blue-100",
            },
            {
              label: "Đã đóng",
              value: closedCount,
              icon: "📁",
              color: "text-slate-500",
              bg: "bg-slate-100",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {item.label}
                </p>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} text-xl`}
                >
                  {item.icon}
                </span>
              </div>
              <p className={`mt-3 text-3xl font-extrabold ${item.color}`}>
                {loading ? "..." : item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Form tạo và chỉnh sửa */}
        <form
          onSubmit={saveJob}
          className="mb-8 overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-100/80 to-blue-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                {editingJob ? "✏️" : "＋"}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingJob
                    ? "Chỉnh sửa tin tuyển dụng"
                    : "Tạo tin tuyển dụng mới"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Các trường có dấu * là bắt buộc.
                </p>
              </div>
            </div>

            {editingJob && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          <div className="p-6">
            {!editingJob && (
              <section className="mb-6 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800">✨ Nhập JD bằng ChatGPT</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Copy hướng dẫn → gửi kèm JD cho ChatGPT → dán JSON trả về → tự động điền biểu mẫu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyJobPrompt}
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow-md"
                  >
                    Copy hướng dẫn ChatGPT
                  </button>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setJsonError("");
                    setJsonNotice("");
                  }}
                  rows={7}
                  placeholder={'Dán JSON ChatGPT trả về vào đây...\\n{\\n  "title": "Process Quality Engineer",\\n  "company": "Luxshare",\\n  "location": "KCN Quang Châu, Bắc Giang",\\n  "salary": "20-35 triệu",\\n  "description": "...",\\n  "requirements": "..."\\n}'}
                  className="mt-4 w-full rounded-xl border border-sky-100 bg-white p-3 font-mono text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={importJobJson}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Đọc JSON và tự điền
                  </button>
                  <button
                    type="button"
                    onClick={() => { setJsonText(""); setJsonError(""); setJsonNotice(""); }}
                    className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-sky-50"
                  >
                    Xóa JSON
                  </button>
                  <details className="w-full pt-1 text-sm text-slate-600">
                    <summary className="cursor-pointer font-semibold text-sky-700">Xem hướng dẫn ChatGPT</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-sky-100 bg-white p-3 text-xs">{JOB_JSON_PROMPT}</pre>
                  </details>
                </div>
                {jsonError && <p className="mt-3 text-sm font-semibold text-red-600">{jsonError}</p>}
                {jsonNotice && <p className="mt-3 text-sm font-semibold text-emerald-700">{jsonNotice}</p>}
              </section>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Tên vị trí tuyển dụng <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Ví dụ: Process Engineer"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Doanh nghiệp
                </label>
                <select
                  value={form.company_id}
                  onChange={(e) => updateForm("company_id", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn doanh nghiệp</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Địa điểm làm việc
                </label>
                <input
                  value={form.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                  placeholder="Ví dụ: Bắc Ninh, Bắc Giang..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Mức lương
                </label>
                <input
                  value={form.salary}
                  onChange={(e) => updateForm("salary", e.target.value)}
                  placeholder="Ví dụ: 20–30 triệu"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Mô tả công việc
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Nhập mô tả công việc..."
                  rows={5}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Yêu cầu ứng viên
                </label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => updateForm("requirements", e.target.value)}
                  placeholder="Nhập yêu cầu về trình độ, kinh nghiệm, kỹ năng..."
                  rows={5}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Trạng thái tin tuyển dụng
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className={inputClass}
                >
                  {JOB_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Đang lưu..."
                : editingJob
                  ? "Lưu thay đổi"
                  : "＋ Tạo tin tuyển dụng"}
            </button>
          </div>
        </form>

        {/* Danh sách việc làm */}
        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-white to-sky-50/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Danh sách việc làm
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hiển thị {filteredJobs.length} / {jobs.length} tin ·{" "}
                  {totalApplications} lượt ứng tuyển đã ghi nhận
                </p>
              </div>

              <button
                onClick={loadData}
                type="button"
                className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                ↻ Làm mới
              </button>
            </div>

            {/* Bộ lọc */}
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔎 Tìm vị trí, công ty, địa điểm..."
                className={inputClass}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClass}
              >
                <option value="Tất cả">Tất cả trạng thái</option>
                {JOB_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className={inputClass}
              >
                <option value="Tất cả">Tất cả doanh nghiệp</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc nhanh */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Tất cả job", value: "Tất cả" },
                { label: "Đang tuyển", value: "Đang tuyển" },
                { label: "Tạm dừng", value: "Tạm dừng" },
                { label: "Đã đóng", value: "Đã đóng" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === item.value
                      ? "border-sky-600 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm"
                      : "border-sky-100 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("Tất cả");
                  setCompanyFilter("Tất cả");
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 py-12 text-center">
                <div className="mb-3 text-4xl">📋</div>
                <p className="font-semibold text-slate-700">
                  Không tìm thấy tin tuyển dụng phù hợp.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Thử thay đổi từ khóa hoặc bộ lọc.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sky-100">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-gradient-to-r from-sky-100 to-blue-50 text-slate-700">
                    <tr>
                      <th className="p-4 font-bold">Vị trí</th>
                      <th className="p-4 font-bold">Doanh nghiệp</th>
                      <th className="p-4 font-bold">Địa điểm</th>
                      <th className="p-4 font-bold">Mức lương</th>
                      <th className="p-4 text-center font-bold">Ứng viên</th>
                      <th className="p-4 font-bold">Trạng thái</th>
                      <th className="p-4 font-bold">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-sky-50 transition last:border-0 hover:bg-sky-50/60"
                      >
                        <td className="p-4 font-bold text-slate-800">
                          {job.title}
                        </td>

                        <td className="p-4 text-slate-600">
                          {job.companies?.name || "Chưa chọn"}
                        </td>

                        <td className="p-4 text-slate-600">
                          {job.location || "—"}
                        </td>

                        <td className="p-4 text-slate-600">
                          {job.salary || "Thỏa thuận"}
                        </td>

                        <td className="p-4 text-center">
                          <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-sky-100 px-2 py-1.5 font-bold text-sky-700">
                            {applicationCounts[job.id] || 0}
                          </span>
                        </td>

                        <td className="p-4">
                          <select
                            value={
                              JOB_STATUSES.includes(job.status)
                                ? job.status
                                : "Đã đóng"
                            }
                            onChange={(e) =>
                              updateStatus(job.id, e.target.value)
                            }
                            className="rounded-xl border border-sky-100 bg-sky-50/60 p-2 text-xs font-semibold text-sky-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          >
                            {JOB_STATUSES.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(job)}
                              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              disabled={deletingId === job.id}
                              onClick={() => deleteJob(job)}
                              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingId === job.id ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          CVISION · Recruitment Management System
        </p>
      </div>
    </main>
  );
}
