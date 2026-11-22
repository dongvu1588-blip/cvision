
import Link from "next/link";

const jobs = [
  {
    title: "Process Engineer (PE)",
    company: "Công ty sản xuất điện tử",
    location: "Bắc Giang",
    salary: "15 - 25 triệu",
    tag: "Kỹ thuật",
  },
  {
    title: "Process Quality Engineer (PQE)",
    company: "Doanh nghiệp FDI",
    location: "Bắc Ninh",
    salary: "20 - 45 triệu",
    tag: "Chất lượng",
  },
  {
    title: "Production Planning (PMC)",
    company: "Công ty sản xuất",
    location: "Thái Nguyên",
    salary: "Thỏa thuận",
    tag: "Sản xuất",
  },
];

// Thông tin liên hệ CVISION
const CONTACT_PHONE = "0399854187";
const CONTACT_EMAIL = "thanhdongvu1588@gmail.com";
const GMAIL_SUBJECT = encodeURIComponent("Ứng tuyển việc làm - CVISION");
const GMAIL_BODY = encodeURIComponent(
  "Xin chào CVISION,\n\nTôi gửi CV để ứng tuyển và mong được hỗ trợ tư vấn cơ hội việc làm.\n\nThông tin ứng viên:\n- Họ và tên:\n- Số điện thoại:\n- Vị trí quan tâm:\n\nTôi sẽ đính kèm CV định dạng PDF trong email này.\n\nTrân trọng."
);
const GMAIL_LINK = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${GMAIL_SUBJECT}&body=${GMAIL_BODY}`;

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
              C
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-emerald-700">
              CVISION
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/" className="text-emerald-700">Trang chủ</Link>
            <Link href="#jobs" className="hover:text-emerald-600">Việc làm</Link>
            <Link href="#services" className="hover:text-emerald-600">Dịch vụ CV</Link>
            <Link href="#about" className="hover:text-emerald-600">Giới thiệu</Link>
            <Link href="#contact" className="hover:text-emerald-600">Liên hệ</Link>
          </nav>

          <Link
            href="/admin/login"
            className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Đăng nhập nội bộ
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
              Kết nối nhân tài – Kiến tạo tương lai
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Tìm kiếm cơ hội nghề nghiệp cùng{" "}
              <span className="text-emerald-600">CVISION</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Kết nối ứng viên với doanh nghiệp phù hợp.
              Đồng hành cùng bạn từ hồ sơ ứng tuyển đến khi chính thức đi làm.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="#jobs"
                className="rounded-xl bg-emerald-600 px-7 py-4 font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
              >
                Khám phá việc làm →
              </Link>

              <Link
                href="#services"
                className="rounded-xl border border-slate-200 bg-white px-7 py-4 font-semibold text-slate-700 hover:border-emerald-500"
              >
                Dịch vụ CV
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">CVISION Career</p>
                <h2 className="mt-1 text-2xl font-bold">Cơ hội dành cho bạn</h2>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3 text-2xl">✦</div>
            </div>

            <div className="mt-8 space-y-4">
              {[
                ["💼", "Cơ hội việc làm", "Tiếp cận nhiều vị trí phù hợp"],
                ["📄", "Hồ sơ chuyên nghiệp", "Hỗ trợ hoàn thiện CV của bạn"],
                ["🤝", "Đồng hành tuyển dụng", "Theo dõi quá trình giới thiệu"],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="text-3xl">{icon}</div>
                  <div>
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* JOB SEARCH */}
      <section id="jobs" className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <p className="font-semibold text-emerald-600">CAREER OPPORTUNITIES</p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">
            Việc làm đang tuyển dụng
          </h2>
          <p className="mt-3 text-slate-500">
            Khám phá những cơ hội nghề nghiệp mới nhất.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row">
          <input
            placeholder="Nhập vị trí công việc..."
            className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            placeholder="Địa điểm..."
            className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button className="rounded-xl bg-emerald-600 px-7 py-3 font-semibold text-white hover:bg-emerald-700">
            Tìm việc
          </button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {jobs.map((job) => (
            <article
              key={job.title}
              className="rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {job.tag}
                </span>
                <span className="text-xl">💼</span>
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {job.title}
              </h3>

              <p className="mt-2 text-sm text-slate-500">{job.company}</p>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <p>📍 {job.location}</p>
                <p>💰 {job.salary}</p>
              </div>

              <Link
                href="#contact"
                className="mt-6 block rounded-xl border border-emerald-600 py-3 text-center font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white"
              >
                Quan tâm vị trí →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* CV SERVICE */}
      <section id="services" className="bg-emerald-50 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <p className="font-semibold text-emerald-700">CV SERVICE</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
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
                  <span className="text-emerald-600">✓</span>
                  {item}
                </p>
              ))}
            </div>

            <Link
              href="/cv-services"
              className="mt-9 inline-block rounded-xl bg-emerald-600 px-7 py-4 font-semibold text-white hover:bg-emerald-700"
            >
              Đăng ký dịch vụ CV →
            </Link>

            {/* BẢNG GIÁ DỊCH VỤ CV */}
            <div className="mt-10">
              <div className="text-center md:text-left">
                <p className="font-semibold text-emerald-700">CV SERVICE PRICING</p>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Bảng giá dịch vụ CV
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Lựa chọn gói dịch vụ phù hợp với nhu cầu của bạn.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    name: "CV Basic",
                    description: "Thiết kế và trình bày CV cơ bản",
                    price: "29.000 đồng",
                  },
                  {
                    name: "CV Professional",
                    description: "Thiết kế chuyên nghiệp, tối ưu nội dung, 1 lần chỉnh sửa",
                    price: "59.000 đồng",
                  },
                  {
                    name: "CV Multilingual",
                    description: "CV đa ngôn ngữ, tối ưu theo vị trí ứng tuyển, 2 lần chỉnh sửa",
                    price: "99.000 đồng",
                  },
                  {
                    name: "Career Package",
                    description: "CV chuyên nghiệp, Cover Letter, tối ưu LinkedIn và tư vấn nghề nghiệp",
                    price: "149.000 đồng",
                  },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className="flex flex-col rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg"
                  >
                    <h4 className="text-lg font-bold text-slate-900">
                      {plan.name}
                    </h4>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                      {plan.description}
                    </p>
                    <p className="mt-4 text-2xl font-extrabold text-emerald-700">
                      {plan.price}
                    </p>
                    <Link
                      href="/cv-services"
                      className="mt-5 block rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Chọn gói này
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <div className="rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                  👤
                </div>
                <div>
                  <h3 className="text-xl font-bold">YOUR CAREER</h3>
                  <p className="text-sm text-slate-500">Professional Resume</p>
                </div>
              </div>
              <div className="mt-7 space-y-5">
                <div>
                  <div className="h-3 w-1/3 rounded bg-emerald-600" />
                  <div className="mt-3 h-2 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-2 w-4/5 rounded bg-slate-100" />
                </div>
                <div>
                  <div className="h-3 w-1/2 rounded bg-emerald-600" />
                  <div className="mt-3 h-2 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-2 w-3/4 rounded bg-slate-100" />
                </div>
                <div>
                  <div className="h-3 w-2/5 rounded bg-emerald-600" />
                  <div className="mt-3 h-2 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-2 w-5/6 rounded bg-slate-100" />
                </div>
              </div>
              <div className="mt-7 rounded-xl bg-emerald-50 p-4 text-center font-semibold text-emerald-700">
                Build your career with CVISION
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-20 text-center">
        <p className="font-semibold text-emerald-600">ABOUT CVISION</p>
        <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
          Kết nối ứng viên với đúng cơ hội
        </h2>
        <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-600">
          CVISION là nền tảng kết nối ứng viên và doanh nghiệp tuyển dụng,
          hỗ trợ tiếp nhận hồ sơ, giới thiệu ứng viên và đồng hành trong
          suốt quá trình tuyển dụng.
        </p>
      </section>

      {/* CONTACT */}
      <section id="contact" className="bg-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="font-semibold text-emerald-400">CONTACT CVISION</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
              Bắt đầu hành trình cùng CVISION
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
              Bạn đang tìm kiếm cơ hội việc làm hoặc muốn gửi hồ sơ ứng tuyển?
              Hãy liên hệ với CVISION qua điện thoại hoặc email.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
                ☎
              </div>
              <h3 className="mt-5 text-lg font-bold">Hotline</h3>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="mt-2 inline-block text-2xl font-extrabold text-emerald-400 hover:text-emerald-300"
              >
                {CONTACT_PHONE}
              </a>
              <p className="mt-2 text-sm text-slate-400">
                Nhấn vào số điện thoại để gọi trực tiếp.
              </p>
              <a
                href={`tel:${CONTACT_PHONE}`}
                className="mt-5 inline-flex rounded-xl border border-emerald-500 px-5 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
              >
                Gọi ngay
              </a>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
                ✉
              </div>
              <h3 className="mt-5 text-lg font-bold">Email nhận CV</h3>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 inline-block break-all text-lg font-bold text-emerald-400 hover:text-emerald-300"
              >
                {CONTACT_EMAIL}
              </a>
              <p className="mt-2 text-sm text-slate-400">
                Gửi CV của bạn dưới định dạng PDF để được hỗ trợ.
              </p>
              <a
                href={GMAIL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600"
              >
                Gửi CV qua Gmail →
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            Khi gửi email, vui lòng đính kèm file CV PDF từ thiết bị của bạn.
            Gmail sẽ mở sẵn địa chỉ nhận, tiêu đề và nội dung email.
          </p>

          <div className="mt-8 text-center">
            <Link
              href="#jobs"
              className="inline-block rounded-xl border border-slate-600 px-7 py-3 font-semibold text-white transition hover:border-emerald-400 hover:bg-emerald-500"
            >
              Khám phá cơ hội việc làm
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 px-6 py-8 text-center text-sm text-slate-400">
        <p className="text-xl font-extrabold text-emerald-500">CVISION</p>
        <p className="mt-2">
          Recruitment Management & CV Service Platform
        </p>
        <p className="mt-3">
          Hotline:{" "}
          <a href={`tel:${CONTACT_PHONE}`} className="hover:text-emerald-400">
            {CONTACT_PHONE}
          </a>
          {" · "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-emerald-400">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-4">© 2026 CVISION. All rights reserved.</p>
      </footer>
    </main>
  );
}
