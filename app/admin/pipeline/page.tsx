
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Candidate = {
  id: string;
  full_name: string;
};

type Job = {
  id: string;
  title: string;
  companies: { name: string } | null;
};

type Staff = {
  id: string;
  full_name: string | null;
  role: string;
};

type Application = {
  id: string;
  candidate_id: string;
  job_id: string;
  assigned_to: string | null;
  stage: string;
  cv_result: string | null;
  interview_result: string | null;
  interview_date: string | null;
  salary_negotiation: string | null;
  offer_date: string | null;
  onboard_date: string | null;
  notes: string | null;
  candidates: {
    full_name: string;
    cv_url: string | null;
  } | null;
  jobs: {
    title: string;
    companies: { name: string } | null;
  } | null;
};

const stages = [
  "Nộp CV",
  "Hẹn phỏng vấn",
  "Phỏng vấn",
  "Đàm phán lương",
  "Nhận Offer",
  "Đi làm",
];

const inputClass =
  "w-full rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export default function PipelinePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruiters, setRecruiters] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("");

  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [search, setSearch] = useState("");
  const [openingCv, setOpeningCv] = useState<string | null>(null);
  const [expandedApplicationIds, setExpandedApplicationIds] = useState<string[]>([]);

  function toggleApplication(id: string) {
    setExpandedApplicationIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  }

  const isAdmin = currentRole === "admin";

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Không xác định được tài khoản đăng nhập.");
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(
          "Không tải được quyền tài khoản: " + profileError.message
        );
      }

      setCurrentRole(profile.role);

      const [
        applicationResult,
        candidateResult,
        jobResult,
        recruiterResult,
      ] = await Promise.all([
        supabase
          .from("applications")
          .select(`
            *,
            candidates(full_name, cv_url),
            jobs(title, companies(name))
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("candidates")
          .select("id, full_name")
          .order("full_name"),

        supabase
          .from("jobs")
          .select("id, title, companies(name)")
          .eq("status", "Đang tuyển")
          .order("title"),

        supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("role", "recruiter")
          .order("full_name"),
      ]);

      if (applicationResult.error) {
        throw new Error("Lỗi tải hồ sơ: " + applicationResult.error.message);
      }

      if (candidateResult.error) {
        throw new Error("Lỗi tải ứng viên: " + candidateResult.error.message);
      }

      if (jobResult.error) {
        throw new Error("Lỗi tải việc làm: " + jobResult.error.message);
      }

      if (recruiterResult.error) {
        throw new Error("Lỗi tải Recruiter: " + recruiterResult.error.message);
      }

      setApplications(
        (applicationResult.data || []) as unknown as Application[]
      );
      setCandidates(candidateResult.data || []);
      setJobs((jobResult.data || []) as unknown as Job[]);
      setRecruiters((recruiterResult.data || []) as Staff[]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  }

  async function addApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!candidateId || !jobId) {
      alert("Vui lòng chọn ứng viên và vị trí tuyển dụng.");
      return;
    }

    const { error } = await supabase.from("applications").insert({
      candidate_id: candidateId,
      job_id: jobId,
      stage: "Nộp CV",
    });

    if (error) {
      alert("Không thể tạo hồ sơ: " + error.message);
      return;
    }

    alert("Đã thêm hồ sơ tuyển dụng!");
    setCandidateId("");
    setJobId("");
    await loadData();
  }

  async function updateApplication(
    id: string,
    field: string,
    value: string
  ) {
    const application = applications.find((item) => item.id === id);

    if (!application) return;

    if (!isAdmin && application.assigned_to !== currentUserId) {
      alert("Bạn chỉ được cập nhật hồ sơ được phân công cho mình.");
      return;
    }

    if (!isAdmin && field === "assigned_to") {
      alert("Chỉ Admin mới được phân công Recruiter.");
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        [field]: value || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Không thể cập nhật: " + error.message);
      return;
    }

    await loadData();
  }

  async function openCv(application: Application, download = false) {
    const cvPath = application.candidates?.cv_url;

    if (!cvPath) {
      alert("Ứng viên này chưa đính kèm CV.");
      return;
    }

    setOpeningCv(application.id);

    const { data, error } = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(cvPath, 60 * 10, { download });

    setOpeningCv(null);

    if (error || !data?.signedUrl) {
      alert("Không mở được CV: " + (error?.message || "Lỗi không xác định"));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = applications.filter((item) => {
    const keyword = search.toLowerCase();

    return (
      (item.candidates?.full_name || "").toLowerCase().includes(keyword) ||
      (item.jobs?.title || "").toLowerCase().includes(keyword) ||
      (item.jobs?.companies?.name || "").toLowerCase().includes(keyword)
    );
  });

  const visibleApplications = filtered.filter(
    (item) => isAdmin || item.assigned_to === currentUserId
  );

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
          ← Quay lại Dashboard
        </a>

        {/* Tiêu đề */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            CVISION RECRUITMENT SYSTEM
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
            Tiến độ tuyển dụng
          </h1>

          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Theo dõi hành trình tuyển dụng của từng ứng viên tại CVISION.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Vai trò: {isAdmin ? "Admin" : currentRole === "recruiter" ? "Recruiter" : "Đang xác minh"}
          </div>
        </div>

        {/* Thống kê các giai đoạn */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Tổng quan quy trình tuyển dụng
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Số lượng hồ sơ theo từng giai đoạn
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {stages.map((stage, index) => {
              const count = applications.filter(
                (item) => item.stage === stage
              ).length;

              return (
                <div
                  key={stage}
                  className="rounded-2xl border border-sky-100 bg-white/90 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sm font-extrabold text-sky-700">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      GIAI ĐOẠN
                    </span>
                  </div>

                  <p className="min-h-10 text-sm font-semibold text-slate-600">
                    {stage}
                  </p>

                  <p className="mt-2 text-3xl font-extrabold text-sky-700">
                    {loading ? "..." : count}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">Hồ sơ</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Thêm hồ sơ */}
        <form
          onSubmit={addApplication}
          className="mb-8 overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm"
        >
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-100/80 to-blue-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ＋
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Thêm hồ sơ tuyển dụng
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Chọn ứng viên và vị trí để bắt đầu quy trình tuyển dụng
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Ứng viên
                </label>
                <select
                  required
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn ứng viên</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">
                  Vị trí tuyển dụng
                </label>
                <select
                  required
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Chọn vị trí tuyển dụng</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.companies?.name || "Chưa có công ty"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              ＋ Thêm vào quy trình
            </button>
          </div>
        </form>

        {/* Danh sách hồ sơ */}
        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-white to-sky-50/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Danh sách hồ sơ tuyển dụng
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isAdmin
                    ? `Hiển thị ${filtered.length} / ${applications.length} hồ sơ`
                    : `Hiển thị ${visibleApplications.length} hồ sơ được phân công cho bạn`}
                </p>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                ↻ Làm mới
              </button>
            </div>
            <div className="relative mt-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500">
                🔎
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm ứng viên, vị trí, công ty..."
                className="w-full rounded-xl border border-sky-100 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-6">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
              </div>
            ) : visibleApplications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 py-12 text-center">
                <div className="mb-3 text-4xl">📂</div>
                <p className="font-semibold text-slate-700">
                  Chưa có hồ sơ tuyển dụng nào.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Hãy thêm hồ sơ mới hoặc kiểm tra lại quyền phân công.
                </p>
              </div>
            ) : (
              visibleApplications.map((item) => {
                const canEdit =
                  isAdmin || item.assigned_to === currentUserId;

                const assignedRecruiter = recruiters.find(
                  (person) => person.id === item.assigned_to
                );

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-sky-100 bg-white transition hover:border-sky-200 hover:shadow-sm"
                  >
                    {/* Thông tin ứng viên */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-50 bg-gradient-to-r from-sky-50/70 to-white p-5">
                      <button
                        type="button"
                        onClick={() => toggleApplication(item.id)}
                        aria-expanded={expandedApplicationIds.includes(item.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:bg-sky-50/80 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-lg font-extrabold text-sky-700">
                          {(item.candidates?.full_name || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-bold text-slate-800">
                            {item.candidates?.full_name || "Chưa có tên"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.jobs?.title || "Chưa có vị trí"} ·{" "}
                            {item.jobs?.companies?.name || "Chưa có công ty"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-sky-600">
                            {expandedApplicationIds.includes(item.id)
                              ? "Nhấn để thu gọn hồ sơ"
                              : "Nhấn để xem chi tiết hồ sơ"}
                          </p>
                        </div>
                        <span className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-sky-700 shadow-sm">
                          {expandedApplicationIds.includes(item.id) ? "−" : "+"}
                        </span>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        {item.candidates?.cv_url ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openCv(item)}
                              disabled={openingCv === item.id}
                              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
                            >
                              {openingCv === item.id ? "Đang mở..." : "Xem CV"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openCv(item, true)}
                              disabled={openingCv === item.id}
                              className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
                            >
                              Tải CV
                            </button>
                          </>
                        ) : (
                          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                            Chưa có CV
                          </span>
                        )}
                      </div>
                    </div>

                    {expandedApplicationIds.includes(item.id) && (
                    <div className="p-5">
                      {/* Phân công */}
                      <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                        <label className="mb-2 block text-sm font-bold text-sky-800">
                          Recruiter phụ trách
                        </label>

                        {isAdmin ? (
                          <select
                            value={item.assigned_to || ""}
                            onChange={(e) =>
                              updateApplication(
                                item.id,
                                "assigned_to",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border border-sky-200 bg-white p-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          >
                            <option value="">Chưa phân công</option>
                            {recruiters.map((recruiter) => (
                              <option key={recruiter.id} value={recruiter.id}>
                                {recruiter.full_name || "Recruiter chưa có tên"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-semibold text-sky-800">
                            {assignedRecruiter?.full_name || "Chưa phân công"}
                          </p>
                        )}

                        {isAdmin && recruiters.length === 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            Chưa có Recruiter. Hãy tạo tài khoản tại Quản lý nhân viên.
                          </p>
                        )}
                      </div>

                      {!canEdit && (
                        <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                          Hồ sơ này được giao cho nhân viên khác. Bạn có thể xem
                          thông tin nhưng không thể chỉnh sửa.
                        </p>
                      )}

                      {/* Các trường tiến độ */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Giai đoạn tuyển dụng
                          </label>
                          <select
                            disabled={!canEdit}
                            value={item.stage}
                            onChange={(e) =>
                              updateApplication(item.id, "stage", e.target.value)
                            }
                            className={inputClass}
                          >
                            {stages.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Kết quả duyệt CV
                          </label>
                          <select
                            disabled={!canEdit}
                            value={item.cv_result || ""}
                            onChange={(e) =>
                              updateApplication(item.id, "cv_result", e.target.value)
                            }
                            className={inputClass}
                          >
                            <option value="">Chưa cập nhật</option>
                            <option value="Đạt">Đạt</option>
                            <option value="Không duyệt CV">Không duyệt CV</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Kết quả phỏng vấn
                          </label>
                          <select
                            disabled={!canEdit}
                            value={item.interview_result || ""}
                            onChange={(e) =>
                              updateApplication(
                                item.id,
                                "interview_result",
                                e.target.value
                              )
                            }
                            className={inputClass}
                          >
                            <option value="">Chưa cập nhật</option>
                            <option value="Thành công">Thành công</option>
                            <option value="NG">NG</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Ngày phỏng vấn
                          </label>
                          <input
                            type="date"
                            disabled={!canEdit}
                            value={item.interview_date?.slice(0, 10) || ""}
                            onChange={(e) =>
                              updateApplication(
                                item.id,
                                "interview_date",
                                e.target.value
                                  ? new Date(
                                      e.target.value + "T12:00:00"
                                    ).toISOString()
                                  : ""
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Đàm phán lương
                          </label>
                          <input
                            disabled={!canEdit}
                            value={item.salary_negotiation || ""}
                            onChange={(e) =>
                              updateApplication(
                                item.id,
                                "salary_negotiation",
                                e.target.value
                              )
                            }
                            onBlur={(e) =>
                              updateApplication(
                                item.id,
                                "salary_negotiation",
                                e.target.value
                              )
                            }
                            placeholder="Ví dụ: 25 triệu/tháng"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Ngày nhận Offer
                          </label>
                          <input
                            type="date"
                            disabled={!canEdit}
                            value={item.offer_date?.slice(0, 10) || ""}
                            onChange={(e) =>
                              updateApplication(
                                item.id,
                                "offer_date",
                                e.target.value
                                  ? new Date(
                                      e.target.value + "T12:00:00"
                                    ).toISOString()
                                  : ""
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Ngày đi làm
                          </label>
                          <input
                            type="date"
                            disabled={!canEdit}
                            value={item.onboard_date?.slice(0, 10) || ""}
                            onChange={(e) =>
                              updateApplication(
                                item.id,
                                "onboard_date",
                                e.target.value
                                  ? new Date(
                                      e.target.value + "T12:00:00"
                                    ).toISOString()
                                  : ""
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-600">
                            Ghi chú
                          </label>
                          <textarea
                            key={`${item.id}-${item.notes || ""}`}
                            defaultValue={item.notes || ""}
                            disabled={!canEdit}
                            onBlur={(e) =>
                              updateApplication(item.id, "notes", e.target.value)
                            }
                            rows={3}
                            placeholder="Nhập ghi chú về ứng viên..."
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                    )}
                  </article>
                );
              })
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
