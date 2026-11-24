
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import SiteLogo from "@/components/SiteLogo";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PublicJob = {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  status: string;
  created_at: string | null;
};

const CONTACT_PHONE = "0399854187";
const CONTACT_EMAIL = "thanhdongvu1588@gmail.com";

const GMAIL_SUBJECT = encodeURIComponent("Ứng tuyển việc làm - CVISION");
const GMAIL_BODY = encodeURIComponent(
  "Xin chào CVISION,\n\nTôi gửi CV để ứng tuyển và mong được hỗ trợ tư vấn cơ hội việc làm.\n\nThông tin ứng viên:\n- Họ và tên:\n- Số điện thoại:\n- Vị trí quan tâm:\n\nTôi sẽ đính kèm CV định dạng PDF trong email này.\n\nTrân trọng."
);

const GMAIL_LINK = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${GMAIL_SUBJECT}&body=${GMAIL_BODY}`;

function createGmailComposeLink(subject: string, body: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    CONTACT_EMAIL
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const plans = [
  {
    name: "BASIC",
    price: "19.000 VNĐ",
    features: [
      "Thiết kế CV theo mẫu có sẵn.",
      "Chỉnh sửa thông tin cá nhân.",
      "Sắp xếp bố cục và định dạng.",
      "Bàn giao file PDF.",
    ],
  },
  {
    name: "PROFESSIONAL",
    price: "39.000 VNĐ",
    features: [
      "Thiết kế CV theo ngành nghề.",
      "Chỉnh sửa và tối ưu nội dung.",
      "Sắp xếp kinh nghiệm và kỹ năng.",
      "Tối ưu bố cục chuyên nghiệp.",
      "Bàn giao PDF và file chỉnh sửa.",
    ],
  },
  {
    name: "PREMIUM",
    price: "69.000 VNĐ",
    features: [
      "Thiết kế CV chuyên nghiệp theo vị trí ứng tuyển.",
      "Tối ưu nội dung và từ khóa CV.",
      "Tư vấn định hướng hồ sơ ứng tuyển.",
      "Hỗ trợ tối ưu LinkedIn cơ bản.",
    ],
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [jobKeyword, setJobKeyword] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Mình là trợ lý AI của CVISION. Bạn cần hỗ trợ tìm việc, tư vấn CV hay tìm hiểu dịch vụ của chúng mình?",
    },
  ]);

  async function sendChatMessage() {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput("");
    setChatError("");
    setChatMessages((current) => [...current, { role: "user", content: message }]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || typeof data.reply !== "string") {
        throw new Error(data.error || "Trợ lý AI chưa thể trả lời. Vui lòng thử lại.");
      }

      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Không thể kết nối trợ lý AI. Vui lòng thử lại sau.";
      setChatError(messageText);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPublicJobs() {
      setJobsLoading(true);
      setJobsError("");

      const { data, error } = await supabase
        .from("public_active_jobs")
        .select("id, title, company_name, location, salary, description, requirements, status, created_at")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Không tải được việc làm công khai:", error.message);
        setJobsError("Chưa thể tải danh sách việc làm. Vui lòng thử tải lại trang sau.");
        setJobs([]);
      } else {
        setJobs((data || []) as PublicJob[]);
      }

      setJobsLoading(false);
    }

    loadPublicJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const keyword = jobKeyword.trim().toLocaleLowerCase("vi");
    const location = jobLocation.trim().toLocaleLowerCase("vi");

    return jobs.filter((job) => {
      const matchesKeyword =
        !keyword ||
        `${job.title} ${job.company_name || ""}`
          .toLocaleLowerCase("vi")
          .includes(keyword);
      const matchesLocation =
        !location ||
        (job.location || "").toLocaleLowerCase("vi").includes(location);

      return matchesKeyword && matchesLocation;
    });
  }, [jobs, jobKeyword, jobLocation]);

  return (
    <main className="min-h-screen bg-white text-slate-700">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" aria-label="CVISION - Trang chủ" onClick={() => setMobileMenuOpen(false)}>
            <SiteLogo size="large" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <Link href="/" className="text-blue-600">Trang chủ</Link>
            <Link href="#jobs" className="transition hover:text-sky-500">Việc làm</Link>
            <Link href="#services" className="transition hover:text-sky-500">Dịch vụ CV</Link>
            <Link
              href="/ai-career"
              className="rounded-xl bg-violet-100 px-3 py-2 font-bold text-violet-700 transition hover:bg-violet-200"
            >
              ✨ AI phân tích CV
            </Link>
            <Link href="#about" className="transition hover:text-sky-500">Giới thiệu</Link>
            <Link href="#contact" className="transition hover:text-sky-500">Liên hệ</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin/login"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-xs font-bold text-blue-600 shadow-sm transition hover:border-blue-400 hover:bg-sky-50 sm:px-4 sm:text-sm"
            >
              Đăng nhập nội bộ
            </Link>
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-public-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-xl font-bold text-sky-700 md:hidden"
            >
              {mobileMenuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-public-navigation"
            className="border-t border-sky-100 bg-white px-4 py-3 shadow-lg md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-sky-50"
              >
                Trang chủ
              </Link>
              <Link
                href="#jobs"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50"
              >
                Việc làm
              </Link>
              <Link
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50"
              >
                Dịch vụ CV
              </Link>
              <Link
                href="/ai-career"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-100"
              >
                ✨ AI phân tích CV
              </Link>
              <Link
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50"
              >
                Giới thiệu
              </Link>
              <Link
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-sky-50"
              >
                Liên hệ
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100">
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="cvision-pattern pointer-events-none absolute inset-0 -z-10 opacity-40" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-bold text-blue-600 shadow-sm">
              ✦ Thiết kế CV chuyên nghiệp – Nâng tầm hồ sơ
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight text-blue-950 md:text-6xl">
              Tạo CV ấn tượng{" "}
              <span className="block">Chinh phục nhà tuyển dụng</span>
              <span className="block bg-gradient-to-r from-sky-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">
                Cùng CVISION
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              CVISION giúp bạn sở hữu một bản CV chuyên nghiệp, chỉn chu và phù hợp với vị trí ứng tuyển. Từ thiết kế, chỉnh sửa nội dung đến tối ưu hồ sơ, chúng tôi đồng hành cùng bạn trên hành trình phát triển sự nghiệp.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/cv-service"
                className="rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-blue-700 px-7 py-4 font-bold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:shadow-blue-300"
              >
                Thiết kế CV ngay →
              </Link>

              <Link
                href="#services"
                className="rounded-2xl border border-sky-200 bg-white/90 px-7 py-4 font-bold text-blue-600 shadow-sm transition hover:-translate-y-1 hover:border-blue-400"
              >
                Khám phá dịch vụ
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-7 text-sm text-slate-500">
              <div>
                <p className="text-xl font-extrabold text-blue-600">CVISION</p>
                <p>Thiết kế CV chuyên nghiệp</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-blue-600">Career</p>
                <p>Định hướng nghề nghiệp</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-sky-300/30 blur-2xl" />
            <div className="absolute -bottom-5 -left-5 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />

            <div className="relative rounded-[2rem] border border-white bg-white/75 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">CVISION – CV Design</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-blue-950">
                    Hồ sơ chuyên nghiệp bắt đầu từ đây
                  </h2>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-sky-200 to-blue-500 p-4 text-2xl text-white shadow-lg">
                  ✦
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {[
                  ["🎨", "Thiết kế CV chuyên nghiệp", "Mẫu CV hiện đại, phù hợp với từng ngành nghề."],
                  ["📝", "Chỉnh sửa và tối ưu nội dung", "Sắp xếp kinh nghiệm, kỹ năng và thông tin nổi bật."],
                  ["✨", "Nâng cấp hồ sơ ứng tuyển", "Tối ưu CV theo vị trí công việc và yêu cầu tuyển dụng."],
                ].map(([icon, title, desc]) => (
                  <div
                    key={title}
                    className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-white to-sky-50 p-4 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-100"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100 text-3xl">
                      {icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-950">{title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 h-2 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-sky-300 to-blue-600" />
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-blue-500">
                BUILD YOUR CAREER WITH CVISION
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 h-12 w-full rounded-t-[50%] bg-white" />
      </section>

      {/* JOB SEARCH */}
      <section id="jobs" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="font-bold tracking-widest text-blue-500">CAREER OPPORTUNITIES</p>
          <h2 className="mt-3 text-3xl font-extrabold text-blue-950 md:text-4xl">
            Việc làm đang tuyển dụng
          </h2>
          <p className="mt-3 text-slate-500">
            Các vị trí đang được CVISION cập nhật trực tiếp từ hệ thống tuyển dụng.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-2xl border border-sky-100 bg-white p-3 shadow-xl shadow-sky-100/70 sm:flex-row">
          <input
            value={jobKeyword}
            onChange={(event) => setJobKeyword(event.target.value)}
            placeholder="Nhập vị trí hoặc tên công ty..."
            aria-label="Tìm theo vị trí hoặc tên công ty"
            className="min-w-0 flex-1 rounded-xl bg-sky-50 px-4 py-3 outline-none transition focus:ring-2 focus:ring-sky-400"
          />
          <input
            value={jobLocation}
            onChange={(event) => setJobLocation(event.target.value)}
            placeholder="Địa điểm..."
            aria-label="Lọc theo địa điểm"
            className="min-w-0 flex-1 rounded-xl bg-sky-50 px-4 py-3 outline-none transition focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="button"
            onClick={() => {
              setJobKeyword("");
              setJobLocation("");
            }}
            className="rounded-xl border border-sky-200 px-6 py-3 font-bold text-blue-600 transition hover:bg-sky-50"
          >
            Xóa lọc
          </button>
        </div>

        <div className="mt-5 text-center text-sm text-slate-500">
          {jobsLoading
            ? "Đang tải việc làm..."
            : `Tìm thấy ${filteredJobs.length} / ${jobs.length} vị trí đang tuyển`}
        </div>

        {jobsError && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-800">
            {jobsError}
          </div>
        )}

        {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-10 text-center">
            <div className="text-4xl">🔎</div>
            <h3 className="mt-3 font-bold text-blue-950">
              {jobs.length === 0
                ? "Hiện chưa có vị trí nào đang tuyển."
                : "Không tìm thấy công việc phù hợp."}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {jobs.length === 0
                ? "CVISION sẽ cập nhật cơ hội mới tại đây khi Admin đăng tin tuyển dụng."
                : "Bạn hãy thử thay đổi từ khóa hoặc địa điểm tìm kiếm."}
            </p>
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <article
              key={job.id}
              className="group flex flex-col rounded-3xl border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-sky-100"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-blue-600">
                  Đang tuyển
                </span>
                <span className="text-xl">💼</span>
              </div>

              <h3 className="mt-5 text-xl font-bold text-blue-950">{job.title}</h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {job.company_name || "Doanh nghiệp tuyển dụng"}
              </p>

              <div className="mt-5 flex-1 space-y-3 border-t border-sky-100 pt-4 text-sm text-slate-600">
                <p>📍 {job.location || "Chưa cập nhật địa điểm"}</p>
                <p>💰 {job.salary || "Thỏa thuận"}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  className="rounded-xl border border-sky-300 py-3 text-sm font-bold text-blue-600 transition hover:bg-sky-50"
                >
                  Xem chi tiết
                </button>
                <a
                  href={createGmailComposeLink(
                    `Ứng tuyển ${job.title} - CVISION`,
                    `Xin chào CVISION,\n\nTôi quan tâm đến vị trí ${job.title}${job.company_name ? ` tại ${job.company_name}` : ""}.\n\nHọ và tên:\nSố điện thoại:\n\nTôi sẽ đính kèm CV trong email này.\n\nTrân trọng.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 py-3 text-center text-sm font-bold text-white transition hover:from-sky-500 hover:to-blue-700"
                >
                  Ứng tuyển
                </a>
              </div>
            </article>
          ))}
        </div>

        {selectedJob && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-job-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedJob(null);
            }}
          >
            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-blue-600">
                    Đang tuyển
                  </span>
                  <h3 id="public-job-title" className="mt-4 text-2xl font-extrabold text-blue-950">
                    {selectedJob.title}
                  </h3>
                  <p className="mt-2 font-semibold text-slate-500">
                    {selectedJob.company_name || "Doanh nghiệp tuyển dụng"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  aria-label="Đóng chi tiết"
                  className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 grid gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
                <p>📍 Địa điểm: {selectedJob.location || "Chưa cập nhật"}</p>
                <p>💰 Mức lương: {selectedJob.salary || "Thỏa thuận"}</p>
              </div>

              <div className="mt-6">
                <h4 className="font-bold text-blue-950">Mô tả công việc</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {selectedJob.description || "Thông tin đang được cập nhật."}
                </p>
              </div>

              <div className="mt-6">
                <h4 className="font-bold text-blue-950">Yêu cầu ứng viên</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {selectedJob.requirements || "Thông tin đang được cập nhật."}
                </p>
              </div>

              <a
                href={createGmailComposeLink(
                  `Ứng tuyển ${selectedJob.title} - CVISION`,
                  `Xin chào CVISION,\n\nTôi muốn ứng tuyển vị trí ${selectedJob.title}.\n\nHọ và tên:\nSố điện thoại:\n\nTôi sẽ đính kèm CV trong email này.\n\nTrân trọng.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 block rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 px-6 py-3 text-center font-bold text-white transition hover:from-sky-500 hover:to-blue-700"
              >
                Gửi CV ứng tuyển qua email
              </a>
            </div>
          </div>
        )}
      </section>

      {/* CV SERVICE */}
      <section id="services" className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100 py-20">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <p className="font-bold tracking-widest text-blue-500">CV SERVICE</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-blue-950 md:text-4xl">
              Một CV chuyên nghiệp – Thêm cơ hội nghề nghiệp
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              CVISION hỗ trợ xây dựng, chỉnh sửa, dịch thuật và chuẩn hóa
              hồ sơ xin việc theo định hướng nghề nghiệp của bạn.
            </p>

            <div className="mt-7 space-y-4">
              {[
                "Tạo CV mới chuyên nghiệp",
                "Chỉnh sửa và chuẩn hóa CV",
                "Dịch CV Việt – Anh – Trung",
                "Tối ưu CV theo mô tả công việc",
              ].map((item) => (
                <p key={item} className="flex items-center gap-3 font-medium text-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 font-bold text-blue-600">
                    ✓
                  </span>
                  {item}
                </p>
              ))}
            </div>

            <Link
              href="/cv-service"
              className="mt-9 inline-block rounded-2xl bg-gradient-to-r from-sky-400 to-blue-700 px-7 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-1"
            >
              Đăng ký dịch vụ CV →
            </Link>

            {/* BẢNG GIÁ DỊCH VỤ CV */}
            <div className="mt-10">
              <div className="text-center md:text-left">
                <p className="font-bold text-blue-500">CV SERVICE PRICING</p>
                <h3 className="mt-2 text-2xl font-extrabold text-blue-950">
                  Bảng giá dịch vụ CV
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Lựa chọn gói dịch vụ phù hợp với nhu cầu của bạn.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className="flex flex-col rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
                  >
                    <h4 className="text-lg font-bold text-blue-950">{plan.name}</h4>
                    <ul className="mt-3 flex-1 space-y-2 text-sm leading-6 text-slate-600">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 font-bold text-sky-600">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-2xl font-extrabold text-blue-600">
                      {plan.price}
                    </p>
                    <Link
                      href="/cv-service"
                      className="mt-5 block rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:from-sky-500 hover:to-blue-700"
                    >
                      Chọn gói này
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CV PREVIEW */}
          <div className="rounded-[2rem] border border-white bg-white/80 p-8 shadow-2xl shadow-blue-200/60 backdrop-blur-xl">
            <div className="rounded-2xl border border-sky-100 bg-white p-6">
              <div className="flex items-center gap-4 border-b border-sky-100 pb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-blue-500 text-3xl text-white shadow-lg">
                  👤
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-blue-950">YOUR CAREER</h3>
                  <p className="text-sm text-slate-500">Professional Resume</p>
                </div>
              </div>

              <div className="mt-7 space-y-6">
                {[
                  ["w-1/3", "w-4/5"],
                  ["w-1/2", "w-3/4"],
                  ["w-2/5", "w-5/6"],
                ].map(([heading, line], index) => (
                  <div key={index}>
                    <div className={`h-3 ${heading} rounded-full bg-gradient-to-r from-sky-400 to-blue-600`} />
                    <div className="mt-3 h-2 w-full rounded-full bg-sky-50" />
                    <div className={`mt-2 h-2 ${line} rounded-full bg-sky-100`} />
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-xl bg-gradient-to-r from-sky-50 to-blue-100 p-4 text-center font-bold text-blue-600">
                Build your career with CVISION
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative overflow-hidden px-6 py-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <p className="font-bold tracking-widest text-blue-500">ABOUT CVISION</p>
          <h2 className="mt-3 text-3xl font-extrabold text-blue-950">
            Kết nối ứng viên với đúng cơ hội
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-600">
            CVISION là nền tảng kết nối ứng viên và doanh nghiệp tuyển dụng,
            hỗ trợ tiếp nhận hồ sơ, giới thiệu ứng viên và đồng hành trong
            suốt quá trình tuyển dụng.
          </p>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 px-6 py-16 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl">
          <div className="text-center">
            <p className="font-bold tracking-widest text-sky-100">CONTACT CVISION</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
              Bắt đầu hành trình cùng CVISION
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-50">
              Bạn đang tìm kiếm cơ hội việc làm hoặc muốn gửi hồ sơ ứng tuyển?
              Hãy liên hệ với CVISION qua điện thoại hoặc email.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-white/30 bg-white/15 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
                ☎
              </div>
              <h3 className="mt-5 text-lg font-bold">Hotline</h3>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="mt-2 inline-block text-2xl font-extrabold text-white hover:text-sky-100"
              >
                {CONTACT_PHONE}
              </a>
              <p className="mt-2 text-sm text-blue-100">
                Nhấn vào số điện thoại để gọi trực tiếp.
              </p>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="mt-5 inline-flex rounded-xl border border-white/60 px-5 py-3 font-bold text-white transition hover:bg-white hover:text-blue-700"
              >
                Gọi ngay
              </a>
            </div>

            <div className="rounded-3xl border border-white/30 bg-white/15 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
                ✉
              </div>
              <h3 className="mt-5 text-lg font-bold">Email nhận CV</h3>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 inline-block break-all text-lg font-extrabold text-white hover:text-sky-100"
              >
                {CONTACT_EMAIL}
              </a>
              <p className="mt-2 text-sm text-blue-100">
                Gửi CV của bạn dưới định dạng PDF để được hỗ trợ.
              </p>
              <a
                href={GMAIL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-blue-700 transition hover:bg-sky-50"
              >
                Gửi CV qua Gmail →
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-blue-100">
            Khi gửi email, vui lòng đính kèm file CV PDF từ thiết bị của bạn.
            Gmail sẽ mở sẵn địa chỉ nhận, tiêu đề và nội dung email.
          </p>

          <div className="mt-8 text-center">
            <Link
              href="#jobs"
              className="inline-block rounded-xl border border-white/60 px-7 py-3 font-bold text-white transition hover:bg-white hover:text-blue-700"
            >
              Khám phá cơ hội việc làm
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-blue-950 px-6 py-8 text-center text-sm text-sky-100">
        <p className="text-2xl font-extrabold text-white">CVISION</p>
        <p className="mt-2">
          Recruitment Management & CV Service Platform
        </p>
        <p className="mt-3">
          Hotline:{" "}
          <a href={`tel:${CONTACT_PHONE}`} className="hover:text-white">
            {CONTACT_PHONE}
          </a>
          {" · "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-4">© 2026 CVISION. All rights reserved.</p>
      </footer>

      {/* FLOATING CVISION AI CHATBOT */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3">
        {chatOpen && (
          <section
            className="flex h-[min(560px,calc(100vh-110px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl shadow-blue-950/20"
            aria-label="Trò chuyện với CVISION AI"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-4 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-blue-600">
                ✦
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">CVISION AI</p>
                <p className="text-xs text-blue-100">Trợ lý tuyển dụng trực tuyến</p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Đóng chatbot"
                className="rounded-full px-3 py-2 text-xl leading-none transition hover:bg-white/15"
              >
                ×
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {chatMessages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                      item.role === "user"
                        ? "rounded-br-md bg-blue-600 text-white"
                        : "rounded-bl-md border border-sky-100 bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-sky-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    CVISION AI đang trả lời...
                  </div>
                </div>
              )}
              {chatError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {chatError}
                </p>
              )}
            </div>

            <form
              className="flex items-end gap-2 border-t border-slate-100 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void sendChatMessage();
              }}
            >
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendChatMessage();
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Nhập câu hỏi của bạn..."
                aria-label="Tin nhắn gửi CVISION AI"
                className="max-h-28 min-h-11 flex-1 resize-y rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-blue-700 text-lg font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi tin nhắn"
              >
                ➤
              </button>
            </form>
            <p className="bg-white px-3 pb-2 text-center text-[10px] text-slate-400">
              Câu trả lời AI có thể cần được kiểm tra lại.
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={() => setChatOpen((open) => !open)}
          aria-label={chatOpen ? "Đóng trò chuyện" : "Mở trò chuyện với CVISION AI"}
          className="flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-700 px-5 font-bold text-white shadow-xl shadow-blue-300/60 transition hover:-translate-y-1 hover:shadow-2xl"
        >
          <span className="text-xl">✦</span>
          <span>{chatOpen ? "Đóng chat" : "Chat với CVISION"}</span>
        </button>
      </div>
    </main>
  );
}
