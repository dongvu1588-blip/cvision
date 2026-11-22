
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  companies: { name: string } | null;
};

const inputClass =
  "w-full rounded-xl border border-sky-100 bg-white p-3.5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          location,
          salary,
          description,
          requirements,
          companies(name)
        `)
        .eq("status", "Đang tuyển")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Lỗi tải việc làm:", error.message);
      } else {
        setJobs((data || []) as unknown as Job[]);
      }

      setLoading(false);
    }

    loadJobs();
  }, []);

  const filteredJobs = jobs.filter((job) =>
    `${job.title} ${job.location || ""} ${job.companies?.name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function handleApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedJob) return;

    // Kiểm tra định dạng và dung lượng CV
    if (cvFile) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      const extension = cvFile.name.split(".").pop()?.toLowerCase();

      if (
        !allowedTypes.includes(cvFile.type) ||
        !["pdf", "doc", "docx"].includes(extension || "")
      ) {
        alert("Vui lòng chọn CV định dạng PDF, DOC hoặc DOCX.");
        return;
      }

      if (cvFile.size > 5 * 1024 * 1024) {
        alert("CV không được vượt quá 5 MB.");
        return;
      }
    }

    setSubmitting(true);

    let cvPath: string | null = null;

    try {
      // Bước 1: Tải CV lên Storage nếu ứng viên có chọn file
      if (cvFile) {
        const safeName = cvFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        cvPath = `${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("candidate-cvs")
          .upload(cvPath, cvFile, {
            upsert: false,
            contentType: cvFile.type,
          });

        if (uploadError) {
          throw new Error("Không tải được CV: " + uploadError.message);
        }
      }

      // Bước 2: Gửi thông tin ứng tuyển và đường dẫn CV
      const { error } = await supabase.rpc("apply_to_job", {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_email: email.trim() || null,
        p_job_id: selectedJob.id,
        p_cv_path: cvPath,
      });

      if (error) {
        throw new Error("Không gửi được hồ sơ: " + error.message);
      }

      setSuccess(true);
      setFullName("");
      setPhone("");
      setEmail("");
      setCvFile(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đã xảy ra lỗi.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setSelectedJob(null);
    setSuccess(false);
    setFullName("");
    setPhone("");
    setEmail("");
    setCvFile(null);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-white to-blue-50 text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-black text-white shadow-lg shadow-sky-200">
              C
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-sky-700">
                CVISION
              </span>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-sky-500">
                CAREER CONNECTION
              </p>
            </div>
          </a>

          <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-6">
            <a href="/" className="text-slate-600 transition hover:text-sky-600">
              Trang chủ
            </a>
            <a
              href="/cv-service"
              className="rounded-full bg-sky-50 px-4 py-2.5 text-sky-700 transition hover:bg-sky-100"
            >
              Dịch vụ CV
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-blue-700 px-5 py-16 text-center text-white md:py-20">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-50 backdrop-blur">
            CVISION Careers
          </span>

          <h1 className="mt-6 text-3xl font-black leading-tight md:text-5xl">
            Khám phá cơ hội nghề nghiệp
            <span className="mt-2 block text-sky-100">
              Tìm công việc phù hợp với bạn
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-50 md:text-base">
            Kết nối với doanh nghiệp, khám phá cơ hội việc làm và phát triển
            con đường sự nghiệp cùng CVISION.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
            <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2">
              ✦ Cơ hội nghề nghiệp
            </span>
            <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2">
              ✦ Kết nối doanh nghiệp
            </span>
            <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2">
              ✦ Ứng tuyển trực tuyến
            </span>
          </div>
        </div>
      </section>

      {/* JOB LIST */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="mb-9 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">
            Career Opportunities
          </span>
          <h2 className="mt-2 text-2xl font-black text-slate-800 md:text-3xl">
            Việc làm đang tuyển
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Tìm kiếm vị trí phù hợp và gửi hồ sơ ứng tuyển ngay hôm nay.
          </p>
        </div>

        {/* SEARCH */}
        <div className="mb-9 rounded-3xl border border-sky-100 bg-white p-4 shadow-lg shadow-sky-100/50 md:p-5">
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Tìm kiếm việc làm
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-sky-500">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm vị trí, công ty hoặc địa điểm..."
              className="w-full rounded-2xl border border-sky-100 bg-sky-50/50 py-4 pl-12 pr-4 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-800">
            Danh sách cơ hội
          </h3>
          <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">
            {filteredJobs.length} vị trí
          </span>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-sky-100 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Đang tải việc làm...
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-3xl border border-sky-100 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-3xl">
              🔎
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-800">
              Chưa có việc làm phù hợp
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Vui lòng thử từ khóa khác hoặc quay lại sau.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="group rounded-3xl border border-sky-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-100/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 text-xl font-black text-sky-600 transition group-hover:from-sky-400 group-hover:to-blue-600 group-hover:text-white">
                    {job.companies?.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                    Đang tuyển
                  </span>
                </div>

                <p className="mt-5 text-sm font-bold text-sky-600">
                  {job.companies?.name || "Doanh nghiệp"}
                </p>

                <h3 className="mt-2 text-xl font-extrabold leading-snug text-slate-800">
                  {job.title}
                </h3>

                <div className="mt-5 space-y-3 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      📍
                    </span>
                    {job.location || "Thỏa thuận"}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      💰
                    </span>
                    {job.salary || "Lương thỏa thuận"}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedJob(job)}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3.5 font-bold text-white shadow-md shadow-sky-100 transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-blue-700 hover:shadow-lg"
                >
                  Xem chi tiết và ứng tuyển →
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* JOB DETAIL AND APPLICATION MODAL */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-sky-100 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-sky-100">
                    {selectedJob.companies?.name || "Doanh nghiệp"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-snug">
                    {selectedJob.title}
                  </h2>
                </div>

                <button
                  onClick={closeModal}
                  aria-label="Đóng cửa sổ"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl text-white transition hover:bg-white/30"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/20 bg-white/15 px-3 py-2">
                  📍 {selectedJob.location || "Thỏa thuận"}
                </span>
                <span className="rounded-full border border-white/20 bg-white/15 px-3 py-2">
                  💰 {selectedJob.salary || "Thỏa thuận"}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="space-y-6">
                <section>
                  <h3 className="flex items-center gap-2 font-extrabold text-sky-700">
                    <span className="h-5 w-1 rounded-full bg-sky-500" />
                    Mô tả công việc
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {selectedJob.description || "Thông tin đang được cập nhật."}
                  </p>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-extrabold text-sky-700">
                    <span className="h-5 w-1 rounded-full bg-sky-500" />
                    Yêu cầu ứng viên
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {selectedJob.requirements || "Thông tin đang được cập nhật."}
                  </p>
                </section>
              </div>

              <div className="my-7 border-t border-sky-100" />

              <div className="mb-5">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">
                  Apply Now
                </span>
                <h3 className="mt-1 text-xl font-black text-slate-800">
                  Ứng tuyển vị trí này
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Điền thông tin liên hệ và đính kèm CV nếu bạn đã chuẩn bị.
                </p>
              </div>

              {success ? (
                <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-2xl text-white">
                    ✓
                  </div>
                  <h4 className="mt-4 text-lg font-extrabold text-sky-800">
                    Gửi hồ sơ thành công!
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-sky-700">
                    CVISION đã tiếp nhận hồ sơ ứng tuyển của bạn. Chúng tôi sẽ
                    liên hệ khi có thông tin phù hợp.
                  </p>
                  <button
                    onClick={closeModal}
                    className="mt-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 font-bold text-white shadow-md shadow-sky-100 transition hover:from-sky-600 hover:to-blue-700"
                  >
                    Hoàn tất
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Họ và tên *
                    </label>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ và tên"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Số điện thoại *
                    </label>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Nhập số điện thoại"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Đính kèm CV (PDF, DOC, DOCX)
                    </label>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) =>
                        setCvFile(e.target.files?.[0] || null)
                      }
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Dung lượng tối đa 5 MB. Bạn có thể bỏ qua nếu chưa có CV.
                    </p>

                    {cvFile && (
                      <p className="mt-2 break-all text-sm font-medium text-sky-700">
                        ✓ Đã chọn: {cvFile.name}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-4 font-extrabold text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Đang gửi hồ sơ..." : "Gửi hồ sơ ứng tuyển →"}
                  </button>

                  <p className="text-xs leading-5 text-slate-400">
                    Khi gửi hồ sơ, bạn đồng ý để CVISION sử dụng thông tin
                    liên hệ và CV nhằm xử lý yêu cầu ứng tuyển này.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-sky-100 bg-white px-5 py-8 text-center">
        <p className="font-extrabold tracking-wide text-sky-700">CVISION</p>
        <p className="mt-2 text-sm text-slate-400">
          © 2026 – Kết nối nhân tài và doanh nghiệp.
        </p>
      </footer>
    </main>
  );
}
