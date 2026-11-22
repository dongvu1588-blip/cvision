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
    <main className="min-h-screen bg-gray-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <a
          href="/admin/dashboard"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
        >
          ← Quay lại Dashboard
        </a>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Quản lý ứng viên
            </h1>
            <p className="text-gray-500">
              Quản lý hồ sơ ứng viên trên hệ thống CVISION
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            Vai trò: {isAdmin ? "Admin" : currentRole === "recruiter" ? "Recruiter" : "Đang xác minh"}
          </span>
        </div>

        <form
          onSubmit={addCandidate}
          className="mb-8 rounded-xl border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold">Thêm ứng viên mới</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Họ và tên *"
              className="rounded-lg border p-3"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="rounded-lg border p-3"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-lg border p-3"
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-lg bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
          >
            + Thêm ứng viên
          </button>
        </form>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                Danh sách ứng viên ({filteredCandidates.length})
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Chọn một ứng viên để mở rộng hoặc thu gọn thông tin.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, số điện thoại, email..."
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-6 text-gray-500">Đang tải dữ liệu...</p>
          ) : filteredCandidates.length === 0 ? (
            <p className="py-6 text-gray-500">Chưa có ứng viên nào.</p>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((candidate) => {
                const expanded = expandedCandidateId === candidate.id;

                return (
                  <article
                    key={candidate.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCandidateId(expanded ? null : candidate.id)
                        }
                        aria-expanded={expanded}
                        className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900">
                            {candidate.full_name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {candidate.phone || "Chưa có số điện thoại"} ·{" "}
                            {candidate.email || "Chưa có email"}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                          {expanded ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                        </span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          disabled={deletingCandidateId === candidate.id}
                          onClick={() => deleteCandidate(candidate)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingCandidateId === candidate.id ? "Đang xóa..." : "Xóa ứng viên"}
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="grid gap-4 border-t bg-slate-50 p-4 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Họ và tên
                          </p>
                          <p className="mt-1 font-medium">{candidate.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Số điện thoại
                          </p>
                          <p className="mt-1">{candidate.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Email
                          </p>
                          <p className="mt-1 break-all">{candidate.email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Địa chỉ
                          </p>
                          <p className="mt-1">{candidate.address || "—"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Kỹ năng
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{candidate.skills || "—"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Kinh nghiệm
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">{candidate.experience || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Ngày tạo hồ sơ
                          </p>
                          <p className="mt-1">
                            {candidate.created_at
                              ? new Date(candidate.created_at).toLocaleString("vi-VN")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            CV đính kèm
                          </p>
                          {candidate.cv_url ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openCv(candidate)}
                                disabled={openingCv === candidate.id}
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                              >
                                {openingCv === candidate.id ? "Đang mở..." : "Xem CV"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openCv(candidate, true)}
                                disabled={openingCv === candidate.id}
                                className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Tải CV
                              </button>
                            </div>
                          ) : (
                            <p className="mt-1 text-slate-400">Chưa có CV</p>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
