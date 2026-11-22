
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
  { icon: "▥", name: "Tiến độ tuyển dụng", href: "/admin/pipeline" },
  { icon: "▦", name: "Lịch phỏng vấn", href: "/admin/interviews" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▧", name: "Báo cáo", href: "/admin/reports" },
];

const stages = [
  { name: "Nộp CV", color: "bg-blue-500" },
  { name: "Hẹn phỏng vấn", color: "bg-amber-500" },
  { name: "Phỏng vấn", color: "bg-violet-500" },
  { name: "Đàm phán lương", color: "bg-orange-500" },
  { name: "Nhận Offer", color: "bg-emerald-500" },
  { name: "Đi làm", color: "bg-green-700" },
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
      accent: "text-blue-600",
    },
    {
      title: "Tổng hồ sơ tuyển dụng",
      value: totalApplications,
      icon: "▤",
      note: "Lượt ứng tuyển được giao",
      accent: "text-violet-600",
    },
    {
      title: "Đã nhận Offer",
      value: offerCount,
      icon: "✉",
      note: "Ứng viên nhận Offer",
      accent: "text-emerald-600",
    },
    {
      title: "Đã đi làm",
      value: onboardCount,
      icon: "✓",
      note: "Ứng viên đã onboard",
      accent: "text-green-700",
    },
    {
      title: "Tỷ lệ nhận Offer",
      value: `${percentage(offerCount, totalApplications)}%`,
      icon: "%",
      note: "Offer / tổng hồ sơ tuyển dụng",
      accent: "text-amber-600",
    },
    {
      title: "Tỷ lệ đi làm",
      value: `${percentage(onboardCount, totalApplications)}%`,
      icon: "↗",
      note: "Onboard / tổng hồ sơ tuyển dụng",
      accent: "text-teal-600",
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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:block">
        <a href="/" className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
            C
          </div>

          <span className="text-2xl font-extrabold text-emerald-700">
            CVISION
          </span>
        </a>

        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        <nav className="space-y-2">
          {menu.map((item, i) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                i === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </a>
          ))}

          {isAdmin && (
            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <span className="text-lg">♙</span>
              Quản lý nhân viên
            </a>
          )}
        </nav>

        <div className="mt-12 rounded-2xl bg-emerald-50 p-4">
          <p className="font-bold text-emerald-800">
            CVISION Workspace
          </p>

          <p className="mt-2 text-xs leading-5 text-emerald-700">
            Nền tảng quản lý ứng viên và kết nối doanh nghiệp.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Workspace / Dashboard
            </p>

            <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">
              Tổng quan tuyển dụng
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi hoạt động giới thiệu ứng viên của CVISION.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              {currentName.charAt(0).toUpperCase() || "C"}
            </div>

            <div>
              <p className="text-sm font-bold">
                {loading ? "Đang tải..." : currentName}
              </p>

              <p className="text-xs text-slate-500">
                {isAdmin ? "Quản trị viên" : "Recruiter"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không tải được dữ liệu: {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {item.title}
                </p>

                <span className={`text-2xl font-bold ${item.accent}`}>
                  {item.icon}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-extrabold">
                {loading ? "..." : item.value}
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                {item.note}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold">
              Tiến độ tuyển dụng
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Số lượng hồ sơ tại từng giai đoạn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {stageCounts.map((stage) => (
              <div
                key={stage.name}
                className="rounded-xl bg-slate-50 p-4"
              >
                <div className={`mb-4 h-1.5 rounded-full ${stage.color}`} />

                <p className="min-h-10 text-sm font-medium text-slate-600">
                  {stage.name}
                </p>

                <p className="mt-2 text-2xl font-extrabold">
                  {loading ? "..." : stage.count}
                </p>

                <p className="text-xs text-slate-400">Hồ sơ</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="mb-4 text-sm font-bold text-slate-700">
              Biểu đồ phân bổ hồ sơ theo giai đoạn
            </h3>

            <div className="space-y-4">
              {stageCounts.map((stage) => (
                <div
                  key={`bar-${stage.name}`}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[150px_1fr_44px]"
                >
                  <span className="text-sm text-slate-600">
                    {stage.name}
                  </span>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${stage.color} transition-all`}
                      style={{
                        width: `${(stage.count / maxStageCount) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="text-sm font-bold tabular-nums sm:text-right">
                    {loading ? "..." : stage.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold">
                Hiệu suất Recruiter
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Thống kê hồ sơ được phân công và tỷ lệ chuyển đổi của từng nhân viên.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="px-3 py-4">Recruiter</th>
                    <th className="px-3 py-4">Hồ sơ được giao</th>
                    <th className="px-3 py-4">Phỏng vấn</th>
                    <th className="px-3 py-4">Đàm phán</th>
                    <th className="px-3 py-4">Offer</th>
                    <th className="px-3 py-4">Đi làm</th>
                    <th className="px-3 py-4">Tỷ lệ Offer</th>
                    <th className="px-3 py-4">Tỷ lệ đi làm</th>
                  </tr>
                </thead>

                <tbody>
                  {recruiterStats.map((recruiter) => (
                    <tr
                      key={recruiter.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {recruiter.full_name || "Chưa đặt tên"}
                      </td>

                      <td className="px-3 py-4">
                        {recruiter.total}
                      </td>

                      <td className="px-3 py-4">
                        {recruiter.interview}
                      </td>

                      <td className="px-3 py-4">
                        {recruiter.negotiation}
                      </td>

                      <td className="px-3 py-4">
                        {recruiter.offer}
                      </td>

                      <td className="px-3 py-4">
                        {recruiter.onboard}
                      </td>

                      <td className="px-3 py-4 font-semibold text-emerald-700">
                        {recruiter.offerRate}%
                      </td>

                      <td className="px-3 py-4 font-semibold text-green-700">
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

            <p className="mt-3 text-xs text-slate-400">
              Tỷ lệ được tính trên tổng số hồ sơ đang được phân công cho từng Recruiter.
            </p>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
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
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500 sm:w-72"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">
              Đang tải dữ liệu...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="px-3 py-4">Ứng viên</th>
                    <th className="px-3 py-4">Vị trí</th>
                    <th className="px-3 py-4">Doanh nghiệp</th>
                    <th className="px-3 py-4">Giai đoạn</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((application) => (
                    <tr
                      key={application.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {application.candidates?.full_name || "Chưa có tên"}
                      </td>

                      <td className="px-3 py-4">
                        {application.jobs?.title || "Chưa có vị trí"}
                      </td>

                      <td className="px-3 py-4">
                        {application.jobs?.companies?.name || "Chưa có công ty"}
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
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

        <footer className="mt-8 text-center text-xs text-slate-400">
          CVISION Internal Management System © 2026
        </footer>
      </main>
    </div>
  );
}
