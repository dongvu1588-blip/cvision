"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
      // Không chặn trang quản lý việc làm nếu tài khoản hiện tại không có quyền đọc applications.
      console.warn("Không tải được số lượng hồ sơ theo việc làm:", applicationResult.error.message);
      setApplicationCounts({});
    } else {
      const counts: Record<string, number> = {};
      (applicationResult.data || []).forEach((item: { job_id: string | null }) => {
        if (item.job_id) counts[item.job_id] = (counts[item.job_id] || 0) + 1;
      });
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
      alert((editingJob ? "Không thể cập nhật" : "Không thể tạo") + " tin tuyển dụng: " + result.error.message);
      return;
    }

    alert(editingJob ? "Đã cập nhật tin tuyển dụng!" : "Đã tạo tin tuyển dụng thành công!");
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
    const message = count > 0
      ? `Tin này đang có ${count} hồ sơ ứng tuyển. Bạn có chắc muốn xóa? Nếu cơ sở dữ liệu đang ràng buộc hồ sơ với tin tuyển dụng, thao tác xóa có thể bị từ chối.`
      : "Bạn có chắc muốn xóa tin tuyển dụng này?";

    if (!window.confirm(message)) return;

    setDeletingId(job.id);
    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
    setDeletingId("");

    if (error) {
      alert("Không thể xóa tin tuyển dụng: " + error.message + "\n\nGợi ý: Nếu đã có ứng viên ứng tuyển, hãy chuyển trạng thái sang 'Đã đóng' thay vì xóa.");
      return;
    }

    await loadData();
  }

  async function updateStatus(id: string, newStatus: string) {
    const previousJobs = jobs;
    setJobs((current) => current.map((job) => job.id === id ? { ...job, status: newStatus } : job));

    const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
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
      const matchesSearch = !keyword ||
        `${job.title} ${job.companies?.name || ""} ${job.location || ""} ${job.salary || ""}`
          .toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "Tất cả" || job.status === statusFilter;
      const matchesCompany = companyFilter === "Tất cả" || job.company_id === companyFilter;
      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [jobs, search, statusFilter, companyFilter]);

  const activeCount = jobs.filter((job) => job.status === "Đang tuyển").length;
  const pausedCount = jobs.filter((job) => job.status === "Tạm dừng").length;
  const closedCount = jobs.filter((job) => job.status === "Đã đóng").length;
  const totalApplications = Object.values(applicationCounts).reduce((sum, count) => sum + count, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <a href="/admin/dashboard" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Quay lại Dashboard
        </a>

        <div className="mb-7 mt-4">
          <p className="text-sm text-slate-500">CVISION / Quản lý việc làm</p>
          <h1 className="mt-2 text-3xl font-extrabold">Quản lý việc làm</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tạo, chỉnh sửa và theo dõi các vị trí tuyển dụng của doanh nghiệp.
          </p>
        </div>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Tổng tin tuyển dụng", value: jobs.length, color: "text-slate-800" },
            { label: "Đang tuyển", value: activeCount, color: "text-emerald-700" },
            { label: "Tạm dừng", value: pausedCount, color: "text-amber-600" },
            { label: "Đã đóng", value: closedCount, color: "text-slate-500" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${item.color}`}>{loading ? "..." : item.value}</p>
            </div>
          ))}
        </section>

        <form onSubmit={saveJob} className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{editingJob ? "Chỉnh sửa tin tuyển dụng" : "Tạo tin tuyển dụng mới"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Các trường có dấu * là bắt buộc.
              </p>
            </div>
            {editingJob && (
              <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              required
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              placeholder="Tên vị trí tuyển dụng *"
              className="rounded-lg border p-3 outline-none focus:border-emerald-500"
            />

            <select
              value={form.company_id}
              onChange={(e) => updateForm("company_id", e.target.value)}
              className="rounded-lg border p-3 outline-none focus:border-emerald-500"
            >
              <option value="">Chọn doanh nghiệp</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>

            <input
              value={form.location}
              onChange={(e) => updateForm("location", e.target.value)}
              placeholder="Địa điểm làm việc"
              className="rounded-lg border p-3 outline-none focus:border-emerald-500"
            />

            <input
              value={form.salary}
              onChange={(e) => updateForm("salary", e.target.value)}
              placeholder="Mức lương, ví dụ: 20–30 triệu"
              className="rounded-lg border p-3 outline-none focus:border-emerald-500"
            />

            <textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="Mô tả công việc"
              rows={5}
              className="rounded-lg border p-3 outline-none focus:border-emerald-500 md:col-span-2"
            />

            <textarea
              value={form.requirements}
              onChange={(e) => updateForm("requirements", e.target.value)}
              placeholder="Yêu cầu ứng viên"
              rows={5}
              className="rounded-lg border p-3 outline-none focus:border-emerald-500 md:col-span-2"
            />

            <select
              value={form.status}
              onChange={(e) => updateForm("status", e.target.value)}
              className="rounded-lg border p-3 outline-none focus:border-emerald-500"
            >
              {JOB_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : editingJob ? "Lưu thay đổi" : "+ Tạo tin tuyển dụng"}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Danh sách việc làm</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hiển thị {filteredJobs.length} / {jobs.length} tin · {totalApplications} lượt ứng tuyển đã ghi nhận
                </p>
              </div>
              <button onClick={loadData} type="button" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                ↻ Làm mới
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm vị trí, công ty, địa điểm..."
                className="rounded-lg border p-3 md:col-span-1"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border p-3">
                <option value="Tất cả">Tất cả trạng thái</option>
                {JOB_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="rounded-lg border p-3">
                <option value="Tất cả">Tất cả doanh nghiệp</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </div>

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
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
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
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">Đang tải dữ liệu...</p>
          ) : filteredJobs.length === 0 ? (
            <p className="py-8 text-center text-slate-400">Không tìm thấy tin tuyển dụng phù hợp.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Vị trí</th>
                    <th className="p-3">Doanh nghiệp</th>
                    <th className="p-3">Địa điểm</th>
                    <th className="p-3">Mức lương</th>
                    <th className="p-3">Ứng viên</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-semibold">{job.title}</td>
                      <td className="p-3">{job.companies?.name || "Chưa chọn"}</td>
                      <td className="p-3">{job.location || "—"}</td>
                      <td className="p-3">{job.salary || "Thỏa thuận"}</td>
                      <td className="p-3 font-semibold">{applicationCounts[job.id] || 0}</td>
                      <td className="p-3">
                        <select
                          value={JOB_STATUSES.includes(job.status) ? job.status : "Đã đóng"}
                          onChange={(e) => updateStatus(job.id, e.target.value)}
                          className="rounded-lg border p-2"
                        >
                          {JOB_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(job)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === job.id}
                            onClick={() => deleteJob(job)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
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
        </section>
      </div>
    </main>
  );
}
