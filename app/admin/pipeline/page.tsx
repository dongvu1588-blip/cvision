
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
        throw new Error("Không tải được quyền tài khoản: " + profileError.message);
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

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <a
          href="/admin/dashboard"
          className="text-sm font-medium text-emerald-700"
        >
          ← Quay lại Dashboard
        </a>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold">
            Tiến độ tuyển dụng
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi hành trình tuyển dụng của từng ứng viên tại CVISION.
          </p>

          <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            Vai trò: {isAdmin ? "Admin" : "Recruiter"}
          </div>
        </div>

        {/* THỐNG KÊ */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage) => (
            <div key={stage} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{stage}</p>
              <p className="mt-3 text-2xl font-extrabold text-emerald-700">
                {applications.filter((item) => item.stage === stage).length}
              </p>
              <p className="text-xs text-slate-400">Hồ sơ</p>
            </div>
          ))}
        </div>

        {/* THÊM HỒ SƠ */}
        <form
          onSubmit={addApplication}
          className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-xl font-bold">
            Thêm hồ sơ tuyển dụng
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <select
              required
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="rounded-lg border p-3"
            >
              <option value="">Chọn ứng viên</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name}
                </option>
              ))}
            </select>

            <select
              required
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="rounded-lg border p-3"
            >
              <option value="">Chọn vị trí tuyển dụng</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.companies?.name || "Chưa có công ty"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            + Thêm vào quy trình
          </button>
        </form>

        {/* DANH SÁCH HỒ SƠ */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              Danh sách hồ sơ ({filtered.length})
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ứng viên, vị trí, công ty..."
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">
              Đang tải dữ liệu...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Chưa có hồ sơ tuyển dụng nào.
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((item) => {
                const canEdit =
                  isAdmin || item.assigned_to === currentUserId;

                const assignedRecruiter = recruiters.find(
                  (person) => person.id === item.assigned_to
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">
                          {item.candidates?.full_name || "Chưa có tên"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.jobs?.title || "Chưa có vị trí"} ·{" "}
                          {item.jobs?.companies?.name || "Chưa có công ty"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.candidates?.cv_url ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openCv(item)}
                              disabled={openingCv === item.id}
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {openingCv === item.id ? "Đang mở..." : "Xem CV"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openCv(item, true)}
                              disabled={openingCv === item.id}
                              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Tải CV
                            </button>
                          </>
                        ) : (
                          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
                            Chưa có CV
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PHÂN CÔNG */}
                    <div className="mb-5 rounded-lg bg-emerald-50 p-4">
                      <label className="mb-2 block text-sm font-semibold text-emerald-900">
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
                          className="w-full rounded-lg border border-emerald-200 bg-white p-3"
                        >
                          <option value="">Chưa phân công</option>
                          {recruiters.map((recruiter) => (
                            <option key={recruiter.id} value={recruiter.id}>
                              {recruiter.full_name || "Recruiter chưa có tên"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-emerald-900">
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
                      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Hồ sơ này được giao cho nhân viên khác. Bạn có thể xem
                        thông tin nhưng không thể chỉnh sửa.
                      </p>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Giai đoạn tuyển dụng
                        </label>
                        <select
                          disabled={!canEdit}
                          value={item.stage}
                          onChange={(e) =>
                            updateApplication(item.id, "stage", e.target.value)
                          }
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {stages.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Kết quả duyệt CV
                        </label>
                        <select
                          disabled={!canEdit}
                          value={item.cv_result || ""}
                          onChange={(e) =>
                            updateApplication(item.id, "cv_result", e.target.value)
                          }
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          <option value="">Chưa cập nhật</option>
                          <option value="Đạt">Đạt</option>
                          <option value="Không duyệt CV">Không duyệt CV</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
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
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          <option value="">Chưa cập nhật</option>
                          <option value="Thành công">Thành công</option>
                          <option value="NG">NG</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
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
                                ? new Date(e.target.value + "T12:00:00").toISOString()
                                : ""
                            )
                          }
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
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
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
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
                                ? new Date(e.target.value + "T12:00:00").toISOString()
                                : ""
                            )
                          }
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
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
                                ? new Date(e.target.value + "T12:00:00").toISOString()
                                : ""
                            )
                          }
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium">
                          Ghi chú
                        </label>
                        <textarea
                          key={`${item.id}-${item.notes || ""}`}
                          defaultValue={item.notes || ""}
                          disabled={!canEdit}
                          onBlur={(e) =>
                            updateApplication(item.id, "notes", e.target.value)
                          }
                          rows={2}
                          placeholder="Nhập ghi chú về ứng viên..."
                          className="w-full rounded-lg border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
