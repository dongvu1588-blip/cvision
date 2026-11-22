"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type ManagedCV = {
  id: string;
  candidate_name: string;
  file_path: string;
  uploaded_by: string;
  status: "Được duyệt" | "NG";
  created_at: string;
};

const menu = [
  { icon: "▦", name: "Dashboard", href: "/admin/dashboard" },
  { icon: "♙", name: "Ứng viên", href: "/admin/candidates" },
  { icon: "▤", name: "Quản lý công việc", href: "/admin/jobs" },
  { icon: "▥", name: "Tiến độ tuyển dụng", href: "/admin/pipeline" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CVManagementPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<ManagedCV[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openingId, setOpeningId] = useState("");

  const isAdmin = profile?.role === "admin";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      router.replace("/admin/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData || !["admin", "recruiter"].includes(profileData.role || "")) {
      setError("Tài khoản không có quyền truy cập khu vực quản lý CV.");
      setLoading(false);
      return;
    }

    setProfile(profileData as Profile);

    const { data: cvData, error: cvError } = await supabase
      .from("managed_cvs")
      .select("id, candidate_name, file_path, uploaded_by, status, created_at")
      .order("created_at", { ascending: false });

    if (cvError) {
      setError(`Không tải được danh sách CV: ${cvError.message}`);
      setRows([]);
    } else {
      setRows((cvData || []) as ManagedCV[]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Chỉ chấp nhận tệp PDF.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Dung lượng CV vượt quá 10 MB.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!candidateName.trim()) {
      setError("Vui lòng nhập tên ứng viên.");
      return;
    }
    if (!selectedFile) {
      setError("Vui lòng chọn file CV PDF.");
      return;
    }

    setUploading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;
      if (authError || !user || !profile) {
        router.replace("/admin/login");
        return;
      }

      const safeFileName = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("managed-cvs")
        .upload(safeFileName, selectedFile, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("managed_cvs").insert({
        candidate_name: candidateName.trim(),
        file_path: safeFileName,
        uploaded_by: user.id,
      });

      if (insertError) {
        // Dọn file vừa tải lên nếu không tạo được bản ghi dữ liệu.
        await supabase.storage.from("managed-cvs").remove([safeFileName]);
        throw insertError;
      }

      setCandidateName("");
      setSelectedFile(null);
      const input = document.getElementById("managed-cv-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setSuccess("Đã tải CV lên thành công.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải CV thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  async function openCV(row: ManagedCV) {
    setError("");
    setOpeningId(row.id);
    try {
      const { data, error: signedError } = await supabase.storage
        .from("managed-cvs")
        .createSignedUrl(row.file_path, 60);
      if (signedError) throw signedError;
      if (!data?.signedUrl) throw new Error("Không tạo được liên kết xem CV.");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở CV.");
    } finally {
      setOpeningId("");
    }
  }

  async function updateStatus(row: ManagedCV, status: "Được duyệt" | "NG") {
    setError("");
    setSuccess("");
    const { error: updateError } = await supabase
      .from("managed_cvs")
      .update({ status })
      .eq("id", row.id);

    if (updateError) {
      setError(`Không cập nhật được trạng thái: ${updateError.message}`);
      return;
    }
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
    setSuccess(`Đã cập nhật trạng thái CV của ${row.candidate_name}.`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesSearch = row.candidate_name.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"));
    const matchesStatus = statusFilter === "Tất cả" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [rows, search, statusFilter]);

  const approvedCount = rows.filter((row) => row.status === "Được duyệt").length;
  const ngCount = rows.filter((row) => row.status === "NG").length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-800">
      <aside className="hidden w-64 shrink-0 border-r border-sky-100 bg-white p-5 shadow-sm md:flex md:flex-col">
        <a href="/" className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-black text-white shadow-lg shadow-sky-200">C</div>
          <div>
            <span className="text-2xl font-black tracking-tight text-sky-700">CVISION</span>
            <p className="text-[9px] font-bold tracking-[0.2em] text-sky-500">ADMIN WORKSPACE</p>
          </div>
        </a>
        <p className="mb-4 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-400">Workspace</p>
        <nav className="space-y-2">
          {menu.map((item) => (
            <a key={item.name} href={item.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${item.href === "/admin/cv-management" ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-100" : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-lg">{item.icon}</span>
              {item.name}
            </a>
          ))}
          {isAdmin && <a href="/admin/users" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-lg text-sky-600">♙</span>Quản lý nhân viên</a>}
        </nav>
        <div className="mt-auto rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-100 p-4">
          <p className="font-extrabold text-sky-800">CVISION Workspace</p>
          <p className="mt-2 text-xs leading-5 text-sky-700">Quản lý hồ sơ CV nội bộ an toàn.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold text-sky-500">Workspace / Quản lý CV</p>
            <h1 className="mt-2 text-2xl font-black text-slate-800 md:text-3xl">Quản lý CV</h1>
            <p className="mt-1 text-sm text-slate-500">Tải lên, xem và kiểm soát trạng thái hồ sơ ứng viên.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{profile?.full_name || "Nhân viên"}</p>
              <p className="text-xs font-medium text-sky-600">{isAdmin ? "Quản trị viên" : "Recruiter"}</p>
            </div>
            <button onClick={handleLogout} className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100">Đăng xuất</button>
          </div>
        </header>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Tổng CV được xem</p><p className="mt-2 text-3xl font-black text-slate-800">{loading ? "..." : rows.length}</p></div>
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Được duyệt</p><p className="mt-2 text-3xl font-black text-emerald-600">{loading ? "..." : approvedCount}</p></div>
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">NG</p><p className="mt-2 text-3xl font-black text-rose-600">{loading ? "..." : ngCount}</p></div>
        </section>

        <section className="mb-8 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-500">Upload CV</span>
            <h2 className="mt-2 text-xl font-black text-slate-800">Tải CV ứng viên lên</h2>
            <p className="mt-1 text-sm text-slate-500">Chỉ nhận PDF, tối đa 10 MB. CV sẽ được lưu trong kho riêng tư.</p>
          </div>
          <form onSubmit={handleUpload} className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1.3fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Tên ứng viên</span>
              <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Nhập họ và tên ứng viên" className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">File CV (PDF)</span>
              <input id="managed-cv-file" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:font-bold file:text-sky-700" />
              {selectedFile && <span className="mt-1 block text-xs text-slate-500">{selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>}
            </label>
            <button type="submit" disabled={uploading} className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-sky-100 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{uploading ? "Đang tải lên..." : "＋ Tải CV lên"}</button>
          </form>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-500">CV Library</span>
              <h2 className="mt-2 text-xl font-black text-slate-800">Danh sách hồ sơ CV</h2>
              <p className="mt-1 text-sm text-slate-500">{isAdmin ? "Bạn đang xem toàn bộ CV trong hệ thống." : "Bạn chỉ xem được CV do chính mình tải lên."}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên ứng viên..." className="rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:bg-white sm:w-64" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400">
                <option>Tất cả</option><option>Được duyệt</option><option>NG</option>
              </select>
            </div>
          </div>

          {loading ? <div className="py-12 text-center text-sm text-slate-400">Đang tải danh sách CV...</div> : (
            <div className="overflow-x-auto rounded-xl border border-sky-100">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead><tr className="border-b border-sky-100 bg-sky-50 text-sky-800"><th className="px-4 py-4 font-bold">Ứng viên</th><th className="px-4 py-4 font-bold">Ngày tải lên</th><th className="px-4 py-4 font-bold">Trạng thái</th><th className="px-4 py-4 font-bold">Thao tác</th></tr></thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-b border-sky-50 hover:bg-sky-50/60">
                      <td className="px-4 py-4 font-semibold text-slate-700">{row.candidate_name}</td>
                      <td className="px-4 py-4 text-slate-500">{new Date(row.created_at).toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-4">
                        {isAdmin ? <select value={row.status} onChange={(e) => updateStatus(row, e.target.value as "Được duyệt" | "NG")} className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-sky-400"><option value="Được duyệt">Được duyệt</option><option value="NG">NG</option></select> : <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${row.status === "Được duyệt" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{row.status}</span>}
                      </td>
                      <td className="px-4 py-4"><button onClick={() => openCV(row)} disabled={openingId === row.id} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-60">{openingId === row.id ? "Đang mở..." : "↗ Xem CV"}</button></td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Chưa có CV phù hợp.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <footer className="mt-8 pb-4 text-center text-xs text-slate-400">CVISION Internal Management System © 2026</footer>
      </main>
    </div>
  );
}
