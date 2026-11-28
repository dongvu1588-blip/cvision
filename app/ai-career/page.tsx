import AIJobMatcher from "@/components/AIJobMatcher";

export default function AICareerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            CVISION AI CAREER
          </span>

          <h1 className="mt-4 text-3xl font-extrabold text-slate-900">
            Phân tích CV và tìm việc phù hợp
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Tải CV của bạn lên để AI tự động đọc hồ sơ, phân tích năng lực,
            đối chiếu với các vị trí đang tuyển và đề xuất công việc phù hợp
            trong hệ thống CVISION.
          </p>
        </div>

        <AIJobMatcher />

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Bằng việc gửi CV, bạn đồng ý để CVISION xử lý thông tin hồ sơ nhằm
          phân tích, tư vấn cơ hội việc làm và hỗ trợ kết nối với doanh nghiệp
          tuyển dụng.
        </p>
      </div>
    </main>
  );
}