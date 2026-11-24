"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Candidate = {
  id: string;
  full_name: string;
  province: string | null;
  education: string | null;
  languages: string | null;
  skills: string | null;
  experience: string | null;
  latest_position: string | null;
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
  match_score: number;
  reason: string;
  matching_skills: string[];
  missing_skills: string[];
};

export default function AIJobMatcher() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const [candidateResult, jobResult] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, full_name, province, education, languages, skills, experience, latest_position")
          .order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select("id, title, location, salary, description, requirements, companies(name)")
          .eq("status", "Đang tuyển")
          .order("created_at", { ascending: false }),
      ]);

      if (candidateResult.error) setError("Không tải được ứng viên: " + candidateResult.error.message);
      else setCandidates((candidateResult.data || []) as unknown as Candidate[]);

      if (jobResult.error) setError("Không tải được việc làm: " + jobResult.error.message);
      else setJobs((jobResult.data || []) as unknown as Job[]);

      setLoadingData(false);
    }
    load();
  }, []);

  async function findMatches() {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) {
      setError("Vui lòng chọn ứng viên.");
      return;
    }
    if (jobs.length === 0) {
      setError("Hiện chưa có tin tuyển dụng đang tuyển để đối chiếu.");
      return;
    }

    setLoading(true);
    setError("");
    setMatches([]);
    try {
      const response = await fetch("/api/ai/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate, jobs }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI chưa thể đề xuất việc làm.");
      setMatches(Array.isArray(result.matches) ? result.matches : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi kết nối AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">CVISION AI</span>
          <h2 className="mt-2 text-xl font-extrabold text-slate-800">AI đề xuất việc làm cho ứng viên</h2>
          <p className="mt-1 text-sm text-slate-500">Đối chiếu hồ sơ ứng viên với các tin đang tuyển trong CVISION.</p>
        </div>
        <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">{jobs.length} việc làm đang tuyển</span>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <select value={candidateId} onChange={(e) => { setCandidateId(e.target.value); setMatches([]); }} disabled={loadingData || loading} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
          <option value="">{loadingData ? "Đang tải ứng viên..." : "Chọn ứng viên cần tìm việc phù hợp"}</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.full_name}{candidate.latest_position ? ` — ${candidate.latest_position}` : ""}</option>)}
        </select>
        <button type="button" onClick={findMatches} disabled={loading || loadingData || !candidateId || jobs.length === 0} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "AI đang phân tích..." : "✨ Tìm việc bằng AI"}
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loadingData && candidates.length === 0 && <p className="mt-3 text-sm text-amber-700">Chưa có hồ sơ ứng viên trong hệ thống.</p>}
      {matches.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="font-bold text-slate-800">Kết quả đề xuất ({matches.length})</h3>
          {matches.map((match) => {
            const job = jobs.find((item) => item.id === match.job_id);
            if (!job) return null;
            return (
              <article key={match.job_id} className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-800">{job.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">{job.companies?.name || "Doanh nghiệp"} · {job.location || "Chưa cập nhật địa điểm"}</p>
                    <p className="mt-1 text-xs text-slate-500">Mức lương: {job.salary || "Thỏa thuận"}</p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1.5 text-sm font-extrabold text-violet-800">{Math.max(0, Math.min(100, match.match_score))}% phù hợp</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{match.reason}</p>
                {match.matching_skills?.length > 0 && <p className="mt-2 text-xs text-emerald-700"><strong>Điểm phù hợp:</strong> {match.matching_skills.join(", ")}</p>}
                {match.missing_skills?.length > 0 && <p className="mt-1 text-xs text-amber-700"><strong>Cần bổ sung:</strong> {match.missing_skills.join(", ")}</p>}
              </article>
            );
          })}
        </div>
      )}
      {!loading && matches.length === 0 && candidateId && !error && <p className="mt-3 text-sm text-slate-500">Chọn “Tìm việc bằng AI” để nhận đề xuất.</p>}
      <p className="mt-4 text-xs leading-5 text-slate-400">Kết quả là gợi ý tham khảo từ AI, dựa trên hồ sơ và tin tuyển dụng đang có; nhân viên tuyển dụng cần kiểm tra trước khi liên hệ ứng viên.</p>
    </section>
  );
}
