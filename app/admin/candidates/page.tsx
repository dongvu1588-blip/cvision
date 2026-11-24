"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteLogo from "@/components/SiteLogo";

type Candidate = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  skills: string | null;
  experience: string | null;
  cv_url: string | null;
  source: string | null;
  created_at: string;
  birth_year: number | null;
  province: string | null;
  education: string | null;
  languages: string | null;
  latest_position: string | null;
  latest_company: string | null;
  photo_url: string | null;
  status: string | null;
  uploaded_by: string | null;
};

type CandidateJson = {
  full_name?: string;
  name?: string;
  birth_year?: number | string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  province?: string | null;
  education?: string | null;
  languages?: string | string[] | null;
  skills?: string | string[] | null;
  experience?: string | null;
  latest_position?: string | null;
  position?: string | null;
  latest_company?: string | null;
  company?: string | null;
};

const menu = [
  { icon: "▦", name: "Dashboard", href: "/admin/dashboard" },
  { icon: "♙", name: "Ứng viên", href: "/admin/candidates" },
  { icon: "▤", name: "Quản lý công việc", href: "/admin/jobs" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
  { icon: "▧", name: "Báo cáo", href: "/admin/reports" },
  { icon: "◈", name: "Quản lý tài chính", href: "/admin/finance" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const JSON_COPY_PROMPT = `Hãy đọc CV PDF tôi gửi kèm và trích xuất thông tin ứng viên.
Chỉ lấy thông tin có trong CV, không tự suy đoán hoặc bịa thông tin.
Nếu không tìm thấy thông tin, hãy để null; riêng languages và skills có thể để mảng rỗng [].
Trả về duy nhất một JSON hợp lệ, không giải thích, không dùng dấu Markdown.

Cấu trúc JSON:
{
  "full_name": null,
  "birth_year": null,
  "phone": null,
  "email": null,
  "address": null,
  "province": null,
  "education": null,
  "languages": [],
  "skills": [],
  "experience": null,
  "latest_position": null,
  "latest_company": null
}`;

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function CandidatesPage() {
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [activeTab, setActiveTab] = useState<"valid" | "invalid">("valid");
  const [keyword, setKeyword] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [educationFilter, setEducationFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingCv, setReadingCv] = useState(false);
  const [aiReadError, setAiReadError] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [form, setForm] = useState<CandidateJson>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [openingCv, setOpeningCv] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [approvingCandidateId, setApprovingCandidateId] = useState<string | null>(null);
  const [approvedCandidateIds, setApprovedCandidateIds] = useState<string[]>([]);

  const isAdmin = currentRole === "admin";

  async function copyJsonPrompt() {
    try {
      await navigator.clipboard.writeText(JSON_COPY_PROMPT);
      alert("Đã copy hướng dẫn. Hãy mở ChatGPT, tải CV PDF lên và dán hướng dẫn này vào.");
    } catch {
      alert("Trình duyệt không cho phép copy tự động. Hãy kiểm tra quyền Clipboard hoặc mở website bằng HTTPS.");
    }
  }

  async function loadCurrentUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/admin/login");
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      alert("Không tải được thông tin tài khoản: " + (error?.message || ""));
      return;
    }

    setCurrentRole(profile.role || "");
    setCurrentName(profile.full_name || user.email || "Nhân viên");
  }

  async function loadCandidates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không tải được ứng viên: " + error.message);
    } else {
      const rows = (data || []) as Candidate[];
      setCandidates(rows);

      if (rows.length > 0) {
        const { data: commissionRows } = await supabase
          .from("cv_commissions")
          .select("candidate_id")
          .in("candidate_id", rows.map((candidate) => candidate.id));
        setApprovedCandidateIds((commissionRows || []).map((item) => item.candidate_id));
      } else {
        setApprovedCandidateIds([]);
      }

      const photoEntries = await Promise.all(
        rows
          .filter((candidate) => candidate.photo_url)
          .map(async (candidate) => {
            const { data: signedData } = await supabase.storage
              .from("candidate-cvs")
              .createSignedUrl(candidate.photo_url as string, 60 * 60);
            return signedData?.signedUrl
              ? ([candidate.id, signedData.signedUrl] as const)
              : null;
          })
      );

      setPhotoUrls(
        Object.fromEntries(
          photoEntries.filter(
            (entry): entry is readonly [string, string] => entry !== null
          )
        )
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCurrentUser();
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provinceOptions = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.province).filter(Boolean))) as string[],
    [candidates]
  );
  const educationOptions = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.education).filter(Boolean))) as string[],
    [candidates]
  );
  const languageOptions = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.languages).filter(Boolean))) as string[],
    [candidates]
  );

  const tabCandidates = candidates.filter((candidate) =>
    activeTab === "valid"
      ? (candidate.status || "valid") !== "invalid"
      : candidate.status === "invalid"
  );

  const filteredCandidates = tabCandidates.filter((candidate) => {
    const searchText = [
      candidate.full_name,
      candidate.phone,
      candidate.email,
      candidate.latest_position,
      candidate.latest_company,
      candidate.province,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi-VN");

    return (
      searchText.includes(keyword.trim().toLocaleLowerCase("vi-VN")) &&
      (!provinceFilter || candidate.province === provinceFilter) &&
      (!educationFilter || candidate.education === educationFilter) &&
      (!languageFilter || candidate.languages === languageFilter)
    );
  });

  function updateForm<K extends keyof CandidateJson>(key: K, value: CandidateJson[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleJsonChange(value: string) {
    setJsonText(value);
    setJsonError("");
    if (!value.trim()) return;

    try {
      const cleanedValue = value
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanedValue) as CandidateJson;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("JSON phải là một đối tượng thông tin ứng viên.");
      }

      setForm({
        full_name: parsed.full_name || parsed.name || "",
        birth_year: parsed.birth_year ?? "",
        phone: parsed.phone || "",
        email: parsed.email || "",
        address: parsed.address || "",
        province: parsed.province || "",
        education: parsed.education || "",
        languages: toText(parsed.languages),
        skills: toText(parsed.skills),
        experience: parsed.experience || "",
        latest_position: parsed.latest_position || parsed.position || "",
        latest_company: parsed.latest_company || parsed.company || "",
      });
    } catch (error) {
      setJsonError(
        error instanceof Error
          ? "JSON chưa hợp lệ: " + error.message
          : "Không đọc được JSON."
      );
    }
  }

  async function handleReadCvWithAI() {
    if (!cvFile) {
      setAiReadError("Vui lòng chọn file CV PDF trước.");
      return;
    }

    setReadingCv(true);
    setAiReadError("");

    try {
      const body = new FormData();
      body.append("file", cvFile);

      const response = await fetch("/api/ai/read-cv", {
        method: "POST",
        body,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.candidate) {
        throw new Error(result.error || "AI chưa đọc được CV. Vui lòng thử lại.");
      }

      const parsed = result.candidate as CandidateJson;

      setForm({
        full_name: parsed.full_name || parsed.name || "",
        birth_year: parsed.birth_year ?? "",
        phone: parsed.phone || "",
        email: parsed.email || "",
        address: parsed.address || "",
        province: parsed.province || "",
        education: parsed.education || "",
        languages: toText(parsed.languages),
        skills: toText(parsed.skills),
        experience: parsed.experience || "",
        latest_position: parsed.latest_position || parsed.position || "",
        latest_company: parsed.latest_company || parsed.company || "",
      });
      setJsonText("");
      setJsonError("");
    } catch (error) {
      setAiReadError(
        error instanceof Error ? error.message : "Có lỗi khi AI đọc CV."
      );
    } finally {
      setReadingCv(false);
    }
  }

  function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setAiReadError("");
    if (file && file.type !== "application/pdf") {
      alert("Vui lòng chọn file CV định dạng PDF.");
      event.target.value = "";
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      alert("File PDF không được vượt quá 10 MB.");
      event.target.value = "";
      return;
    }
    setCvFile(file);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("Ảnh đại diện phải là PNG, JPG hoặc WebP.");
      event.target.value = "";
      return;
    }
    if (file && file.size > 3 * 1024 * 1024) {
      alert("Ảnh đại diện không được vượt quá 3 MB.");
      event.target.value = "";
      return;
    }
    setPhotoFile(file);
  }

  function resetAddForm() {
    setJsonText("");
    setJsonError("");
    setAiReadError("");
    setForm({});
    setCvFile(null);
    setPhotoFile(null);
    setShowAddModal(false);
  }

  async function uploadFile(file: File, folder: string): Promise<string> {
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = `${folder}/${currentUserId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("candidate-cvs")
      .upload(safeName, file, {
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;
    return safeName;
  }

  async function addCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = toText(form.full_name || form.name).trim();
    if (!name) {
      alert("Vui lòng dán JSON hoặc nhập họ và tên ứng viên.");
      return;
    }

    if (jsonText.trim() && jsonError) {
      alert("Hãy sửa lỗi JSON trước khi lưu.");
      return;
    }

    setSaving(true);

    try {
      let cvPath: string | null = null;
      let photoPath: string | null = null;

      if (cvFile) cvPath = await uploadFile(cvFile, "cv");
      if (photoFile) photoPath = await uploadFile(photoFile, "photos");

      const birthYearValue = Number(form.birth_year);
      const birthYear =
        form.birth_year !== undefined &&
        form.birth_year !== null &&
        String(form.birth_year).trim() !== "" &&
        Number.isFinite(birthYearValue)
          ? birthYearValue
          : null;

      const payload = {
        full_name: name,
        phone: toText(form.phone).trim() || null,
        email: toText(form.email).trim() || null,
        address: toText(form.address).trim() || null,
        province: toText(form.province).trim() || null,
        birth_year: birthYear,
        education: toText(form.education).trim() || null,
        languages: toText(form.languages).trim() || null,
        skills: toText(form.skills).trim() || null,
        experience: toText(form.experience).trim() || null,
        latest_position: toText(form.latest_position || form.position).trim() || null,
        latest_company: toText(form.latest_company || form.company).trim() || null,
        cv_url: cvPath,
        photo_url: photoPath,
        source: "CV upload",
        status: activeTab === "invalid" ? "invalid" : "valid",
        uploaded_by: currentUserId || null,
      };

      const { error } = await supabase.from("candidates").insert(payload);
      if (error) throw error;

      alert("Đã lưu hồ sơ ứng viên thành công.");
      resetAddForm();
      await loadCandidates();
    } catch (error) {
      alert(
        "Không lưu được ứng viên: " +
          (error instanceof Error ? error.message : "Lỗi không xác định")
      );
    } finally {
      setSaving(false);
    }
  }

  async function approveCandidate(candidate: Candidate) {
    if (!isAdmin) {
      alert("Chỉ Admin mới có quyền duyệt CV.");
      return;
    }

    if (candidate.status === "invalid") {
      alert("CV không hợp lệ không thể được duyệt thưởng.");
      return;
    }

    if (!candidate.uploaded_by) {
      alert("CV này chưa có thông tin nhân viên upload nên chưa thể cộng thưởng.");
      return;
    }

    const alreadyApproved = approvedCandidateIds.includes(candidate.id);
    if (alreadyApproved) {
      alert("CV này đã được duyệt thưởng trước đó. Hệ thống không cộng trùng.");
      return;
    }

    if (!window.confirm(`Duyệt CV của ${candidate.full_name} và cộng 30.000 VNĐ cho nhân viên upload?`)) {
      return;
    }

    setApprovingCandidateId(candidate.id);
    try {
      const { data: existing, error: checkError } = await supabase
        .from("cv_commissions")
        .select("id")
        .eq("candidate_id", candidate.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        setApprovedCandidateIds((current) => [...current, candidate.id]);
        alert("CV này đã được duyệt thưởng trước đó. Không cộng thêm lần nữa.");
        return;
      }

      const { error } = await supabase.rpc("approve_candidate_cv", {
        p_candidate_id: candidate.id,
      });

      if (error) throw error;

      setApprovedCandidateIds((current) => [...current, candidate.id]);
      alert("Đã duyệt CV và ghi nhận 30.000 VNĐ tiền thưởng chờ thanh toán cho nhân viên.");
    } catch (error) {
      alert("Không duyệt được CV: " + (error instanceof Error ? error.message : "Lỗi không xác định"));
    } finally {
      setApprovingCandidateId(null);
    }
  }

  async function rejectCandidate(candidate: Candidate) {
    if (!isAdmin) {
      alert("Chỉ Admin mới có quyền chuyển CV sang không hợp lệ.");
      return;
    }

    if (approvedCandidateIds.includes(candidate.id)) {
      alert("CV này đã được duyệt thưởng nên không thể chuyển sang không hợp lệ.");
      return;
    }

    const confirmed = window.confirm(
      `Chuyển CV của "${candidate.full_name}" sang tab CV không hợp lệ?`
    );
    if (!confirmed) return;

    setDeletingCandidateId(candidate.id);

    const { error } = await supabase
      .from("candidates")
      .update({ status: "invalid" })
      .eq("id", candidate.id);

    setDeletingCandidateId(null);

    if (error) {
      alert("Không thể chuyển CV: " + error.message);
      return;
    }

    setCandidates((current) =>
      current.map((item) =>
        item.id === candidate.id ? { ...item, status: "invalid" } : item
      )
    );
    setActiveTab("invalid");
    alert("Đã chuyển CV sang tab CV không hợp lệ. Hồ sơ vẫn được lưu để giữ lịch sử ứng tuyển.");
  }

  async function openCv(candidate: Candidate, download = false) {
    if (!candidate.cv_url) {
      alert("Ứng viên này chưa đính kèm CV PDF.");
      return;
    }

    setOpeningCv(candidate.id);
    const { data, error } = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(candidate.cv_url, 60 * 10, { download });
    setOpeningCv(null);

    if (error || !data?.signedUrl) {
      alert("Không mở được CV: " + (error?.message || "Lỗi không xác định"));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!isAdmin) {
      alert("Chỉ Admin mới có quyền xóa ứng viên.");
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa hồ sơ ứng viên "${candidate.full_name}"? Thao tác này không thể hoàn tác.`
      )
    ) {
      return;
    }

    setDeletingCandidateId(candidate.id);
    const { error } = await supabase.from("candidates").delete().eq("id", candidate.id);
    setDeletingCandidateId(null);

    if (error) {
      alert("Không thể xóa ứng viên: " + error.message);
      return;
    }

    setCandidates((current) => current.filter((item) => item.id !== candidate.id));
    alert("Đã xóa hồ sơ ứng viên.");
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Đăng xuất thất bại: " + error.message);
      return;
    }
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-800">
      {/* Sidebar desktop: cố định độc lập với vùng nội dung */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 md:flex">
        <a href="/" className="mb-10 flex flex-col items-start gap-2" aria-label="CVISION - Trang chủ">
          <SiteLogo size="large" />
          <p className="pl-1 text-[9px] font-bold tracking-[0.2em] text-sky-500">
            ADMIN WORKSPACE
          </p>
        </a>

        <p className="mb-4 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-400">
          Workspace
        </p>

        <nav className="space-y-2">
          {menu.map((item, index) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                item.href === "/admin/candidates"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${
                  item.href === "/admin/candidates"
                    ? "bg-white text-sky-600"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                {item.icon}
              </span>
              {item.name}
            </a>
          ))}

          {isAdmin && (
            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-lg text-slate-500">♙</span>
              Quản lý nhân viên
            </a>
          )}

          {isAdmin && (
            <a
              href="/admin/brand-settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-lg text-slate-500">⚙</span>
              Cài đặt thương hiệu
            </a>
          )}
        </nav>

        <div className="mt-auto rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-100 p-4">
          <p className="font-extrabold text-sky-800">CVISION Workspace</p>
          <p className="mt-2 text-xs leading-5 text-sky-700">
            Nền tảng quản lý ứng viên và kết nối doanh nghiệp.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 p-3">
          <p className="truncate text-sm font-bold">{currentName || "Đang tải tài khoản..."}</p>
          <p className="text-xs text-slate-500">{isAdmin ? "admin" : "recruiter"}</p>
          <button onClick={handleLogout} className="mt-3 text-xs font-semibold text-slate-500 hover:text-sky-700">
            ↪ Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center">
              <div>
                <p className="text-xs font-semibold text-slate-400">Workspace / Ứng viên</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800">
                  Quản lý ứng viên
                </h1>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              ＋ Thêm CV
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-7 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("valid")}
              className={`border-b-2 px-1 pb-3 text-sm font-bold ${
                activeTab === "valid"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              CV <span className="ml-1 text-xs text-slate-400">{candidates.filter((c) => (c.status || "valid") !== "invalid").length}</span>
            </button>
            <button
              onClick={() => setActiveTab("invalid")}
              className={`border-b-2 px-1 pb-3 text-sm font-bold ${
                activeTab === "invalid"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              CV không hợp lệ <span className="ml-1 text-xs text-slate-400">{candidates.filter((c) => c.status === "invalid").length}</span>
            </button>
          </div>

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))_auto]">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm tên, vị trí, công ty, số điện thoại..."
                className={inputClass}
              />
              <select value={provinceFilter} onChange={(event) => setProvinceFilter(event.target.value)} className={inputClass}>
                <option value="">Tỉnh/thành</option>
                {provinceOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)} className={inputClass}>
                <option value="">Học vấn</option>
                {educationOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className={inputClass}>
                <option value="">Ngoại ngữ</option>
                {languageOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <button
                onClick={() => {
                  setKeyword("");
                  setProvinceFilter("");
                  setEducationFilter("");
                  setLanguageFilter("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-800">Danh sách ứng viên</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Hiển thị {filteredCandidates.length} / {tabCandidates.length} hồ sơ
                </p>
              </div>
              <button onClick={loadCandidates} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                ↻ Làm mới
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">Đang tải dữ liệu ứng viên...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mb-3 text-4xl">📄</div>
                <p className="font-semibold text-slate-700">Chưa có hồ sơ phù hợp</p>
                <p className="mt-1 text-sm text-slate-400">Bạn có thể thêm CV mới hoặc thay đổi bộ lọc.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Ứng viên</th>
                      <th className="px-4 py-4">Tỉnh/thành</th>
                      <th className="px-4 py-4">Vị trí / Công ty gần nhất</th>
                      <th className="px-4 py-4">Ngoại ngữ</th>
                      <th className="px-4 py-4">Học vấn</th>
                      <th className="px-4 py-4">Người upload</th>
                      <th className="px-4 py-4">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {candidate.photo_url && photoUrls[candidate.id] ? (
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                                <img
                                  src={photoUrls[candidate.id]}
                                  alt={candidate.full_name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                                {candidate.full_name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800">{candidate.full_name}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {candidate.birth_year || "—"} · {candidate.phone || "Chưa có SĐT"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">{candidate.province || candidate.address || "—"}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">{candidate.latest_position || "—"}</p>
                          <p className="mt-1 text-xs text-slate-400">{candidate.latest_company || "Chưa cập nhật công ty"}</p>
                        </td>
                        <td className="px-4 py-4">{candidate.languages || "—"}</td>
                        <td className="px-4 py-4">{candidate.education || "—"}</td>
                        <td className="px-4 py-4">
                          <p>{candidate.uploaded_by === currentUserId ? currentName : "Nhân viên"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString("vi-VN") : "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => openCv(candidate)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100">
                              {openingCv === candidate.id ? "Đang mở..." : "Xem CV"}
                            </button>
                            <button onClick={() => openCv(candidate, true)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                              Tải
                            </button>
                            {isAdmin && (candidate.status || "valid") !== "invalid" && (
                              <button
                                disabled={approvingCandidateId === candidate.id || approvedCandidateIds.includes(candidate.id)}
                                onClick={() => approveCandidate(candidate)}
                                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {approvingCandidateId === candidate.id
                                  ? "Đang duyệt..."
                                  : approvedCandidateIds.includes(candidate.id)
                                    ? "Đã duyệt thưởng"
                                    : "✓ Duyệt CV +30.000đ"}
                              </button>
                            )}
                            {isAdmin && activeTab === "valid" && (
                              <button
                                disabled={
                                  deletingCandidateId === candidate.id ||
                                  approvedCandidateIds.includes(candidate.id)
                                }
                                onClick={() => rejectCandidate(candidate)}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title={
                                  approvedCandidateIds.includes(candidate.id)
                                    ? "CV đã được duyệt thưởng, không thể chuyển trạng thái"
                                    : "Chuyển sang CV không hợp lệ"
                                }
                              >
                                {deletingCandidateId === candidate.id ? "Đang chuyển..." : "Không duyệt"}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                disabled={deletingCandidateId === candidate.id}
                                onClick={() => deleteCandidate(candidate)}
                                className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingCandidateId === candidate.id ? "Đang xử lý..." : "Xóa"}
                              </button>
                            )}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 py-8 sm:p-6">
          <div className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Thêm CV ứng viên</h2>
                <p className="mt-1 text-xs text-slate-500">Tải CV PDF lên để AI tự trích xuất, hoặc vẫn có thể dán JSON thủ công.</p>
              </div>
              <button onClick={resetAddForm} className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100">×</button>
            </div>

            <form onSubmit={addCandidate} className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-bold text-slate-700">
                      Dán JSON thông tin ứng viên
                    </label>
                    <button
                      type="button"
                      onClick={copyJsonPrompt}
                      className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
                    >
                      📋 Copy JSON mẫu
                    </button>
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={(event) => handleJsonChange(event.target.value)}
                    rows={13}
                    placeholder={'{\n  "full_name": "Nguyễn Văn A",\n  "birth_year": 1998,\n  "phone": "09xxxxxxxx",\n  "province": "Bắc Ninh",\n  "education": "Đại học",\n  "languages": ["Tiếng Anh: Cơ bản"],\n  "latest_position": "Quality Engineer",\n  "latest_company": "ABC Company"\n}'}
                    className={`${inputClass} font-mono text-xs`}
                  />
                  {jsonError && <p className="mt-2 text-xs text-red-600">{jsonError}</p>}
                  <p className="mt-2 text-xs text-slate-400">Khi dán JSON hợp lệ, các trường bên phải sẽ tự động được điền.</p>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Họ và tên *</label>
                      <input required value={toText(form.full_name || form.name)} onChange={(e) => updateForm("full_name", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Năm sinh</label>
                      <input type="number" value={toText(form.birth_year)} onChange={(e) => updateForm("birth_year", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Số điện thoại</label>
                      <input value={toText(form.phone)} onChange={(e) => updateForm("phone", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Email</label>
                      <input type="email" value={toText(form.email)} onChange={(e) => updateForm("email", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Tỉnh/thành</label>
                      <input value={toText(form.province)} onChange={(e) => updateForm("province", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Học vấn</label>
                      <input value={toText(form.education)} onChange={(e) => updateForm("education", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Địa chỉ</label>
                    <input value={toText(form.address)} onChange={(e) => updateForm("address", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Ngoại ngữ</label>
                    <input value={toText(form.languages)} onChange={(e) => updateForm("languages", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Vị trí gần nhất</label>
                    <input value={toText(form.latest_position || form.position)} onChange={(e) => updateForm("latest_position", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Công ty gần nhất</label>
                    <input value={toText(form.latest_company || form.company)} onChange={(e) => updateForm("latest_company", e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">File CV PDF (tối đa 10 MB)</label>
                  <input type="file" accept="application/pdf,.pdf" onChange={handleCvChange} className="block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-bold file:text-sky-700" />
                  {cvFile && <p className="mt-1 text-xs text-emerald-700">{cvFile.name}</p>}
                  <button
                    type="button"
                    onClick={handleReadCvWithAI}
                    disabled={!cvFile || readingCv}
                    className="mt-3 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {readingCv ? "AI đang đọc CV..." : "✨ AI đọc CV và điền thông tin"}
                  </button>
                  {aiReadError && <p className="mt-2 text-xs text-red-600">{aiReadError}</p>}
                  <p className="mt-2 text-xs text-slate-400">AI chỉ trích xuất thông tin có trong CV. Hãy kiểm tra lại trước khi lưu ứng viên.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Ảnh đại diện (PNG/JPG/WebP, tối đa 3 MB)</label>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-bold file:text-sky-700" />
                  {photoFile && <p className="mt-1 text-xs text-emerald-700">{photoFile.name}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Kỹ năng</label>
                <textarea rows={2} value={toText(form.skills)} onChange={(e) => updateForm("skills", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Kinh nghiệm</label>
                <textarea rows={3} value={toText(form.experience)} onChange={(e) => updateForm("experience", e.target.value)} className={inputClass} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <p className="text-xs text-slate-400">Hồ sơ sẽ được lưu vào tab: {activeTab === "valid" ? "CV" : "CV không hợp lệ"}.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={resetAddForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Hủy
                  </button>
                  <button type="submit" disabled={saving || Boolean(jsonError)} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Đang lưu..." : "Lưu ứng viên"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
