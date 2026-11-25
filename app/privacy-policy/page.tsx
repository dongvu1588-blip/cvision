
import Link from "next/link";
import type { ReactNode } from "react";

const sections = [
  { number: "01", title: "Giới thiệu", id: "gioi-thieu" },
  { number: "02", title: "Dữ liệu cá nhân được thu thập", id: "du-lieu-thu-thap" },
  { number: "03", title: "Mục đích sử dụng dữ liệu", id: "muc-dich" },
  { number: "04", title: "Cơ sở xử lý dữ liệu", id: "co-so-xu-ly" },
  { number: "05", title: "Chia sẻ và bên xử lý dữ liệu", id: "chia-se" },
  { number: "06", title: "Lưu trữ và xóa dữ liệu", id: "luu-tru" },
  { number: "07", title: "Quyền của người dùng", id: "quyen-nguoi-dung" },
  { number: "08", title: "Bảo mật dữ liệu", id: "bao-mat" },
  { number: "09", title: "Cookie và dữ liệu kỹ thuật", id: "cookie" },
  { number: "10", title: "Thay đổi chính sách", id: "thay-doi" },
  { number: "11", title: "Thông tin liên hệ", id: "lien-he" },
];

function PolicySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-b border-slate-100 py-8 last:border-0"
    >
      <h2 className="mb-5 text-xl font-bold text-slate-800 md:text-2xl">
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-7 text-slate-600 md:text-base">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-2xl font-black text-white shadow-lg">
              C
            </span>

            <span>
              <span className="block text-lg font-black tracking-tight text-slate-800">
                CVISION
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-sky-600">
                CAREER CONNECTION
              </span>
            </span>
          </Link>

          <Link
            href="/admin/login"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 px-5 py-16 text-white md:py-20">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border-[40px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full border-[50px] border-white/10" />

        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">
            CVISION / LEGAL
          </p>

          <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
            Chính sách bảo mật
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-8 text-blue-100 md:text-base">
            CVISION tôn trọng quyền riêng tư và cam kết xử lý thông tin cá nhân
            một cách minh bạch, có trách nhiệm và phù hợp với mục đích sử dụng.
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

      {/* CONTENT */}
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* TABLE OF CONTENTS */}
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="mb-4 font-bold text-slate-800">
            Nội dung chính sách
          </h2>

          <nav className="space-y-1">
            {sections.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
              >
                <span className="font-bold text-sky-600">
                  {item.number}
                </span>
                <span>{item.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* POLICY ARTICLE */}
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm md:px-9">
          <div className="border-b border-slate-100 py-7">
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm leading-7 text-slate-700">
              <strong>Lưu ý:</strong> Chính sách này áp dụng cho website
              CVISION và các chức năng quản lý tuyển dụng liên quan. Người dùng
              cần được thông báo về hoạt động xử lý dữ liệu cá nhân trước khi
              cung cấp thông tin.
            </div>
          </div>

          <PolicySection id="gioi-thieu" title="1. Giới thiệu">
            <p>
              CVISION là dự án nền tảng hỗ trợ quản lý tuyển dụng, hồ sơ ứng
              viên và kết nối doanh nghiệp. Chính sách này giải thích cách
              CVISION thu thập, sử dụng, lưu trữ, chia sẻ và bảo vệ dữ liệu
              cá nhân của người sử dụng.
            </p>
            <p>
              <strong>Đơn vị vận hành:</strong> Dự án CVision, hiện được vận
              hành dưới hình thức dự án cá nhân, chưa công bố pháp nhân doanh
              nghiệp.
            </p>
            <p>
              <strong>Website:</strong> dongvu1588.id.vn
            </p>
            <p>
              <strong>Email liên hệ:</strong> dongvu1588@gmail.com
            </p>
          </PolicySection>

          <PolicySection
            id="du-lieu-thu-thap"
            title="2. Dữ liệu cá nhân được thu thập"
          >
            <p>
              CVISION có thể xử lý các nhóm dữ liệu sau, tùy thuộc vào chức
              năng mà người dùng sử dụng:
            </p>

            <p className="font-bold text-slate-800">
              2.1. Thông tin ứng viên
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Họ và tên, năm sinh hoặc ngày sinh nếu được cung cấp.</li>
              <li>Số điện thoại, email, địa chỉ và khu vực sinh sống.</li>
              <li>Trình độ học vấn, kinh nghiệm làm việc, kỹ năng và ngoại ngữ.</li>
              <li>Ảnh đại diện, CV, hồ sơ nghề nghiệp và thông tin ứng tuyển.</li>
              <li>Các thông tin khác do ứng viên tự nguyện cung cấp.</li>
            </ul>

            <p className="font-bold text-slate-800">
              2.2. Thông tin tài khoản nhân viên
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Họ tên, email đăng nhập, số điện thoại và ảnh đại diện.</li>
              <li>Vai trò tài khoản và thông tin phục vụ quản lý truy cập.</li>
            </ul>

            <p className="font-bold text-slate-800">
              2.3. Dữ liệu kỹ thuật
            </p>
            <p>
              Có thể bao gồm địa chỉ IP, loại trình duyệt, thiết bị, thời gian
              truy cập, nhật ký hoạt động và thông tin kỹ thuật cần thiết để
              vận hành, bảo vệ hệ thống.
            </p>

            <p>
              CVISION không chủ động yêu cầu người dùng cung cấp dữ liệu nhạy
              cảm nếu dữ liệu đó không cần thiết cho mục đích sử dụng.
            </p>
          </PolicySection>

          <PolicySection
            id="muc-dich"
            title="3. Mục đích sử dụng dữ liệu"
          >
            <p>Dữ liệu cá nhân có thể được sử dụng để:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Tiếp nhận, quản lý và xử lý hồ sơ ứng viên.</li>
              <li>Hỗ trợ tìm kiếm, sàng lọc và đối chiếu hồ sơ với vị trí tuyển dụng.</li>
              <li>Kết nối ứng viên với doanh nghiệp hoặc bên tuyển dụng phù hợp.</li>
              <li>Quản lý tài khoản, phân quyền và hỗ trợ người dùng.</li>
              <li>Vận hành, duy trì, khắc phục lỗi và bảo vệ hệ thống.</li>
              <li>Thực hiện yêu cầu của người dùng và nghĩa vụ pháp lý liên quan.</li>
            </ul>
            <p>
              CVISION không sử dụng dữ liệu cá nhân cho mục đích không tương
              thích với mục đích đã thông báo hoặc chưa có cơ sở xử lý phù hợp.
            </p>
          </PolicySection>

          <PolicySection
            id="co-so-xu-ly"
            title="4. Cơ sở xử lý dữ liệu"
          >
            <p>
              CVISION xử lý dữ liệu trên cơ sở phù hợp với quy định pháp luật,
              bao gồm sự đồng ý hợp lệ của chủ thể dữ liệu khi pháp luật yêu
              cầu, việc thực hiện yêu cầu hoặc thỏa thuận với người dùng và
              các căn cứ xử lý hợp pháp khác nếu có.
            </p>
            <p>
              Khi cần sự đồng ý, CVISION sẽ cung cấp thông tin về loại dữ liệu,
              mục đích xử lý, bên xử lý và quyền, nghĩa vụ liên quan. Sự đồng ý
              đối với các mục đích khác nhau cần được thể hiện rõ ràng và có
              thể kiểm chứng.
            </p>
            <p>
              Việc gửi CV không đồng nghĩa với việc đồng ý vô thời hạn cho mọi
              mục đích sử dụng hoặc chia sẻ dữ liệu.
            </p>
          </PolicySection>

          <PolicySection
            id="chia-se"
            title="5. Chia sẻ và bên xử lý dữ liệu"
          >
            <p>
              CVISION không mua bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ
              trong phạm vi cần thiết, phù hợp với mục đích đã thông báo và
              căn cứ xử lý hợp pháp.
            </p>

            <p>Các nhóm bên có thể tham gia xử lý dữ liệu gồm:</p>
            <ul className="list-disc space-y-3 pl-6">
              <li>
                <strong>Nhà cung cấp hạ tầng và lưu trữ:</strong> Supabase,
                Vercel và các nhà cung cấp kỹ thuật được sử dụng để vận hành
                website, cơ sở dữ liệu và lưu trữ tệp.
              </li>
              <li>
                <strong>Dịch vụ AI:</strong> Google Gemini có thể được sử dụng
                để hỗ trợ đọc, trích xuất, dịch hoặc đối chiếu thông tin CV
                khi người dùng sử dụng tính năng AI tương ứng.
              </li>
              <li>
                <strong>Doanh nghiệp tuyển dụng:</strong> Thông tin ứng viên
                có thể được cung cấp cho bên tuyển dụng phù hợp khi có mục
                đích và căn cứ xử lý hợp pháp, bao gồm sự đồng ý cần thiết
                của ứng viên.
              </li>
              <li>
                <strong>Cơ quan có thẩm quyền:</strong> Khi việc cung cấp
                thông tin được pháp luật yêu cầu hoặc cho phép.
              </li>
            </ul>

            <p>
              Một số nhà cung cấp dịch vụ có thể xử lý dữ liệu tại quốc gia
              ngoài Việt Nam. Việc chuyển dữ liệu xuyên biên giới, nếu phát
              sinh, phải được xem xét và thực hiện theo quy định pháp luật
              áp dụng.
            </p>
          </PolicySection>

          <PolicySection
            id="luu-tru"
            title="6. Lưu trữ và xóa dữ liệu"
          >
            <p>
              CVISION lưu trữ dữ liệu trong khoảng thời gian cần thiết cho
              mục đích đã thông báo, theo thỏa thuận với chủ thể dữ liệu và
              thời hạn pháp luật yêu cầu nếu có.
            </p>
            <p>
              Đối với hồ sơ ứng viên không được tuyển dụng, CVISION sẽ thực
              hiện việc xóa hoặc hủy dữ liệu theo quy định pháp luật, trừ
              trường hợp có thỏa thuận khác hợp lệ hoặc có căn cứ lưu trữ
              theo pháp luật.
            </p>
            <p>
              Đối với tài khoản nhân viên, dữ liệu được lưu trong thời gian
              tài khoản hoạt động và trong khoảng thời gian cần thiết để
              xử lý các nghĩa vụ, tranh chấp hoặc yêu cầu hợp pháp còn tồn tại.
            </p>
            <p>
              Dữ liệu trong bản sao lưu có thể được xóa theo chu kỳ sao lưu
              và quy trình kỹ thuật phù hợp, trừ trường hợp cần giữ lại theo
              quy định pháp luật.
            </p>
            <p>
              Thời hạn lưu trữ cụ thể và quy trình xóa hồ sơ sẽ được công bố
              rõ hơn trong Chính sách lưu trữ và xóa CV của CVISION.
            </p>
          </PolicySection>

          <PolicySection
            id="quyen-nguoi-dung"
            title="7. Quyền của người dùng"
          >
            <p>
              Theo quy định pháp luật áp dụng, chủ thể dữ liệu có thể thực
              hiện các quyền tương ứng, bao gồm:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Được biết về hoạt động xử lý dữ liệu cá nhân.</li>
              <li>Đồng ý, không đồng ý hoặc rút lại sự đồng ý khi pháp luật cho phép.</li>
              <li>Truy cập, xem, chỉnh sửa hoặc yêu cầu cập nhật dữ liệu.</li>
              <li>Yêu cầu cung cấp, xóa, hạn chế hoặc phản đối việc xử lý dữ liệu trong trường hợp luật quy định.</li>
              <li>Khiếu nại, tố cáo, khởi kiện hoặc yêu cầu bồi thường theo quy định pháp luật.</li>
            </ul>
            <p>
              Để thực hiện quyền của mình, người dùng có thể gửi yêu cầu đến
              dongvu1588@gmail.com. CVISION có thể yêu cầu thông tin hợp lý
              để xác minh danh tính và phạm vi yêu cầu trước khi xử lý.
            </p>
            <p>
              Yêu cầu sẽ được tiếp nhận và xử lý theo thời hạn, trình tự và
              các trường hợp ngoại lệ được pháp luật quy định.
            </p>
          </PolicySection>

          <PolicySection
            id="bao-mat"
            title="8. Bảo mật dữ liệu"
          >
            <p>
              CVISION hướng tới áp dụng các biện pháp kỹ thuật và tổ chức phù
              hợp với quy mô, tính chất dữ liệu và rủi ro xử lý, có thể bao gồm:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Phân quyền truy cập theo vai trò tài khoản.</li>
              <li>Kiểm soát truy cập cơ sở dữ liệu và kho lưu trữ.</li>
              <li>Bảo vệ thông tin xác thực và khóa bí mật ở phía máy chủ.</li>
              <li>Kiểm tra, khắc phục lỗi và cập nhật hệ thống.</li>
              <li>Hạn chế truy cập dữ liệu không cần thiết.</li>
            </ul>
            <p>
              Không có hệ thống nào có thể bảo đảm an toàn tuyệt đối. Khi phát
              hiện sự cố liên quan đến dữ liệu cá nhân, CVISION sẽ xem xét và
              thực hiện các biện pháp xử lý, thông báo theo quy định pháp luật
              áp dụng.
            </p>
          </PolicySection>

          <PolicySection
            id="cookie"
            title="9. Cookie và dữ liệu kỹ thuật"
          >
            <p>
              Website có thể sử dụng cookie hoặc công nghệ tương tự để duy
              trì phiên đăng nhập, hỗ trợ bảo mật, ghi nhớ tùy chọn và cải
              thiện trải nghiệm sử dụng.
            </p>
            <p>
              Cookie phục vụ xác thực và vận hành có thể cần thiết để cung
              cấp dịch vụ. Các công nghệ theo dõi không thiết yếu, nếu được
              triển khai, sẽ được thông báo và xử lý theo yêu cầu pháp luật.
            </p>
          </PolicySection>

          <PolicySection
            id="thay-doi"
            title="10. Thay đổi chính sách"
          >
            <p>
              CVISION có thể cập nhật chính sách khi chức năng, nhà cung cấp
              hoặc quy định pháp luật thay đổi.
            </p>
            <p>
              Phiên bản mới sẽ được đăng tải trên trang này kèm ngày cập nhật.
              Nếu thay đổi ảnh hưởng đáng kể đến mục đích hoặc cách thức xử lý
              dữ liệu, CVISION sẽ thực hiện việc thông báo và xin ý kiến đồng
              ý khi pháp luật yêu cầu.
            </p>
          </PolicySection>

          <PolicySection
            id="lien-he"
            title="11. Thông tin liên hệ"
          >
            <p>
              Nếu có câu hỏi, yêu cầu chỉnh sửa, truy cập, rút lại sự đồng ý
              hoặc xóa dữ liệu cá nhân, vui lòng liên hệ:
            </p>

            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-lg font-black text-slate-800">
                CVISION
              </p>
              <p>Đơn vị vận hành: Dự án CVision</p>
              <p>
                Website:{" "}
                <a
                  href="https://dongvu1588.id.vn"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  dongvu1588.id.vn
                </a>
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:dongvu1588@gmail.com"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  dongvu1588@gmail.com
                </a>
              </p>
            </div>
          </PolicySection>

          <div className="py-8 text-center">
            <p className="text-xs leading-6 text-slate-400">
              CVISION · CAREER CONNECTION
              <br />
              Chính sách bảo mật phiên bản 1.0 · Cập nhật 25/11/2026
            </p>
          </div>
        </article>
      </div>

      {/* FOOTER */}
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
