
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  { icon: "▦", name: "Lịch phỏng vấn", href: "/admin/interviews" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
  { icon: "▧", name: "Báo cáo", href: "/admin/reports" },
];

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function Dashboard() {
  const router = useRouter();

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

  const visibleApplications = isAdmin
    ? applications
    : applications.filter(
        (application) => application.assigned_to === currentUserId
      );

  const filtered = visibleApplications.filter((application) => {
    const name = application.candidates?.full_name || "";
    const job = application.jobs?.title || "";
    const company = application.jobs?.companies?.name || "";

    return `${name} ${job} ${company}`
      .toLocaleLowerCase("vi-VN")
      .includes(search.toLocaleLowerCase("vi-VN"));
  });

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
      icon: "♙",
      note: "Ứng viên có hồ sơ tuyển dụng",
      accent: "text-sky-600",
      iconBg: "bg-sky-50",
    },
    {
      title: "Tổng hồ sơ tuyển dụng",
      value: totalApplications,
      icon: "▤",
      note: "Lượt ứng tuyển được giao",
      accent: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "Đã nhận Offer",
      value: offerCount,
      icon: "✉",
      note: "Ứng viên nhận Offer",
      accent: "text-indigo-600",
      iconBg: "bg-indigo-50",
    },
    {
      title: "Đã đi làm",
      value: onboardCount,
      icon: "✓",
      note: "Ứng viên đã onboard",
      accent: "text-cyan-700",
      iconBg: "bg-cyan-50",
    },
    {
      title: "Tỷ lệ nhận Offer",
      value: `${percentage(offerCount, totalApplications)}%`,
      icon: "%",
      note: "Offer / tổng hồ sơ tuyển dụng",
      accent: "text-blue-700",
      iconBg: "bg-blue-50",
    },
    {
      title: "Tỷ lệ đi làm",
      value: `${percentage(onboardCount, totalApplications)}%`,
      icon: "↗",
      note: "Onboard / tổng hồ sơ tuyển dụng",
      accent: "text-sky-700",
      iconBg: "bg-sky-50",
    },
  ];

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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-800">
      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 border-r border-sky-100 bg-white p-5 shadow-sm md:flex md:flex-col">
        <a href="/" className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-black text-white shadow-lg shadow-sky-200">
            C
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-sky-700">
              CVISION
            </span>
            <p className="text-[9px] font-bold tracking-[0.2em] text-sky-500">
              ADMIN WORKSPACE
            </p>
          </div>
        </a>

        <p className="mb-4 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-400">
          Workspace
        </p>

        <nav className="space-y-2">
          {menu.map((item, i) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                i === 0
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-100"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-lg">
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
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-lg text-sky-600">
                ♙
              </span>
              Quản lý nhân viên
            </a>
          )}
        </nav>

        <div className="mt-auto rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-100 p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg text-sky-600 shadow-sm">
            ✦
          </div>
          <p className="font-extrabold text-sky-800">CVISION Workspace</p>
          <p className="mt-2 text-xs leading-5 text-sky-700">
            Nền tảng quản lý ứng viên và kết nối doanh nghiệp.
          </p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">
        {/* HEADER */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs font-semibold text-sky-500">
              Workspace / Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-800 md:text-3xl">
              Tổng quan tuyển dụng
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi hoạt động giới thiệu ứng viên của CVISION.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 font-black text-white shadow-md shadow-sky-100">
              {currentName.charAt(0).toUpperCase() || "C"}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                {loading ? "Đang tải..." : currentName}
              </p>
              <p className="text-xs font-medium text-sky-600">
                {isAdmin ? "Quản trị viên" : "Recruiter"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* ERROR */}
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không tải được dữ liệu: {errorMessage}
          </div>
        )}

        {/* STATISTICS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/70"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  {item.title}
                </p>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ${item.accent} ${item.iconBg}`}
                >
                  {item.icon}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-800">
                {loading ? "..." : item.value}
              </h2>

              <p className="mt-2 text-xs text-slate-400">{item.note}</p>
            </div>
          ))}
        </section>

        {/* RECRUITER PERFORMANCE */}
        {isAdmin && (
          <section className="mt-8 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-500">
                Team Performance
              </span>
              <h2 className="mt-2 text-xl font-black text-slate-800">
                Hiệu suất Recruiter
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Thống kê hồ sơ được phân công và tỷ lệ chuyển đổi của từng nhân viên.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-sky-100">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b border-sky-100 bg-sky-50 text-sky-800">
                    <th className="px-3 py-4 font-bold">Recruiter</th>
                    <th className="px-3 py-4 font-bold">Hồ sơ được giao</th>
                    <th className="px-3 py-4 font-bold">Phỏng vấn</th>
                    <th className="px-3 py-4 font-bold">Đàm phán</th>
                    <th className="px-3 py-4 font-bold">Offer</th>
                    <th className="px-3 py-4 font-bold">Đi làm</th>
                    <th className="px-3 py-4 font-bold">Tỷ lệ Offer</th>
                    <th className="px-3 py-4 font-bold">Tỷ lệ đi làm</th>
                  </tr>
                </thead>

                <tbody>
                  {recruiterStats.map((recruiter) => (
                    <tr
                      key={recruiter.id}
                      className="border-b border-sky-50 transition hover:bg-sky-50/60"
                    >
                      <td className="px-3 py-4 font-semibold text-slate-700">
                        {recruiter.full_name || "Chưa đặt tên"}
                      </td>
                      <td className="px-3 py-4">{recruiter.total}</td>
                      <td className="px-3 py-4">{recruiter.interview}</td>
                      <td className="px-3 py-4">{recruiter.negotiation}</td>
                      <td className="px-3 py-4">{recruiter.offer}</td>
                      <td className="px-3 py-4">{recruiter.onboard}</td>
                      <td className="px-3 py-4 font-bold text-sky-700">
                        {recruiter.offerRate}%
                      </td>
                      <td className="px-3 py-4 font-bold text-blue-700">
                        {recruiter.onboardRate}%
                      </td>
                    </tr>
                  ))}

                  {recruiterStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Chưa có tài khoản Recruiter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              Tỷ lệ được tính trên tổng số hồ sơ đang được phân công cho từng Recruiter.
            </p>
          </section>
        )}

        {/* RECENT APPLICATIONS */}
        <section className="mt-8 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-500">
                Recent Applications
              </span>
              <h2 className="mt-2 text-xl font-black text-slate-800">
                Hồ sơ tuyển dụng gần đây
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin
                  ? "Danh sách hồ sơ toàn hệ thống."
                  : "Danh sách hồ sơ được phân công cho bạn."}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ứng viên, vị trí, công ty..."
              className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 sm:w-72"
            />
          </div>

          {loading ? (
            <div className="py-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
              <p className="mt-3 text-sm text-slate-400">
                Đang tải dữ liệu...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-sky-100">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-sky-100 bg-sky-50 text-sky-800">
                    <th className="px-3 py-4 font-bold">Ứng viên</th>
                    <th className="px-3 py-4 font-bold">Vị trí</th>
                    <th className="px-3 py-4 font-bold">Doanh nghiệp</th>
                    <th className="px-3 py-4 font-bold">Giai đoạn</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((application) => (
                    <tr
                      key={application.id}
                      className="border-b border-sky-50 transition hover:bg-sky-50/60"
                    >
                      <td className="px-3 py-4 font-semibold text-slate-700">
                        {application.candidates?.full_name || "Chưa có tên"}
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {application.jobs?.title || "Chưa có vị trí"}
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {application.jobs?.companies?.name || "Chưa có công ty"}
                      </td>
                      <td className="px-3 py-4">
                        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                          {application.stage}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Chưa có hồ sơ tuyển dụng phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 pb-4 text-center text-xs text-slate-400">
          CVISION Internal Management System © 2026
        </footer>
      </main>
    </div>
  );
}
