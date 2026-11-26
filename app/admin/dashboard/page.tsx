
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type ManagedCV = {
  id: string;
  candidate_name: string;
  uploaded_by: string;
  status: string;
  created_at: string;
};

type CVRequest = {
  id: string;
  full_name: string;
  service_type: string | null;
  status: string;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  created_at?: string;
};

const menu = [
  { icon: "▦", name: "Dashboard", href: "/admin/dashboard" },
  { icon: "♟", name: "Ứng viên", href: "/admin/candidates" },
  { icon: "▤", name: "Quản lý công việc", href: "/admin/jobs" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
  { icon: "▧", name: "Báo cáo", href: "/admin/reports" },
  { icon: "◇", name: "Quản lý tài chính", href: "/admin/finance" },
  { icon: "♙", name: "Quản lý nhân viên", href: "/admin/users" },
  { icon: "⚙", name: "Cài đặt thương hiệu", href: "/admin/brand-settings" },
];

const orderStatuses = [
  "Mới tiếp nhận",
  "Đang liên hệ",
  "Đang xử lý",
  "Hoàn thành",
  "Đã hủy",
];

const jobStatuses = ["Đang tuyển", "Tạm dừng", "Đã đóng"];

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("vi-VN");
}

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managedCVs, setManagedCVs] = useState<ManagedCV[]>([]);
  const [cvRequests, setCVRequests] = useState<CVRequest[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Kiểm tra đăng nhập
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/admin/login");
        return;
      }

      // 2. Lấy thông tin tài khoản
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        setErrorMessage(
          "Không tìm thấy thông tin tài khoản: " +
            (profileError?.message || "")
        );
        return;
      }

      setProfile(profileData as Profile);

      // 3. Lấy danh sách nhân viên
      const profileResult = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["admin", "recruiter"])
        .order("full_name");

      if (profileResult.error) {
        throw new Error(
          "Không tải được nhân viên: " + profileResult.error.message
        );
      }

      setProfiles((profileResult.data || []) as Profile[]);

      // 4. Lấy dữ liệu CV đã tải lên
      const cvResult = await supabase
        .from("managed_cvs")
        .select("id, candidate_name, uploaded_by, status, created_at")
        .order("created_at", { ascending: false });

      if (cvResult.error) {
        throw new Error(
          "Không tải được dữ liệu CV: " + cvResult.error.message
        );
      }

      setManagedCVs((cvResult.data || []) as ManagedCV[]);

      // 5. Lấy dữ liệu đơn hàng CV
      const requestResult = await supabase
        .from("cv_requests")
        .select("id, full_name, service_type, status, created_at")
        .order("created_at", { ascending: false });

      if (requestResult.error) {
        throw new Error(
          "Không tải được đơn hàng CV: " +
            requestResult.error.message
        );
      }

      setCVRequests((requestResult.data || []) as CVRequest[]);

      // 6. Lấy dữ liệu Job
      const jobResult = await supabase
        .from("jobs")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false });

      if (jobResult.error) {
        throw new Error(
          "Không tải được dữ liệu Job: " + jobResult.error.message
        );
      }

      setJobs((jobResult.data || []) as Job[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tải Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Đăng xuất thất bại: " + error.message);
      return;
    }

    router.replace("/admin/login");
  }

  // Thống kê CV
  const approvedCVs = managedCVs.filter(
    (cv) => cv.status === "Được duyệt"
  );

  const rejectedCVs = managedCVs.filter(
    (cv) => cv.status === "NG"
  );

  const pendingCVs = managedCVs.filter(
    (cv) =>
      cv.status !== "Được duyệt" &&
      cv.status !== "NG"
  );

  // Thống kê đơn hàng CV
  const completedOrders = cvRequests.filter(
    (item) => item.status === "Hoàn thành"
  );

  const processingOrders = cvRequests.filter(
    (item) => item.status === "Đang xử lý"
  );

  const newOrders = cvRequests.filter(
    (item) =>
      item.status === "Mới tiếp nhận" ||
      item.status === "Đang liên hệ"
  );

  const cancelledOrders = cvRequests.filter(
    (item) => item.status === "Đã hủy"
  );

  // Thống kê Job
  const activeJobs = jobs.filter(
    (job) => job.status === "Đang tuyển"
  );

  const pausedJobs = jobs.filter(
    (job) => job.status === "Tạm dừng"
  );

  const closedJobs = jobs.filter(
    (job) => job.status === "Đã đóng"
  );

  // Hiệu suất nhân viên dựa trên người tải CV lên
  const employeeStats = useMemo(() => {
    return profiles
      .filter((employee) => employee.role === "recruiter")
      .map((employee) => {
        const employeeCVs = managedCVs.filter(
          (cv) => cv.uploaded_by === employee.id
        );

        const approved = employeeCVs.filter(
          (cv) => cv.status === "Được duyệt"
        ).length;

        const rejected = employeeCVs.filter(
          (cv) => cv.status === "NG"
        ).length;

        const pending = employeeCVs.length - approved - rejected;

        const approvalRate =
          employeeCVs.length > 0
            ? Math.round((approved / employeeCVs.length) * 100)
            : 0;

        return {
          ...employee,
          total: employeeCVs.length,
          approved,
          rejected,
          pending,
          approvalRate,
        };
      })
      .sort((a, b) => b.approved - a.approved);
  }, [profiles, managedCVs]);

  const visibleEmployeeStats = isAdmin
    ? employeeStats
    : employeeStats.filter(
        (employee) => employee.id === profile?.id
      );

  const visibleCVs = isAdmin
    ? managedCVs
    : managedCVs.filter(
        (cv) => cv.uploaded_by === profile?.id
      );

  const visibleRequests = isAdmin
    ? cvRequests
    : cvRequests;

  const visibleJobs = jobs;

  const stats = [
    {
      title: "Tổng số CV",
      value: visibleCVs.length,
      note: `${visibleCVs.filter((cv) => cv.status === "Được duyệt").length} CV đã được duyệt`,
      icon: "▣",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Đơn hàng CV",
      value: visibleRequests.length,
      note: `${completedOrders.length} đơn đã hoàn thành`,
      icon: "✉",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Tổng số Job",
      value: visibleJobs.length,
      note: `${activeJobs.length} Job đang hoạt động`,
      icon: "▤",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "CV được duyệt",
      value: isAdmin
        ? approvedCVs.length
        : visibleCVs.filter((cv) => cv.status === "Được duyệt").length,
      note: "CV đạt yêu cầu quản lý",
      icon: "✓",
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      {/* MOBILE HEADER */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">
            C
          </span>
          <span className="text-xl font-black text-slate-900">
            CVISION
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl"
        >
          {mobileMenuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 h-full w-full"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute right-0 top-0 flex h-full w-[min(86vw,330px)] flex-col bg-white p-5 text-slate-800 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-slate-900">CVISION</p>
                <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-blue-600">
                  BUSINESS WORKSPACE
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-slate-500"
              >
                ×
              </button>
            </div>

            <nav className="space-y-2">
              {menu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    pathname === item.href
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                    pathname === item.href
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-slate-200 pt-5">
              <p className="mb-3 text-sm font-semibold">
                {profile?.full_name || "Tài khoản"}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r border-slate-200 bg-white px-5 py-7 text-slate-800 lg:flex">
          <Link href="/" className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-black">
              C
            </div>

            <div>
              <p className="text-2xl font-black tracking-tight">
                CVISION
              </p>
              <p className="mt-0.5 text-[9px] font-bold tracking-[0.22em] text-blue-600">
                BUSINESS WORKSPACE
              </p>
            </div>
          </Link>

          <p className="mb-4 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                  pathname === item.href
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${
                  pathname === item.href
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg">
              ✦
            </div>
            <p className="font-bold text-slate-900">CVISION Workspace</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Nền tảng quản lý ứng viên và kết nối doanh nghiệp.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold">
              {(profile?.full_name || "C").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {profile?.full_name || "Tài khoản"}
              </p>
              <p className="text-xs text-slate-500">
                {isAdmin ? "Quản trị viên" : "Nhân viên"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              ↪
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 px-4 pb-8 pt-[88px] sm:px-6 lg:ml-[250px] lg:px-8 lg:pt-8">
          {/* HEADER */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-blue-600">Dashboard</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Tổng quan kinh doanh
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Theo dõi hiệu suất nhân viên, CV, đơn hàng và Job của CVISION.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                ↻ Làm mới
              </button>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                {(profile?.full_name || "C").charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          {/* ERROR */}
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* MAIN STATISTICS */}
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">
                    {item.title}
                  </p>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${item.bg} ${item.color}`}
                  >
                    {item.icon}
                  </div>
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
                  {loading ? "..." : formatNumber(item.value)}
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  {item.note}
                </p>
              </div>
            ))}
          </section>

          {/* EMPLOYEE PERFORMANCE */}
          <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Team Performance
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Hiệu suất nhân viên
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Thống kê số CV mỗi nhân viên đã tải lên và kết quả duyệt.
                </p>
              </div>

              {isAdmin && (
                <Link
                  href="/admin/users"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  Quản lý nhân viên →
                </Link>
              )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600">
                  Tổng CV đã tải lên
                </p>
                <p className="mt-2 text-2xl font-black text-blue-800">
                  {loading ? "..." : formatNumber(visibleCVs.length)}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-600">
                  CV được duyệt
                </p>
                <p className="mt-2 text-2xl font-black text-emerald-700">
                  {loading
                    ? "..."
                    : formatNumber(
                        visibleCVs.filter(
                          (cv) => cv.status === "Được duyệt"
                        ).length
                      )}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-600">
                  CV đang chờ xử lý
                </p>
                <p className="mt-2 text-2xl font-black text-amber-700">
                  {loading
                    ? "..."
                    : formatNumber(
                        visibleCVs.filter(
                          (cv) =>
                            cv.status !== "Được duyệt" &&
                            cv.status !== "NG"
                        ).length
                      )}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4 font-bold">Nhân viên</th>
                    <th className="px-4 py-4 font-bold">Tổng CV</th>
                    <th className="px-4 py-4 font-bold">Được duyệt</th>
                    <th className="px-4 py-4 font-bold">NG</th>
                    <th className="px-4 py-4 font-bold">Chờ xử lý</th>
                    <th className="px-4 py-4 font-bold">Tỷ lệ duyệt</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleEmployeeStats.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">
                            {(employee.full_name || "N")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          {employee.full_name || "Chưa đặt tên"}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-bold">
                        {employee.total}
                      </td>

                      <td className="px-4 py-4 font-bold text-emerald-600">
                        {employee.approved}
                      </td>

                      <td className="px-4 py-4 font-bold text-red-500">
                        {employee.rejected}
                      </td>

                      <td className="px-4 py-4 font-bold text-amber-600">
                        {employee.pending}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${employee.approvalRate}%`,
                              }}
                            />
                          </div>
                          <span className="font-bold text-emerald-700">
                            {employee.approvalRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loading && visibleEmployeeStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        Chưa có dữ liệu nhân viên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* CV STATUS AND ORDER STATUS */}
          <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* CV MANAGEMENT */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    CV Management
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    Tình trạng CV
                  </h2>
                </div>

                <Link
                  href="/admin/cv-management"
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Chi tiết →
                </Link>
              </div>

              <div className="space-y-5">
                {[
                  {
                    label: "Được duyệt",
                    value: isAdmin
                      ? approvedCVs.length
                      : visibleCVs.filter(
                          (cv) => cv.status === "Được duyệt"
                        ).length,
                    color: "bg-emerald-500",
                    text: "text-emerald-700",
                  },
                  {
                    label: "Đang chờ xử lý",
                    value: isAdmin
                      ? pendingCVs.length
                      : visibleCVs.filter(
                          (cv) =>
                            cv.status !== "Được duyệt" &&
                            cv.status !== "NG"
                        ).length,
                    color: "bg-amber-500",
                    text: "text-amber-700",
                  },
                  {
                    label: "NG",
                    value: isAdmin
                      ? rejectedCVs.length
                      : visibleCVs.filter(
                          (cv) => cv.status === "NG"
                        ).length,
                    color: "bg-red-500",
                    text: "text-red-600",
                  },
                ].map((item) => {
                  const total = isAdmin
                    ? managedCVs.length
                    : visibleCVs.length;

                  const width =
                    total > 0 ? (item.value / total) * 100 : 0;

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-600">
                          {item.label}
                        </span>
                        <span className={`font-bold ${item.text}`}>
                          {loading ? "..." : item.value}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CV ORDERS */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                    CV Orders
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    Tình trạng đơn hàng CV
                  </h2>
                </div>

                <Link
                  href="/admin/cv-requests"
                  className="text-xs font-bold text-violet-600 hover:underline"
                >
                  Chi tiết →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Tổng đơn hàng",
                    value: visibleRequests.length,
                    bg: "bg-slate-50",
                    color: "text-slate-800",
                  },
                  {
                    label: "Mới tiếp nhận",
                    value: newOrders.length,
                    bg: "bg-amber-50",
                    color: "text-amber-700",
                  },
                  {
                    label: "Đang xử lý",
                    value: processingOrders.length,
                    bg: "bg-blue-50",
                    color: "text-blue-700",
                  },
                  {
                    label: "Hoàn thành",
                    value: completedOrders.length,
                    bg: "bg-emerald-50",
                    color: "text-emerald-700",
                  },
                  {
                    label: "Đã hủy",
                    value: cancelledOrders.length,
                    bg: "bg-red-50",
                    color: "text-red-600",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl p-4 ${item.bg}`}
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {item.label}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-black ${item.color}`}
                    >
                      {loading ? "..." : formatNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* JOB STATISTICS */}
          <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Job Management
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Thống kê Job
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Theo dõi số lượng Job đang được quản lý trên CVISION.
                </p>
              </div>

              <Link
                href="/admin/jobs"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                Quản lý Job →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Tổng số Job",
                  value: jobs.length,
                  color: "text-slate-900",
                  bg: "bg-slate-50",
                },
                {
                  label: "Đang hoạt động",
                  value: activeJobs.length,
                  color: "text-emerald-700",
                  bg: "bg-emerald-50",
                },
                {
                  label: "Tạm dừng",
                  value: pausedJobs.length,
                  color: "text-amber-700",
                  bg: "bg-amber-50",
                },
                {
                  label: "Đã đóng",
                  value: closedJobs.length,
                  color: "text-slate-600",
                  bg: "bg-slate-100",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl p-5 ${item.bg}`}
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>
                  <p className={`mt-3 text-3xl font-black ${item.color}`}>
                    {loading ? "..." : formatNumber(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* RECENT CV ORDERS */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                  Recent Orders
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Đơn hàng CV gần đây
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Theo dõi những yêu cầu dịch vụ CV mới nhất.
                </p>
              </div>

              <Link
                href="/admin/cv-requests"
                className="text-xs font-bold text-violet-600 hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Đang tải dữ liệu...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-4 font-bold">Khách hàng</th>
                      <th className="px-4 py-4 font-bold">Dịch vụ</th>
                      <th className="px-4 py-4 font-bold">Ngày đặt</th>
                      <th className="px-4 py-4 font-bold">Trạng thái</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cvRequests.slice(0, 8).map((request) => {
                      const statusStyle =
                        request.status === "Hoàn thành"
                          ? "bg-emerald-50 text-emerald-700"
                          : request.status === "Đã hủy"
                            ? "bg-red-50 text-red-600"
                            : request.status === "Đang xử lý"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700";

                      return (
                        <tr
                          key={request.id}
                          className="border-b border-slate-50 transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {request.full_name || "Chưa có tên"}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {request.service_type || "Chưa xác định"}
                          </td>

                          <td className="px-4 py-4 text-slate-500">
                            {formatDate(request.created_at)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle}`}
                            >
                              {request.status || "Chưa cập nhật"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {cvRequests.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-slate-400"
                        >
                          Chưa có đơn hàng CV.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="mt-8 text-center text-xs text-slate-400">
            CVISION Business Management System © 2026
          </footer>
        </main>
      </div>
    </div>
  );
}
