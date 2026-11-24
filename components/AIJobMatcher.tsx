
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Candidate = {
  full_name: string | null;
  birth_year: number | string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  education: string | null;
  languages: string[] | string | null;
  skills: string[] | string | null;
  experience: string | null;
  latest_position: string | null;
  latest_company: string | null;
};

type Job = {
  id: string;
  title: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  companies: { name: string } | null;
};

type Match = {
  job_id: string;
  job_title?: string;
  match_score: number;
  reasons?: string[];
  missing_skills?: string[];
  recommendation?: string;
};

export default function AIJobMatcher() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      setLoadingJobs(true);

      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, title, location, salary, description, requirements, companies(name)"
        )
        .eq("status", "Đang tuyển")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Không tải được việc làm: " + error.message);
      } else {
        setJobs((data || []) as unknown as Job[]);
      }

      setLoadingJobs(false);
    }

    loadJobs();
  }, []);

  function handleFileChange(selectedFile: File | null) {
    setError("");
    setCandidate(null);
    setMatches([]);
    setSummary("");
    setSubmitted(false);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFile(null);
      setError("Chỉ chấp nhận file CV định dạng PDF.");
      return;
    }

    if (selectedFile.size === 0 || selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("File PDF phải lớn hơn 0 và không vượt quá 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function analyzeCV() {
    if (!file) {
      setError("Vui lòng chọn file CV PDF trước.");
      return;
    }

    if (!consent) {
      setError("Vui lòng xác nhận đồng ý gửi CV cho CVISION để được phân tích và tư vấn việc làm.");
      return;
    }

    if (jobs.length === 0) {
      setError("Hiện chưa có tin tuyển dụng đang tuyển để đối chiếu.");
      return;
    }

    setLoading(true);
    setError("");
    setCandidate(null);
    setMatches([]);
    setSummary("");

    try {
      // BƯỚC 1: Gửi PDF cho AI đọc CV
      const formData = new FormData();
      formData.append("file", file);

      const readResponse = await fetch("/api/ai/read-cv", {
        method: "POST",
        body: formData,
      });

      const readResult = await readResponse.json();

      if (!readResponse.ok) {
        throw new Error(
          readResult.error || "AI không thể đọc file CV."
        );
      }

      const extractedCandidate = readResult.candidate as Candidate;

      if (!extractedCandidate) {
        throw new Error("AI chưa trích xuất được thông tin ứng viên.");
      }

      setCandidate(extractedCandidate);

      // BƯỚC 2: Gửi thông tin ứng viên và danh sách việc làm cho AI
      const matchResponse = await fetch("/api/ai/job-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate: extractedCandidate,
          jobs,
        }),
      });

      const matchResult = await matchResponse.json();

      if (!matchResponse.ok) {
        throw new Error(
          matchResult.error || "AI chưa thể đề xuất việc làm."
        );
      }

      // API job-match trả về result.recommendations
      const aiResult = matchResult.result;

      if (!aiResult) {
        throw new Error("AI không trả về kết quả phân tích.");
      }

      setSummary(aiResult.summary || "");

      const recommendations = Array.isArray(aiResult.recommendations)
        ? aiResult.recommendations
        : [];

      setMatches(recommendations);

      // BƯỚC 3: Gửi CV và thông tin ứng viên về hệ thống quản trị CVISION.
      setSubmitting(true);
      const submitForm = new FormData();
      submitForm.append("file", file);
      submitForm.append("candidate", JSON.stringify(extractedCandidate));

      const submitResponse = await fetch("/api/public/submit-cv", {
        method: "POST",
        body: submitForm,
      });

      const submitResult = await submitResponse.json();

      if (!submitResponse.ok || !submitResult.success) {
        throw new Error(
          submitResult.error || "AI đã phân tích nhưng chưa gửi được CV về CVISION."
        );
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi khi phân tích CV. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  }

  function formatList(value: string[] | string | null | undefined) {
    if (!value) return "Chưa cập nhật";

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "Chưa cập nhật";
    }

    return value.trim() || "Chưa cập nhật";
  }

  return (
    <section className="mb-8 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm md:p-6">
      {/* TIÊU ĐỀ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            CVISION AI
          </span>

          <h2 className="mt-2 text-xl font-extrabold text-slate-800">
            AI phân tích CV và đề xuất việc làm
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tải CV PDF để AI tự động đọc hồ sơ và tìm vị trí phù hợp trong hệ thống.
          </p>
        </div>

        <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
          {loadingJobs ? "Đang tải..." : `${jobs.length} việc làm đang tuyển`}
        </span>
      </div>

      {/* KHU VỰC TẢI CV */}
      <div className="mt-5 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5">
        <div className="text-center">
          <div className="text-4xl">📄</div>

          <h3 className="mt-2 font-bold text-slate-800">
            Tải CV ứng viên lên
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Hỗ trợ PDF, dung lượng tối đa 10 MB
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <label className="cursor-pointer rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
            📁 Chọn file CV PDF

            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={loading}
              onChange={(e) =>
                handleFileChange(e.target.files?.[0] || null)
              }
            />
          </label>

          {file && (
            <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-700">
                  📄 {file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleFileChange(null)}
                className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Xóa file
              </button>
            </div>
          )}
        </div>
      </div>

      {/* XÁC NHẬN GỬI CV */}
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          disabled={loading}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-violet-600"
        />
        <span>
          Tôi đồng ý để CVISION đọc, phân tích và lưu CV cùng thông tin liên hệ
          của tôi nhằm tư vấn, giới thiệu việc làm và cho phép bộ phận tuyển dụng
          CVISION liên hệ khi phù hợp.
        </span>
      </label>

      {/* NÚT PHÂN TÍCH */}
      <button
        type="button"
        onClick={analyzeCV}
        disabled={loading || loadingJobs || !file || !consent || jobs.length === 0}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? submitting
            ? "⏳ Đang gửi CV về CVISION..."
            : "⏳ AI đang đọc CV và tìm việc phù hợp..."
          : "✨ Phân tích CV và tìm việc bằng AI"}
      </button>

      {loading && (
        <div className="mt-4 rounded-xl bg-violet-50 p-4 text-center">
          <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm font-semibold text-violet-700">
            AI đang thực hiện phân tích...
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Vui lòng chờ trong giây lát.
          </p>
        </div>
      )}

      {/* THÔNG BÁO LỖI */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* THÔNG BÁO ĐÃ GỬI CV */}
      {submitted && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-bold">✓ CV của bạn đã được gửi về CVISION thành công.</p>
          <p className="mt-1">
            Bộ phận tuyển dụng sẽ kiểm tra hồ sơ và liên hệ nếu có vị trí phù hợp.
          </p>
        </div>
      )}

      {/* THÔNG TIN CV ĐÃ ĐỌC */}
      {candidate && (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <h3 className="font-bold text-slate-800">
              AI đã đọc được thông tin CV
            </h3>
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Họ và tên</p>
              <p className="font-bold text-slate-800">
                {candidate.full_name || "Chưa xác định"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Năm sinh</p>
              <p className="font-medium text-slate-700">
                {candidate.birth_year || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Số điện thoại</p>
              <p className="font-medium text-slate-700">
                {candidate.phone || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium text-slate-700">
                {candidate.email || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Địa điểm</p>
              <p className="font-medium text-slate-700">
                {candidate.province || candidate.address || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Học vấn</p>
              <p className="font-medium text-slate-700">
                {candidate.education || "Chưa cập nhật"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Vị trí gần nhất</p>
              <p className="font-medium text-slate-700">
                {candidate.latest_position || "Chưa cập nhật"}
                {candidate.latest_company
                  ? ` tại ${candidate.latest_company}`
                  : ""}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Ngoại ngữ</p>
              <p className="font-medium text-slate-700">
                {formatList(candidate.languages)}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Kỹ năng</p>
              <p className="font-medium text-slate-700">
                {formatList(candidate.skills)}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Kinh nghiệm</p>
              <p className="whitespace-pre-line font-medium text-slate-700">
                {candidate.experience || "Chưa cập nhật"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NHẬN XÉT TỔNG QUAN */}
      {summary && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="font-bold text-slate-800">
            🧠 Nhận xét tổng quan từ AI
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {summary}
          </p>
        </div>
      )}

      {/* KẾT QUẢ ĐỀ XUẤT */}
      {matches.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold text-slate-800">
              🎯 Việc làm phù hợp với ứng viên
            </h3>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              {matches.length} đề xuất
            </span>
          </div>

          {matches.map((match, index) => {
            const job = jobs.find((item) => item.id === match.job_id);

            if (!job) return null;

            const score = Math.max(
              0,
              Math.min(100, Number(match.match_score) || 0)
            );

            return (
              <article
                key={match.job_id}
                className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-violet-600">
                      ĐỀ XUẤT #{index + 1}
                    </span>

                    <h4 className="mt-1 text-lg font-extrabold text-slate-800">
                      {job.title}
                    </h4>

                    <p className="mt-1 text-sm text-slate-600">
                      {job.companies?.name || "Chưa cập nhật doanh nghiệp"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      📍 {job.location || "Chưa cập nhật địa điểm"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      💰 {job.salary || "Thỏa thuận"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-violet-50 px-4 py-3 text-center">
                    <p className="text-2xl font-extrabold text-violet-700">
                      {score}%
                    </p>
                    <p className="text-xs font-semibold text-violet-600">
                      Phù hợp
                    </p>
                  </div>
                </div>

                {match.reasons && match.reasons.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-bold text-emerald-700">
                      Điểm phù hợp
                    </p>
                    <ul className="mt-2 space-y-1">
                      {match.reasons.map((reason, i) => (
                        <li
                          key={i}
                          className="text-sm leading-6 text-slate-600"
                        >
                          ✓ {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {match.missing_skills &&
                  match.missing_skills.length > 0 && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3">
                      <p className="text-sm font-bold text-amber-800">
                        Yêu cầu cần bổ sung
                      </p>
                      <p className="mt-1 text-sm text-amber-700">
                        {match.missing_skills.join(", ")}
                      </p>
                    </div>
                  )}

                {match.recommendation && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-600">
                      Đánh giá của AI
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {match.recommendation}
                    </p>
                  </div>
                )}

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400">
                    Mô tả: {job.description || "Chưa cập nhật"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* KHÔNG CÓ KẾT QUẢ */}
      {candidate && matches.length === 0 && !loading && !error && (
        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            AI chưa tìm được công việc phù hợp trong danh sách hiện tại.
          </p>
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-slate-400">
        Kết quả do AI phân tích dựa trên nội dung CV và các tin tuyển dụng
        đang mở trong CVISION. Đây là gợi ý tham khảo; nhân viên tuyển dụng
        cần kiểm tra hồ sơ và yêu cầu công việc trước khi liên hệ ứng viên.
        CV và thông tin do bạn cung cấp sẽ được chuyển về bộ phận tuyển dụng CVISION.
      </p>
    </section>
  );
}
