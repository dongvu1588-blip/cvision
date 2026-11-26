
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type Application = {
  id: string;
  candidate_id: string | null;
  assigned_to: string | null;
  stage: string;
  candidates: { full_name: string } | null;
  jobs: {
    title: string;
    companies: { name: string } | null;
  } | null;
};

const menu = [
  { icon: "▦", name: "Dashboard", href: "/admin/dashboard" },
  { icon: "♙", name: "Ứng viên", href: "/admin/candidates" },
  { icon: "▤", name: "Quản lý công việc", href: "/admin/jobs" },
  { icon: "▥", name: "Tiến độ tuyển dụng", href: "/admin/pipeline" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
  { icon: "◈", name: "Quản lý tài chính", href: "/admin/finance" },
];

const stages = [
  { name: "Nộp CV", color: "bg-sky-500", light: "bg-sky-50", text: "text-sky-700" },
  { name: "Hẹn phỏng vấn", color: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700" },
  { name: "Phỏng vấn", color: "bg-indigo-500", light: "bg-indigo-50", text: "text-indigo-700" },
  { name: "Đàm phán lương", color: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700" },
  { name: "Nhận Offer", color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700" },
  { name: "Đi làm", color: "bg-teal-500", light: "bg-teal-50", text: "text-teal-700" },
];

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function formatDate() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = currentRole === "admin";

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
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
        setErrorMessage("Không tìm thấy thông tin tài khoản trong profiles.");
        setLoading(false);
        return;
      }

      setCurrentRole(profile.role || "recruiter");
      setCurrentName(profile.full_name || user.email || "Nhân viên");

      const { data: profileData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["admin", "recruiter"])
        .order("full_name");

      if (!active) return;

      if (profilesError) {
        setErrorMessage(profilesError.message);
        setLoading(false);
        return;
      }

      setProfiles(profileData || []);

      const { data: applicationData, error: applicationError } =
        await supabase
          .from("applications")
          .select(`
            id,
            candidate_id,
            assigned_to,
            stage,
            candidates(full_name),
            jobs(title, companies(name))
          `)
          .order("created_at", { ascending: false });

      if (!active) return;

      if (applicationError) {
        setErrorMessage(applicationError.message);
      } else {
        setApplications((applicationData || []) as unknown as Application[]);
      }

      setLoading(false);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Đăng xuất thất bại: " + error.message);
      return;
    }

    router.replace("/admin/login");
  }

  const visibleApplications = useMemo(
    () =>
      isAdmin
        ? applications
        : applications.filter(
            (application) => application.assigned_to === currentUserId
          ),
    [applications, currentUserId, isAdmin]
  );

  const filtered = useMemo(() => {
    return visibleApplications.filter((application) => {
      const name = application.candidates?.full_name || "";
      const job = application.jobs?.title || "";
      const company = application.jobs?.companies?.name || "";

      return `${name} ${job} ${company}`
        .toLocaleLowerCase("vi-VN")
        .includes(search.toLocaleLowerCase("vi-VN"));
    });
  }, [visibleApplications, search]);

  const totalCandidates = new Set(
    visibleApplications
      .map((application) => application.candidate_id)
      .filter(Boolean)
  ).size;

  const totalApplications = visibleApplications.length;

  const offerCount = visibleApplications.filter(
    (application) => application.stage === "Nhận Offer"
  ).length;

  const onboardCount = visibleApplications.filter(
    (application) => application.stage === "Đi làm"
  ).length;

  const interviewCount = visibleApplications.filter(
    (application) =>
      application.stage === "Hẹn phỏng vấn" ||
      application.stage === "Phỏng vấn"
  ).length;

  const stats = [
    {
      title: "Ứng viên phụ trách",
      value: totalCandidates,
      note: "Ứng viên có hồ sơ tuyển dụng",
      icon: "♙",
      color: "text-blue-600",
      background: "bg-blue-50",
      trend: "Ứng viên",
    },
    {
      title: "Tổng hồ sơ tuyển dụng",
      value: totalApplications,
      note: "Lượt ứng tuyển được giao",
      icon: "▤",
      color: "text-violet-600",
      background: "bg-violet-50",
      trend: "Hồ sơ",
    },
    {
      title: "Đã nhận Offer",
      value: offerCount,
      note: "Ứng viên nhận Offer",
      icon: "✉",
      color: "text-emerald-600",
      background: "bg-emerald-50",
      trend: "Offer",
    },
    {
      title: "Đã đi làm",
      value: onboardCount,
      note: "Ứng viên đã onboard",
      icon: "✓",
      color: "text-teal-600",
      background: "bg-teal-50",
      trend: "Onboard",
    },
  ];

  const stageCounts = stages.map((stage) => ({
    ...stage,
    count: visibleApplications.filter(
      (application) => application.stage === stage.name
    ).length,
  }));

  const maxStageCount = Math.max(
    1,
    ...stageCounts.map((stage) => stage.count)
  );

  const recruiterStats = profiles
    .filter((profile) => profile.role === "recruiter")
    .map((profile) => {
      const assigned = applications.filter(
        (application) => application.assigned_to === profile.id
      );

      const interview = assigned.filter(
        (application) =>
          application.stage === "Hẹn phỏng vấn" ||
          application.stage === "Phỏng vấn"
      ).length;

      const negotiation = assigned.filter(
        (application) => application.stage === "Đàm phán lương"
      ).length;

      const offer = assigned.filter(
        (application) => application.stage === "Nhận Offer"
      ).length;

      const onboard = assigned.filter(
        (application) => application.stage === "Đi làm"
      ).length;

      return {
        ...profile,
        total: assigned.length,
        interview,
        negotiation,
        offer,
        onboard,
        offerRate: percentage(offer, assigned.length),
        onboardRate: percentage(onboard, assigned.length),
      };
    });

  const conversionRate = percentage(onboardCount, totalApplications);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      {/* MOBILE HEADER */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">
            C
          </span>
          <span className="text-xl font-black tracking-tight text-slate-900">
            CVISION
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl"
          aria-label="Mở menu"
        >
          {mobileMenuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
          <div className="absolute right-0 top-0 flex h-full w-[min(86vw,330px)] flex-col bg-[#111c35] p-5 text-white shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black">CVISION</p>
                <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-blue-300">
                  ADMIN WORKSPACE
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-slate-300"
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
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="w-6 text-center text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  href="/admin/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
                >
                  <span className="w-6 text-center text-lg">♙</span>
                  Quản lý nhân viên
                </Link>
              )}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-5">
              <p className="mb-3 text-sm font-semibold">{currentName}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-[#111c35] px-5 py-7 text-white lg:flex">
          <Link href="/" className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-black shadow-lg shadow-blue-950/30">
              C
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">CVISION</p>
              <p className="mt-0.5 text-[9px] font-bold tracking-[0.22em] text-blue-300">
                ADMIN WORKSPACE
              </p>
            </div>
          </Link>

          <p className="mb-4 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>

          <nav className="space-y-2">
            {menu.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-lg">
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin/users"
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                  pathname === "/admin/users"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-lg">
                  ♙
                </span>
                Quản lý nhân viên
              </Link>
            )}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg">
              ✦
            </div>
            <p className="font-bold">CVISION Workspace</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Nền tảng quản lý hoạt động và kết nối cơ hội nghề nghiệp.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold">
              {currentName.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{currentName || "Tài khoản"}</p>
              <p className="text-xs text-slate-400">
                {isAdmin ? "Quản trị viên" : "Recruiter"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              ↪
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 px-4 pb-8 pt-[88px] sm:px-6 lg:ml-[250px] lg:px-8 lg:pt-8">
          {/* TOP HEADER */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-blue-600">Dashboard</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Tổng quan hoạt động
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Xin chào, {currentName || "bạn"}! Chúc bạn một ngày làm việc hiệu quả.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm sm:block">
                <p className="text-xs font-semibold text-slate-400">Hôm nay</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-700">
                  {formatDate()}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-100">
                {currentName.charAt(0).toUpperCase() || "C"}
              </div>
            </div>
          </header>

          {/* ERROR */}
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Không tải được dữ liệu: {errorMessage}
            </div>
          )}

          {/* KPI CARDS */}
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">
                    {item.title}
                  </p>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${item.background} ${item.color}`}
                  >
                    {item.icon}
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    {loading ? "..." : item.value.toLocaleString("vi-VN")}
                  </h2>
                  <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                    {item.trend}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400">{item.note}</p>
              </div>
            ))}
          </section>

          {/* OVERVIEW GRID */}
          <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* PIPELINE CHART */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Recruitment Analytics
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    Tiến độ tuyển dụng
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Phân bổ hồ sơ theo từng giai đoạn tuyển dụng
                  </p>
                </div>
                <Link
                  href="/admin/pipeline"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                >
                  Xem chi tiết →
                </Link>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {stageCounts.map((stage) => (
                  <div
                    key={stage.name}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                  >
                    <div className={`mb-3 h-1.5 rounded-full ${stage.color}`} />
                    <p className="text-xs font-semibold text-slate-500">
                      {stage.name}
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {loading ? "..." : stage.count}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="mb-5 text-sm font-bold text-slate-700">
                  Biểu đồ số lượng hồ sơ
                </h3>

                <div className="space-y-5">
                  {stageCounts.map((stage) => (
                    <div
                      key={`bar-${stage.name}`}
                      className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[125px_1fr_35px]"
                    >
                      <span className="text-xs font-semibold text-slate-500">
                        {stage.name}
                      </span>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${stage.color}`}
                          style={{
                            width: `${(stage.count / maxStageCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-right text-sm font-bold tabular-nums text-slate-700">
                        {loading ? "..." : stage.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CONVERSION SUMMARY */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Performance
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                Hiệu quả tuyển dụng
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Kết quả chuyển đổi hồ sơ
              </p>

              <div className="my-8 flex flex-col items-center">
                <div
                  className="relative flex h-44 w-44 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#2563eb ${conversionRate * 3.6}deg, #eaf0f8 0deg)`,
                  }}
                >
                  <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-4xl font-black text-slate-900">
                      {loading ? "..." : `${conversionRate}%`}
                    </span>
                    <span className="mt-1 text-xs font-medium text-slate-400">
                      Tỷ lệ đi làm
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-500">Phỏng vấn</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {loading ? "..." : interviewCount}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-500">Nhận Offer</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {loading ? "..." : offerCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                    <span className="text-sm text-slate-500">Đã đi làm</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {loading ? "..." : onboardCount}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* RECRUITER PERFORMANCE */}
          {isAdmin && (
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
                    Theo dõi kết quả công việc của từng Recruiter
                  </p>
                </div>
                <Link
                  href="/admin/users"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  Quản lý nhân viên →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="rounded-l-lg px-4 py-4 font-bold">Nhân viên</th>
                      <th className="px-4 py-4 font-bold">Hồ sơ được giao</th>
                      <th className="px-4 py-4 font-bold">Phỏng vấn</th>
                      <th className="px-4 py-4 font-bold">Đàm phán</th>
                      <th className="px-4 py-4 font-bold">Offer</th>
                      <th className="px-4 py-4 font-bold">Đi làm</th>
                      <th className="px-4 py-4 font-bold">Tỷ lệ Offer</th>
                      <th className="rounded-r-lg px-4 py-4 font-bold">Tỷ lệ đi làm</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recruiterStats.map((recruiter) => (
                      <tr
                        key={recruiter.id}
                        className="border-b border-slate-50 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">
                              {(recruiter.full_name || "R").charAt(0).toUpperCase()}
                            </div>
                            {recruiter.full_name || "Chưa đặt tên"}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold">{recruiter.total}</td>
                        <td className="px-4 py-4">{recruiter.interview}</td>
                        <td className="px-4 py-4">{recruiter.negotiation}</td>
                        <td className="px-4 py-4 font-semibold text-emerald-600">
                          {recruiter.offer}
                        </td>
                        <td className="px-4 py-4 font-semibold text-teal-600">
                          {recruiter.onboard}
                        </td>
                        <td className="px-4 py-4 font-semibold text-blue-600">
                          {recruiter.offerRate}%
                        </td>
                        <td className="px-4 py-4 font-semibold text-teal-600">
                          {recruiter.onboardRate}%
                        </td>
                      </tr>
                    ))}

                    {recruiterStats.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                          Chưa có tài khoản Recruiter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Tỷ lệ được tính trên tổng số hồ sơ đang được phân công cho từng Recruiter.
              </p>
            </section>
          )}

          {/* RECENT APPLICATIONS */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Recent Applications
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Hồ sơ tuyển dụng gần đây
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isAdmin
                    ? "Danh sách hồ sơ toàn hệ thống."
                    : "Danh sách hồ sơ được phân công cho bạn."}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm ứng viên, vị trí, công ty..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                <p className="mt-3 text-sm text-slate-400">
                  Đang tải dữ liệu...
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="rounded-l-lg px-4 py-4 font-bold">Ứng viên</th>
                      <th className="px-4 py-4 font-bold">Vị trí</th>
                      <th className="px-4 py-4 font-bold">Doanh nghiệp</th>
                      <th className="rounded-r-lg px-4 py-4 font-bold">Giai đoạn</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.slice(0, 10).map((application) => {
                      const stage = stages.find(
                        (item) => item.name === application.stage
                      );

                      return (
                        <tr
                          key={application.id}
                          className="border-b border-slate-50 transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 font-semibold text-slate-800">
                            {application.candidates?.full_name || "Chưa có tên"}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {application.jobs?.title || "Chưa có vị trí"}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {application.jobs?.companies?.name || "Chưa có công ty"}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                                stage
                                  ? `${stage.light} ${stage.text}`
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {application.stage}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                          Không có hồ sơ tuyển dụng phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filtered.length > 10 && (
              <p className="mt-4 text-center text-xs text-slate-400">
                Đang hiển thị 10 trên {filtered.length} hồ sơ phù hợp.
              </p>
            )}
          </section>

          <footer className="mt-8 text-center text-xs text-slate-400">
            CVISION Internal Management System © 2026
          </footer>
        </main>
      </div>
    </div>
  );
}
