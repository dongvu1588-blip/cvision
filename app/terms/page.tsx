
import Link from "next/link";
import type { ReactNode } from "react";

const sections = [
  ["01", "Giới thiệu", "gioi-thieu"],
  ["02", "Chấp nhận điều khoản", "chap-nhan"],
  ["03", "Đối tượng sử dụng", "doi-tuong"],
  ["04", "Quy định đối với ứng viên", "ung-vien"],
  ["05", "Quy định đối với nhân viên tuyển dụng", "nhan-vien"],
  ["06", "Quy định đối với Admin", "admin"],
  ["07", "Quyền sở hữu trí tuệ", "so-huu-tri-tue"],
  ["08", "Hành vi bị nghiêm cấm", "cam"],
  ["09", "Giới hạn trách nhiệm", "trach-nhiem"],
  ["10", "Liên hệ và cập nhật", "lien-he"],
];

function TermsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-slate-100 py-8 last:border-0">
      <h2 className="mb-5 text-xl font-bold text-slate-800 md:text-2xl">
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-7 text-slate-600 md:text-base">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-2xl font-black text-white shadow-lg">
              C
            </span>
            <span>
              <span className="block text-lg font-black text-slate-800">
                CVISION
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-sky-600">
                CAREER CONNECTION
              </span>
            </span>
          </Link>

          <Link
            href="/admin/login"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-700"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 px-5 py-16 text-white md:py-20">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border-[40px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full border-[50px] border-white/10" />

        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">
            CVISION / LEGAL
          </p>
          <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
            Điều khoản sử dụng
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-blue-100 md:text-base">
            Các điều khoản quy định quyền, trách nhiệm và nguyên tắc sử dụng
            nền tảng CVISION dành cho ứng viên và nhân sự tuyển dụng.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs text-blue-100">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
              Ngày cập nhật: 25/11/2026
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
              Phiên bản: 1.0
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="mb-4 font-bold text-slate-800">
            Nội dung điều khoản
          </h2>
          <nav className="space-y-1">
            {sections.map(([number, title, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
              >
                <span className="font-bold text-sky-600">{number}</span>
                <span>{title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm md:px-9">
          <div className="border-b border-slate-100 py-7">
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm leading-7 text-slate-700">
              <strong>Lưu ý:</strong> Đây là bản điều khoản sử dụng dành cho
              nền tảng CVISION. Người dùng cần đọc và hiểu các quy định trước
              khi sử dụng dịch vụ.
            </div>
          </div>

          <TermsSection id="gioi-thieu" title="1. Giới thiệu">
            <p>
              CVISION là dự án nền tảng hỗ trợ quản lý tuyển dụng, hồ sơ ứng
              viên và kết nối doanh nghiệp. Nền tảng cung cấp các công cụ hỗ
              trợ đăng tải thông tin tuyển dụng, quản lý ứng viên, xử lý CV
              và theo dõi quy trình tuyển dụng.
            </p>
            <p><strong>Đơn vị vận hành:</strong> Dự án CVision.</p>
            <p><strong>Website:</strong> dongvu1588.id.vn</p>
            <p><strong>Email:</strong> dongvu1588@gmail.com</p>
          </TermsSection>

          <TermsSection id="chap-nhan" title="2. Chấp nhận điều khoản">
            <p>
              Khi truy cập hoặc sử dụng các chức năng của CVISION, người dùng
              có trách nhiệm tìm hiểu và tuân thủ các điều khoản áp dụng.
            </p>
            <p>
              Nếu không đồng ý với các điều khoản, người dùng nên ngừng sử
              dụng chức năng hoặc dịch vụ có liên quan.
            </p>
            <p>
              Việc chấp nhận điều khoản sử dụng không thay thế cho việc đồng
              ý xử lý dữ liệu cá nhân. Các nội dung về dữ liệu cá nhân được
              quy định riêng tại Chính sách bảo mật.
            </p>
          </TermsSection>

          <TermsSection id="doi-tuong" title="3. Đối tượng sử dụng">
            <p>CVISION hướng đến các nhóm người dùng sau:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Ứng viên:</strong> Người cung cấp hồ sơ, CV và thông
                tin nghề nghiệp để tìm kiếm cơ hội việc làm.
              </li>
              <li>
                <strong>Nhân viên tuyển dụng (Recruiter):</strong> Người được
                cấp tài khoản để thực hiện công việc tuyển dụng và quản lý
                dữ liệu trong phạm vi được phân quyền.
              </li>
              <li>
                <strong>Quản trị viên (Admin):</strong> Người được giao quyền
                quản lý, cấu hình và kiểm soát hoạt động của hệ thống.
              </li>
            </ul>
          </TermsSection>

          <TermsSection id="ung-vien" title="4. Quy định đối với ứng viên">
            <p>Ứng viên có trách nhiệm:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Cung cấp thông tin chính xác, trung thực và cập nhật.</li>
              <li>Chỉ gửi CV và tài liệu mà mình có quyền cung cấp.</li>
              <li>Không giả mạo danh tính, bằng cấp hoặc kinh nghiệm làm việc.</li>
              <li>Không gửi tài liệu chứa mã độc hoặc nội dung vi phạm pháp luật.</li>
              <li>Chủ động liên hệ khi cần chỉnh sửa hoặc yêu cầu xử lý dữ liệu cá nhân.</li>
            </ul>
            <p>
              Ứng viên cần đọc Chính sách bảo mật và các thông báo xử lý dữ
              liệu trước khi gửi hồ sơ.
            </p>
          </TermsSection>

          <TermsSection id="nhan-vien" title="5. Quy định đối với nhân viên tuyển dụng">
            <p>Nhân viên tuyển dụng có trách nhiệm:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Bảo mật tài khoản, mật khẩu và thông tin xác thực.</li>
              <li>Chỉ truy cập dữ liệu ứng viên phục vụ công việc được giao.</li>
              <li>Không tự ý chia sẻ, sao chép hoặc sử dụng CV sai mục đích.</li>
              <li>Không tự ý chỉnh sửa hoặc xóa dữ liệu ngoài phạm vi được cấp quyền.</li>
              <li>Cập nhật thông tin tuyển dụng và trạng thái ứng viên trung thực.</li>
              <li>Thông báo cho Admin khi phát hiện lỗi hoặc nguy cơ mất an toàn dữ liệu.</li>
            </ul>
          </TermsSection>

          <TermsSection id="admin" title="6. Quy định đối với Admin">
            <p>Quản trị viên có trách nhiệm:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Quản lý tài khoản và phân quyền phù hợp với nhiệm vụ.</li>
              <li>Kiểm soát việc truy cập và sử dụng dữ liệu cá nhân.</li>
              <li>Không sử dụng quyền quản trị cho mục đích trái pháp luật.</li>
              <li>Kiểm tra và xử lý các sự cố liên quan đến hệ thống.</li>
              <li>Thực hiện việc sao lưu, bảo vệ và quản lý dữ liệu theo quy trình.</li>
            </ul>
          </TermsSection>

          <TermsSection id="so-huu-tri-tue" title="7. Quyền sở hữu trí tuệ">
            <p>
              Giao diện, thiết kế, logo, tên thương hiệu, mã nguồn và các
              thành phần do CVISION phát triển có thể thuộc quyền sở hữu
              hoặc quyền sử dụng hợp pháp của chủ thể tương ứng.
            </p>
            <p>
              Người dùng không được tự ý sao chép, sửa đổi, phân phối hoặc
              khai thác các thành phần này trái với quyền của chủ sở hữu
              hoặc quy định pháp luật.
            </p>
            <p>
              Đối với CV, hình ảnh và tài liệu do ứng viên cung cấp, quyền
              đối với nội dung đó vẫn thuộc về chủ thể có quyền tương ứng.
              Việc cung cấp tài liệu cho CVISION không mặc nhiên chuyển
              quyền sở hữu tài liệu cho dự án.
            </p>
          </TermsSection>

          <TermsSection id="cam" title="8. Hành vi bị nghiêm cấm">
            <ul className="list-disc space-y-2 pl-6">
              <li>Truy cập trái phép vào tài khoản hoặc dữ liệu của người khác.</li>
              <li>Can thiệp, phá hoại hoặc gây gián đoạn hoạt động của website.</li>
              <li>Phát tán mã độc, spam hoặc nội dung có mục đích gây hại.</li>
              <li>Thu thập hoặc sử dụng dữ liệu ứng viên trái phép.</li>
              <li>Giả mạo danh tính hoặc sử dụng tài khoản của người khác.</li>
              <li>Sử dụng CVISION để thực hiện hành vi vi phạm pháp luật.</li>
            </ul>
          </TermsSection>

          <TermsSection id="trach-nhiem" title="9. Giới hạn trách nhiệm">
            <p>
              CVISION cung cấp các công cụ hỗ trợ quản lý và kết nối tuyển
              dụng. Các kết quả trích xuất CV, dịch thuật hoặc phân tích bằng
              AI chỉ mang tính chất hỗ trợ và cần được con người kiểm tra.
            </p>
            <p>
              CVISION không bảo đảm ứng viên chắc chắn được tuyển dụng hoặc
              doanh nghiệp chắc chắn tìm được ứng viên phù hợp.
            </p>
            <p>
              Người dùng có trách nhiệm kiểm tra tính chính xác của thông
              tin trước khi sử dụng trong các quyết định tuyển dụng.
            </p>
            <p>
              Các quy định về trách nhiệm này không loại trừ những nghĩa vụ
              mà pháp luật bắt buộc CVISION phải thực hiện.
            </p>
          </TermsSection>

          <TermsSection id="lien-he" title="10. Liên hệ và cập nhật">
            <p>
              CVISION có thể cập nhật điều khoản khi chức năng nền tảng hoặc
              quy định pháp luật thay đổi. Phiên bản mới sẽ được đăng tải
              trên trang này kèm ngày cập nhật.
            </p>
            <p>
              Nếu có thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ:
            </p>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-lg font-black text-slate-800">CVISION</p>
              <p>Đơn vị vận hành: Dự án CVision</p>
              <p>
                Website:{" "}
                <a href="https://dongvu1588.id.vn" className="font-semibold text-sky-700 hover:underline">
                  dongvu1588.id.vn
                </a>
              </p>
              <p>
                Email:{" "}
                <a href="mailto:dongvu1588@gmail.com" className="font-semibold text-sky-700 hover:underline">
                  dongvu1588@gmail.com
                </a>
              </p>
            </div>
          </TermsSection>

          <div className="py-8 text-center text-xs leading-6 text-slate-400">
            CVISION · CAREER CONNECTION
            <br />
            Điều khoản sử dụng phiên bản 1.0 · Cập nhật 25/11/2026
          </div>
        </article>
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center">
        <p className="text-sm font-bold text-slate-700">
          CVISION – CAREER CONNECTION
        </p>
        <p className="mt-2 text-xs text-slate-400">
          © 2026 CVISION. Kết nối nhân tài và doanh nghiệp.
        </p>
        <div className="mt-3 flex justify-center gap-5 text-xs font-medium text-sky-700">
          <Link href="/privacy-policy" className="hover:underline">
            Chính sách bảo mật
          </Link>
          <Link href="/terms" className="hover:underline">
            Điều khoản sử dụng
          </Link>
        </div>
      </footer>
    </main>
  );
}
