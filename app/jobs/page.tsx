
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
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
              C
            </div>
            <span className="text-2xl font-extrabold text-emerald-700">
              CVISION
            </span>
          </a>

          <nav className="flex items-center gap-5 text-sm font-semibold">
            <a href="/" className="hover:text-emerald-700">Trang chủ</a>
            <a href="/cv-service" className="hover:text-emerald-700">
              Dịch vụ CV
            </a>
          </nav>
        </div>
      </header>

      <section className="bg-emerald-800 px-5 py-16 text-center text-white">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-200">
          CVISION Careers
        </p>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          Khám phá cơ hội nghề nghiệp
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-emerald-100">
          Kết nối với doanh nghiệp và tìm kiếm công việc phù hợp với bạn.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm vị trí, công ty hoặc địa điểm..."
            className="w-full rounded-xl border bg-white p-4 outline-none focus:border-emerald-600"
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">
            Việc làm đang tuyển
          </h2>
          <span className="text-sm text-slate-500">
            {filteredJobs.length} vị trí
          </span>
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-400">
            Đang tải việc làm...
          </p>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border bg-white py-16 text-center">
            <h3 className="text-lg font-bold">
              Chưa có việc làm phù hợp
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Vui lòng quay lại sau.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <p className="text-sm font-semibold text-emerald-700">
                  {job.companies?.name || "Doanh nghiệp"}
                </p>

                <h3 className="mt-2 text-xl font-bold">{job.title}</h3>

                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  <p>📍 {job.location || "Thỏa thuận"}</p>
                  <p>💰 {job.salary || "Lương thỏa thuận"}</p>
                </div>

                <button
                  onClick={() => setSelectedJob(job)}
                  className="mt-6 w-full rounded-lg bg-emerald-700 py-3 font-semibold text-white hover:bg-emerald-800"
                >
                  Xem chi tiết và ứng tuyển
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-emerald-700">
                  {selectedJob.companies?.name || "Doanh nghiệp"}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold">
                  {selectedJob.title}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p>Địa điểm: {selectedJob.location || "Thỏa thuận"}</p>
              <p>Mức lương: {selectedJob.salary || "Thỏa thuận"}</p>
            </div>

            <div className="mt-6">
              <h3 className="font-bold">Mô tả công việc</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {selectedJob.description || "Thông tin đang được cập nhật."}
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-bold">Yêu cầu ứng viên</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {selectedJob.requirements || "Thông tin đang được cập nhật."}
              </p>
            </div>

            <div className="my-7 border-t" />

            <h3 className="mb-4 text-xl font-bold">Ứng tuyển vị trí này</h3>

            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h4 className="font-bold text-emerald-800">
                  Gửi hồ sơ thành công!
                </h4>
                <p className="mt-2 text-sm text-emerald-700">
                  CVISION đã tiếp nhận hồ sơ ứng tuyển của bạn.
                  Chúng tôi sẽ liên hệ khi có thông tin phù hợp.
                </p>
                <button
                  onClick={closeModal}
                  className="mt-4 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white"
                >
                  Hoàn tất
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Họ và tên *"
                  className="w-full rounded-lg border p-3"
                />

                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại *"
                  className="w-full rounded-lg border p-3"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-lg border p-3"
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Đính kèm CV (PDF, DOC, DOCX)
                  </label>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) =>
                      setCvFile(e.target.files?.[0] || null)
                    }
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Dung lượng tối đa 5 MB. Bạn có thể bỏ qua nếu chưa có CV.
                  </p>

                  {cvFile && (
                    <p className="mt-2 break-all text-sm text-emerald-700">
                      Đã chọn: {cvFile.name}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? "Đang gửi hồ sơ..." : "Gửi hồ sơ ứng tuyển"}
                </button>

                <p className="text-xs leading-5 text-slate-400">
                  Khi gửi hồ sơ, bạn đồng ý để CVISION sử dụng thông tin
                  liên hệ và CV nhằm xử lý yêu cầu ứng tuyển này.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="border-t bg-white px-5 py-7 text-center text-sm text-slate-400">
        CVISION © 2026 – Kết nối nhân tài và doanh nghiệp.
      </footer>
    </main>
  );
}
