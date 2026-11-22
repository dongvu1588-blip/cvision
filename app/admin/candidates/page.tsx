
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Candidate = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  skills: string | null;
  experience: string | null;
  cv_url: string | null;
  created_at: string;
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingCv, setOpeningCv] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState("");
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);

  const isAdmin = currentRole === "admin";

  async function loadCandidates() {
    setLoading(true);

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không tải được ứng viên: " + error.message);
    } else {
      setCandidates((data || []) as Candidate[]);
    }

    setLoading(false);
  }

  async function loadCurrentRole() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setCurrentRole("");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Không tải được quyền tài khoản:", error.message);
      setCurrentRole("");
      return;
    }

    setCurrentRole(profile?.role || "");
  }

  async function addCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.from("candidates").insert([
      {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      },
    ]);

    if (error) {
      alert("Không thêm được ứng viên: " + error.message);
      return;
    }

    alert("Đã thêm ứng viên!");
    setFullName("");
    setPhone("");
    setEmail("");
    await loadCandidates();
  }

  async function openCv(candidate: Candidate, download = false) {
    if (!candidate.cv_url) {
      alert("Ứng viên này chưa đính kèm CV.");
      return;
    }

    setOpeningCv(candidate.id);

    const { data, error } = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(candidate.cv_url, 60 * 10, {
        download,
      });

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

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa hồ sơ ứng viên "${candidate.full_name}"?\n\nThao tác này không thể hoàn tác. Nếu ứng viên đã có hồ sơ ứng tuyển liên kết, cơ sở dữ liệu có thể từ chối xóa để bảo toàn dữ liệu.`
    );

    if (!confirmed) return;

    setDeletingCandidateId(candidate.id);

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidate.id);

    setDeletingCandidateId(null);

    if (error) {
      alert(
        "Không thể xóa ứng viên: " +
          error.message +
          "\n\nNếu ứng viên đã có hồ sơ ứng tuyển, hãy giữ hồ sơ và không xóa trực tiếp để tránh mất lịch sử tuyển dụng."
      );
      return;
    }

    setCandidates((current) =>
      current.filter((item) => item.id !== candidate.id)
    );

    if (expandedCandidateId === candidate.id) {
      setExpandedCandidateId(null);
    }

    alert("Đã xóa hồ sơ ứng viên.");
  }

  useEffect(() => {
    loadCurrentRole();
    loadCandidates();
  }, []);

  const filteredCandidates = candidates.filter((candidate) => {
    const search = keyword.trim().toLocaleLowerCase("vi-VN");

    return (
      candidate.full_name.toLocaleLowerCase("vi-VN").includes(search) ||
      (candidate.phone || "").toLowerCase().includes(search) ||
      (candidate.email || "").toLowerCase().includes(search)
    );
  });

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
          <span>←</span>
          Quay lại Dashboard
        </a>

        {/* Tiêu đề */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              CVISION RECRUITMENT SYSTEM
            </div>

            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
              Quản lý ứng viên
            </h1>

            <p className="text-sm text-slate-500 md:text-base">
              Quản lý và theo dõi hồ sơ ứng viên trên hệ thống CVISION
            </p>
          </div>

          <span className="rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-bold text-sky-700 shadow-sm">
            Vai trò:{" "}
            {isAdmin
              ? "Admin"
              : currentRole === "recruiter"
                ? "Recruiter"
                : "Đang xác minh"}
          </span>
        </div>

        {/* Thống kê nhanh */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Tổng số ứng viên
                </p>
                <p className="mt-2 text-3xl font-extrabold text-sky-700">
                  {candidates.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
                👥
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Kết quả tìm kiếm
                </p>
                <p className="mt-2 text-3xl font-extrabold text-blue-700">
                  {filteredCandidates.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                🔎
              </div>
            </div>
          </div>
        </div>

        {/* Form thêm ứng viên */}
        <form
          onSubmit={addCandidate}
          className="mb-8 overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm"
        >
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-100/80 to-blue-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ✚
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Thêm ứng viên mới
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Nhập thông tin cơ bản để tạo hồ sơ ứng viên
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Số điện thoại
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className="w-full rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  className="w-full rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-200"
            >
              <span>＋</span>
              Thêm ứng viên
            </button>
          </div>
        </form>

        {/* Danh sách ứng viên */}
        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-white to-sky-50/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Danh sách ứng viên
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hiển thị {filteredCandidates.length} / {candidates.length} hồ sơ
                </p>
              </div>

              <div className="relative w-full md:w-96">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500">
                  🔎
                </span>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo tên, số điện thoại, email..."
                  className="w-full rounded-xl border border-sky-100 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 py-12 text-center">
                <div className="mb-3 text-4xl">👤</div>
                <p className="font-semibold text-slate-700">
                  Chưa tìm thấy ứng viên
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Thử thay đổi từ khóa tìm kiếm hoặc thêm ứng viên mới.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCandidates.map((candidate) => {
                  const expanded = expandedCandidateId === candidate.id;

                  return (
                    <article
                      key={candidate.id}
                      className={`overflow-hidden rounded-2xl border transition ${
                        expanded
                          ? "border-sky-300 bg-sky-50/30 shadow-sm"
                          : "border-slate-100 bg-white hover:border-sky-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCandidateId(
                              expanded ? null : candidate.id
                            )
                          }
                          aria-expanded={expanded}
                          className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-lg font-bold text-sky-700">
                              {candidate.full_name.charAt(0).toUpperCase()}
                            </span>

                            <span className="min-w-0">
                              <span className="block truncate font-bold text-slate-800">
                                {candidate.full_name}
                              </span>
                              <span className="mt-1 block truncate text-xs text-slate-500">
                                {candidate.phone || "Chưa có số điện thoại"} ·{" "}
                                {candidate.email || "Chưa có email"}
                              </span>
                            </span>
                          </span>

                          <span className="shrink-0 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100">
                            {expanded ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                          </span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            disabled={deletingCandidateId === candidate.id}
                            onClick={() => deleteCandidate(candidate)}
                            className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingCandidateId === candidate.id
                              ? "Đang xóa..."
                              : "Xóa ứng viên"}
                          </button>
                        )}
                      </div>

                      {expanded && (
                        <div className="grid gap-5 border-t border-sky-100 bg-white p-5 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Họ và tên
                            </p>
                            <p className="mt-1 font-semibold text-slate-800">
                              {candidate.full_name}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Số điện thoại
                            </p>
                            <p className="mt-1 text-slate-700">
                              {candidate.phone || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Email
                            </p>
                            <p className="mt-1 break-all text-slate-700">
                              {candidate.email || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Địa chỉ
                            </p>
                            <p className="mt-1 text-slate-700">
                              {candidate.address || "—"}
                            </p>
                          </div>

                          <div className="md:col-span-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Kỹ năng
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-700">
                              {candidate.skills || "—"}
                            </p>
                          </div>

                          <div className="md:col-span-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Kinh nghiệm
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-slate-700">
                              {candidate.experience || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              Ngày tạo hồ sơ
                            </p>
                            <p className="mt-1 text-slate-700">
                              {candidate.created_at
                                ? new Date(candidate.created_at).toLocaleString(
                                    "vi-VN"
                                  )
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
                              CV đính kèm
                            </p>

                            {candidate.cv_url ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => openCv(candidate)}
                                  disabled={openingCv === candidate.id}
                                  className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                                >
                                  {openingCv === candidate.id
                                    ? "Đang mở..."
                                    : "Xem CV"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openCv(candidate, true)}
                                  disabled={openingCv === candidate.id}
                                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                                >
                                  Tải CV
                                </button>
                              </div>
                            ) : (
                              <p className="mt-1 text-slate-400">
                                Chưa có CV
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
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
