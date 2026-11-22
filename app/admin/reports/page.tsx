"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type Application = {
  id: string;
  assigned_to: string | null;
  stage: string;
  created_at: string;
};

const stages = [
  "Nộp CV",
  "Hẹn phỏng vấn",
  "Phỏng vấn",
  "Đàm phán lương",
  "Nhận Offer",
  "Đi làm",
];

function formatMonth(date: Date) {
  return date.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Tính ngày mặc định sau khi component được mount để tránh lỗi prerender của Next.js.
  useEffect(() => {
    const today = new Date();

    const start = new Date(today);
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);

    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(today));
  }, []);

  const isAdmin = role === "admin";

  useEffect(() => {
    let active = true;

    async function loadReports() {
      setLoading(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (!active) return;
      if (profileError || !profile) {
        setError("Không tìm thấy thông tin tài khoản.");
        setLoading(false);
        return;
      }

      setRole(profile.role || "recruiter");

      const { data: applicationData, error: applicationError } = await supabase
        .from("applications")
        .select("id, assigned_to, stage, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (applicationError) {
        setError(applicationError.message);
        setLoading(false);
        return;
      }
      setApplications(applicationData || []);

      if (profile.role === "admin") {
        const { data: profileData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("role", "recruiter")
          .order("full_name");

        if (!active) return;
        if (profilesError) setError(profilesError.message);
        else setProfiles(profileData || []);
      }

      if (active) setLoading(false);
    }

    loadReports();
    return () => { active = false; };
  }, [router]);

  const visibleApplications = useMemo(() => {
    const assigned = isAdmin
      ? applications
      : applications.filter((item) => item.assigned_to === currentUserId);

    const from = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const to = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return assigned.filter((item) => {
      const created = new Date(item.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [applications, isAdmin, currentUserId, startDate, endDate]);

  const countStage = (stage: string) =>
    visibleApplications.filter((item) => item.stage === stage).length;

  const stats = [
    { title: "Tổng hồ sơ", value: visibleApplications.length },
    { title: "Đang phỏng vấn", value: countStage("Hẹn phỏng vấn") + countStage("Phỏng vấn") },
    { title: "Đã nhận Offer", value: countStage("Nhận Offer") },
    { title: "Đã đi làm", value: countStage("Đi làm") },
  ];

  const monthlyStats = useMemo(() => {
    const result: { key: string; label: string; count: number }[] = [];

    // Chưa có khoảng ngày (lần render đầu) thì chưa tạo thống kê tháng.
    if (!startDate || !endDate) return result;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    let guard = 0;

    while (cursor <= last && guard < 36) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const count = visibleApplications.filter((item) => {
        const date = new Date(item.created_at);
        return date.getFullYear() === year && date.getMonth() === month;
      }).length;
      result.push({ key, label: formatMonth(cursor), count });
      cursor.setMonth(cursor.getMonth() + 1);
      guard += 1;
    }
    return result;
  }, [visibleApplications, startDate, endDate]);

  const maxMonthlyCount = Math.max(1, ...monthlyStats.map((item) => item.count));
  const offerRate = visibleApplications.length
    ? (countStage("Nhận Offer") / visibleApplications.length) * 100
    : 0;
  const onboardRate = visibleApplications.length
    ? (countStage("Đi làm") / visibleApplications.length) * 100
    : 0;

  const recruiterStats = useMemo(() => profiles.map((profile) => {
    const assigned = applications.filter((item) => {
      if (item.assigned_to !== profile.id) return false;
      const created = new Date(item.created_at);
      const from = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const to = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
      return (!from || created >= from) && (!to || created <= to);
    });
    const offer = assigned.filter((item) => item.stage === "Nhận Offer").length;
    const onboard = assigned.filter((item) => item.stage === "Đi làm").length;
    return {
      id: profile.id,
      name: profile.full_name || "Chưa đặt tên",
      total: assigned.length,
      interview: assigned.filter((item) => item.stage === "Hẹn phỏng vấn" || item.stage === "Phỏng vấn").length,
      offer,
      onboard,
      offerRate: assigned.length ? (offer / assigned.length) * 100 : 0,
      onboardRate: assigned.length ? (onboard / assigned.length) * 100 : 0,
    };
  }), [profiles, applications, startDate, endDate]);

  function resetDates() {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  }

  function exportCSV() {
    const rows: string[][] = [
      ["BÁO CÁO TUYỂN DỤNG CVISION"],
      ["Từ ngày", startDate || "Tất cả", "Đến ngày", endDate || "Tất cả"],
      [],
      ["Chỉ tiêu", "Số lượng"],
      ...stats.map((item) => [item.title, String(item.value)]),
      ["Tỷ lệ Offer", `${offerRate.toFixed(1)}%`],
      ["Tỷ lệ đi làm", `${onboardRate.toFixed(1)}%`],
      [],
      ["Giai đoạn tuyển dụng", "Số lượng"],
      ...stages.map((stage) => [stage, String(countStage(stage))]),
      [],
      ["Tháng", "Số hồ sơ"],
      ...monthlyStats.map((item) => [item.label, String(item.count)]),
    ];

    if (isAdmin) {
      rows.push([], ["Recruiter", "Hồ sơ được giao", "Phỏng vấn", "Offer", "Đi làm", "Tỷ lệ Offer", "Tỷ lệ đi làm"]);
      recruiterStats.forEach((item) => rows.push([
        item.name,
        String(item.total),
        String(item.interview),
        String(item.offer),
        String(item.onboard),
        `${item.offerRate.toFixed(1)}%`,
        `${item.onboardRate.toFixed(1)}%`,
      ]));
    }

    const csv = "\uFEFF" + rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CVISION_Bao_cao_tuyen_dung.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">CVISION / Báo cáo</p>
            <h1 className="mt-2 text-3xl font-extrabold">Báo cáo tuyển dụng</h1>
            <p className="mt-2 text-sm text-slate-500">Tổng hợp kết quả và hiệu suất tuyển dụng theo thời gian.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/admin/dashboard")} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-100">Quay lại</button>
            <button onClick={exportCSV} disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Xuất báo cáo CSV</button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-bold">Bộ lọc thời gian</h2>
            <p className="mt-1 text-sm text-slate-500">Lọc theo ngày tạo hồ sơ ứng tuyển.</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">Từ ngày
              <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">Đến ngày
              <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
            </label>
            <button onClick={resetDates} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">6 tháng gần nhất</button>
          </div>
        </section>

        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">{isAdmin ? "Chế độ Admin: Báo cáo toàn hệ thống" : "Chế độ Recruiter: Báo cáo hồ sơ được phân công cho bạn"}</p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => <div key={item.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{item.title}</p>
            <p className="mt-3 text-3xl font-extrabold text-emerald-700">{loading ? "..." : item.value}</p>
          </div>)}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Tỷ lệ nhận Offer / tổng hồ sơ</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">{loading ? "..." : `${offerRate.toFixed(1)}%`}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Tỷ lệ đi làm / tổng hồ sơ</p>
            <p className="mt-2 text-3xl font-extrabold text-violet-700">{loading ? "..." : `${onboardRate.toFixed(1)}%`}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Số hồ sơ theo tháng</h2>
            <p className="mt-1 text-sm text-slate-500">Số lượng hồ sơ được tạo trong từng tháng thuộc khoảng thời gian đã chọn.</p>
          </div>
          {monthlyStats.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Chọn khoảng thời gian hợp lệ để xem thống kê.</p> :
            <div className="flex min-h-56 items-end gap-3 overflow-x-auto pb-2">
              {monthlyStats.map((item) => <div key={item.key} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-bold text-slate-600">{loading ? "..." : item.count}</span>
                <div className="flex h-40 w-full items-end rounded-t-lg bg-slate-50">
                  <div className="w-full rounded-t-lg bg-emerald-500 transition-all" style={{ height: `${(item.count / maxMonthlyCount) * 100}%`, minHeight: item.count > 0 ? "5px" : "0" }} />
                </div>
                <span className="whitespace-nowrap text-xs text-slate-500">{item.label}</span>
              </div>)}
            </div>
          }
        </section>

        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold">Thống kê theo giai đoạn</h2>
          <div className="space-y-5">
            {stages.map((stage) => {
              const count = countStage(stage);
              const percent = visibleApplications.length > 0 ? (count / visibleApplications.length) * 100 : 0;
              return <div key={stage}>
                <div className="mb-2 flex justify-between text-sm"><span className="font-medium">{stage}</span><span className="font-bold">{loading ? "..." : count} ({percent.toFixed(1)}%)</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
              </div>;
            })}
          </div>
        </section>

        {isAdmin && <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">Hiệu suất theo Recruiter</h2>
          <p className="mb-6 text-sm text-slate-500">Chỉ tính hồ sơ được giao trong khoảng thời gian đã chọn.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-slate-500">
                <th className="px-3 py-4">Nhân viên</th><th className="px-3 py-4">Hồ sơ được giao</th><th className="px-3 py-4">Phỏng vấn</th><th className="px-3 py-4">Offer</th><th className="px-3 py-4">Đi làm</th><th className="px-3 py-4">Tỷ lệ Offer</th><th className="px-3 py-4">Tỷ lệ đi làm</th>
              </tr></thead>
              <tbody>
                {recruiterStats.map((item) => <tr key={item.id} className="border-b border-slate-50">
                  <td className="px-3 py-4 font-semibold">{item.name}</td><td className="px-3 py-4">{item.total}</td><td className="px-3 py-4">{item.interview}</td><td className="px-3 py-4">{item.offer}</td><td className="px-3 py-4">{item.onboard}</td><td className="px-3 py-4">{item.offerRate.toFixed(1)}%</td><td className="px-3 py-4">{item.onboardRate.toFixed(1)}%</td>
                </tr>)}
                {recruiterStats.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Chưa có tài khoản Recruiter.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>}

        <p className="mt-8 text-center text-xs text-slate-400">CVISION Recruitment Reports © 2026</p>
      </div>
    </div>
  );
}
