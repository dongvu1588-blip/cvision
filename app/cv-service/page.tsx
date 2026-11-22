
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const servicePackages = [
  { name: "CV Basic", price: "29.000 đồng", description: "Thiết kế và trình bày CV cơ bản" },
  { name: "CV Professional", price: "59.000 đồng", description: "Thiết kế chuyên nghiệp, tối ưu nội dung, 1 lần chỉnh sửa" },
  { name: "CV Multilingual", price: "99.000 đồng", description: "CV đa ngôn ngữ, tối ưu theo vị trí ứng tuyển, 2 lần chỉnh sửa" },
  { name: "Career Package", price: "149.000 đồng", description: "CV chuyên nghiệp, Cover Letter, tối ưu LinkedIn và tư vấn nghề nghiệp" },
];

const inputClass =
  "w-full rounded-xl border border-sky-100 bg-white p-3.5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export default function CVServicePage() {
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [workExperience, setWorkExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [noLanguage, setNoLanguage] = useState(false);
  const [interests, setInterests] = useState("");
  const [careerObjective, setCareerObjective] = useState("");
  const [education, setEducation] = useState("");
  const [certificates, setCertificates] = useState("");
  const [awards, setAwards] = useState("");
  const [referee, setReferee] = useState("");
  const [consent, setConsent] = useState(false);
  const [serviceType, setServiceType] = useState("CV Basic");
  const [extraRequest, setExtraRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPackage =
    servicePackages.find((item) => item.name === serviceType) || servicePackages[0];

  function resetForm() {
    setFullName("");
    setDateOfBirth("");
    setPhone("");
    setEmail("");
    setAddress("");
    setPhoto(null);
    setWorkExperience("");
    setSkills("");
    setLanguages("");
    setNoLanguage(false);
    setInterests("");
    setCareerObjective("");
    setEducation("");
    setCertificates("");
    setAwards("");
    setReferee("");
    setConsent(false);
    setServiceType("CV Basic");
    setExtraRequest("");

    const fileInput = document.getElementById("cv-request-photo") as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setErrorMessage("");

    if (!photo) {
      setErrorMessage("Vui lòng tải lên ảnh CV/chân dung của bạn.");
      return;
    }

    if (noLanguage && !languages.trim()) {
      setLanguages("Không có");
    }

    setLoading(true);
    let uploadedPhotoPath: string | null = null;

    try {
      const safeFileName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedPhotoPath = `cv-requests/photos/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("candidate-cvs")
        .upload(uploadedPhotoPath, photo, {
          cacheControl: "3600",
          upsert: false,
          contentType: photo.type,
        });

      if (uploadError) {
        throw new Error(
          `Không tải được ảnh lên hệ thống: ${uploadError.message}. Hãy kiểm tra bucket candidate-cvs và quyền upload.`
        );
      }

      const finalLanguages = noLanguage ? "Không có" : languages.trim();

      const { error: insertError } = await supabase.from("cv_requests").insert({
        full_name: fullName.trim().toUpperCase(),
        date_of_birth: dateOfBirth,
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim(),
        photo_url: uploadedPhotoPath,
        work_experience: workExperience.trim(),
        skills: skills.trim(),
        languages: finalLanguages,
        interests: interests.trim() || null,
        career_objective: careerObjective.trim(),
        education: education.trim(),
        certificates: certificates.trim() || null,
        awards: awards.trim() || null,
        referee: referee.trim() || null,
        consent_to_share: consent,
        service_type: serviceType,
        description: [
          `Gói dịch vụ: ${selectedPackage.name}`,
          `Giá niêm yết: ${selectedPackage.price}`,
          `Nội dung gói: ${selectedPackage.description}`,
          extraRequest.trim() ? `Yêu cầu thêm: ${extraRequest.trim()}` : "",
        ].filter(Boolean).join("\n"),
      });

      if (insertError) {
        if (uploadedPhotoPath) {
          await supabase.storage.from("candidate-cvs").remove([uploadedPhotoPath]);
        }
        throw new Error(`Không lưu được thông tin đăng ký: ${insertError.message}`);
      }

      setSuccess(true);
      resetForm();
    } catch (error) {
      console.error("CVISION CV request error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi không xác định. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-white to-blue-50 text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-black text-white shadow-lg shadow-sky-200">
              C
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-sky-700">CVISION</span>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-sky-500">CAREER SERVICES</p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-sky-100 bg-sky-50 px-5 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
          >
            ← Trang chủ
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-blue-700 px-5 py-16 text-center text-white md:py-20">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-50 backdrop-blur">
            CVISION Career Services
          </span>
          <h1 className="mt-6 text-3xl font-black leading-tight md:text-5xl">
            Xây dựng CV chuyên nghiệp
            <span className="mt-2 block text-sky-100">Mở rộng cơ hội nghề nghiệp</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-50 md:text-base">
            Cung cấp thông tin để CVISION hỗ trợ xây dựng hồ sơ chuyên nghiệp và phù hợp với mục tiêu nghề nghiệp của bạn.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
            <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2">✦ Thiết kế chuyên nghiệp</span>
            <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2">✦ Tối ưu hồ sơ</span>
            <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2">✦ Định hướng nghề nghiệp</span>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="mb-9 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">Our Services</span>
          <h2 className="mt-2 text-2xl font-black text-slate-800 md:text-3xl">Bảng giá dịch vụ CV</h2>
          <p className="mt-3 text-sm text-slate-500">Chọn gói dịch vụ phù hợp với nhu cầu của bạn.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {servicePackages.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setServiceType(item.name);
                setSuccess(false);
                setErrorMessage("");
              }}
              className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                serviceType === item.name
                  ? "border-sky-400 bg-gradient-to-br from-sky-50 to-blue-100 shadow-lg shadow-sky-100 ring-2 ring-sky-200"
                  : "border-sky-100 bg-white shadow-sm hover:border-sky-300"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-black text-white shadow-md shadow-sky-100">
                  {index + 1}
                </span>
                {serviceType === item.name && (
                  <span className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-bold text-white">
                    ĐANG CHỌN
                  </span>
                )}
              </div>
              <span className="block text-lg font-extrabold text-slate-800">{item.name}</span>
              <span className="mt-3 block text-2xl font-black text-sky-600">{item.price}</span>
              <span className="mt-3 block min-h-16 text-sm leading-6 text-slate-500">{item.description}</span>
              <span className="mt-5 block text-sm font-bold text-sky-700">
                {serviceType === item.name ? "✓ Đã chọn gói" : "Chọn gói này →"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-7 text-white md:px-9">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">CVISION Application</p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">Phiếu thông tin hồ sơ CV</h2>
            <p className="mt-2 text-sm leading-6 text-blue-50">
              Vui lòng điền đầy đủ thông tin để CVISION hỗ trợ bạn xây dựng hồ sơ chuyên nghiệp.
            </p>
          </div>

          <div className="p-5 md:p-9">
            <div className="mb-8 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Gói dịch vụ đang chọn</p>
              <p className="mt-2 text-lg font-extrabold text-slate-800">{selectedPackage.name}</p>
              <p className="mt-1 text-2xl font-black text-sky-600">{selectedPackage.price}</p>
              <p className="mt-1 text-sm text-slate-600">{selectedPackage.description}</p>
            </div>

            {success && (
              <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
                ✓ Đăng ký thành công! CVISION đã nhận được thông tin và ảnh của bạn. Chúng tôi sẽ liên hệ theo số điện thoại bạn cung cấp.
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-9">
              {/* 1. PHOTO */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  01. Ảnh CV <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm leading-6 text-slate-500">
                  Chọn ảnh nghiêm túc, gọn gàng, thần thái tự tin. Trang phục lịch sự, ưu tiên áo có cổ hoặc phong cách công sở. Ảnh rõ nét sẽ giúp CV chuyên nghiệp hơn.
                </p>
                <input
                  id="cv-request-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className={inputClass}
                />
                <p className="text-xs text-slate-400">Chấp nhận JPG, PNG hoặc WEBP; dung lượng tối đa 5 MB.</p>
              </section>

              {/* 2. PERSONAL */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  02. Thông tin cá nhân <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-slate-500">Vui lòng nhập tên đầy đủ bằng chữ in hoa để hồ sơ được trình bày thống nhất.</p>
                <div>
                  <label className={labelClass}>Họ và tên (IN HOA) *</label>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value.toLocaleUpperCase("vi-VN"))} placeholder="NGUYỄN VĂN A" className={inputClass} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Ngày sinh *</label>
                    <input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Số điện thoại *</label>
                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nhập số điện thoại" className={inputClass} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Địa chỉ hiện tại *</label>
                    <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Phường/xã, tỉnh/thành phố" className={inputClass} />
                  </div>
                </div>
              </section>

              {/* 3. EXPERIENCE */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  03. Kinh nghiệm làm việc <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm leading-6 text-slate-500">
                  Sắp xếp từ công việc gần nhất; viết ngắn gọn, đúng trọng tâm. Nếu đã có kinh nghiệm, ưu tiên 2–3 công việc liên quan. Nếu chưa có, có thể ghi thực tập hoặc công việc thể hiện khả năng thích nghi và trách nhiệm.
                </p>
                <textarea required rows={5} value={workExperience} onChange={(e) => setWorkExperience(e.target.value)} placeholder={"Tên công ty – Vị trí – Thời gian làm việc\nMô tả nhiệm vụ và kết quả đạt được..."} className={inputClass} />
              </section>

              {/* 4. SKILLS */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  04. Kỹ năng <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-slate-500">Chỉ liệt kê kỹ năng phù hợp với ngành nghề ứng tuyển, ví dụ: PLC, Microsoft Office, AutoCAD, 2D, 3D...</p>
                <textarea required rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Nhập các kỹ năng của bạn..." className={inputClass} />
              </section>

              {/* 5. LANGUAGES */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  05. Ngoại ngữ <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-slate-500">Có thể ghi tiếng Anh, Trung, Hàn, Nhật... kèm trình độ. Nếu không có, vui lòng chọn “Không có”.</p>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={noLanguage}
                    onChange={(e) => {
                      setNoLanguage(e.target.checked);
                      if (e.target.checked) setLanguages("Không có");
                      else if (languages === "Không có") setLanguages("");
                    }}
                    className="h-4 w-4 accent-sky-600"
                  />
                  Không có ngoại ngữ
                </label>
                {!noLanguage && (
                  <textarea required rows={2} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Ví dụ: Tiếng Anh – cơ bản; Tiếng Trung – HSK 4..." className={inputClass} />
                )}
                {noLanguage && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-700">Đã chọn: Không có.</p>}
              </section>

              {/* 6. INTERESTS */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">06. Sở thích</h3>
                <p className="text-sm text-slate-500">Có thể chia sẻ sở thích cá nhân để nhà tuyển dụng hiểu thêm về bạn.</p>
                <textarea rows={2} value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Ví dụ: đọc sách, thể thao, du lịch..." className={inputClass} />
              </section>

              {/* 7. CAREER OBJECTIVE */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  07. Mục tiêu nghề nghiệp <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-slate-500">Viết ngắn gọn, rõ ràng về định hướng và mục tiêu công việc.</p>
                <textarea required rows={3} value={careerObjective} onChange={(e) => setCareerObjective(e.target.value)} placeholder="Nhập mục tiêu nghề nghiệp của bạn..." className={inputClass} />
              </section>

              {/* 8. EDUCATION */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  08. Học vấn <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-slate-500">Ghi tên trường, chuyên ngành, thời gian học và xếp loại (nếu phù hợp).</p>
                <textarea required rows={3} value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Tên trường – Chuyên ngành – Thời gian – Xếp loại..." className={inputClass} />
              </section>

              {/* 9. CERTIFICATES */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">09. Chứng chỉ</h3>
                <p className="text-sm text-slate-500">Ví dụ: Chứng chỉ kế toán tổng hợp, MOS...</p>
                <textarea rows={2} value={certificates} onChange={(e) => setCertificates(e.target.value)} placeholder="Liệt kê chứng chỉ (nếu có)..." className={inputClass} />
              </section>

              {/* 10. AWARDS */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">10. Giải thưởng</h3>
                <p className="text-sm text-slate-500">Các giải thưởng liên quan đến học tập, chuyên môn hoặc công việc (nếu có).</p>
                <textarea rows={2} value={awards} onChange={(e) => setAwards(e.target.value)} placeholder="Liệt kê giải thưởng (nếu có)..." className={inputClass} />
              </section>

              {/* 11. REFEREE */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">11. Người tham chiếu</h3>
                <p className="text-sm text-slate-500">Không bắt buộc. Có thể ghi họ tên, chức vụ, đơn vị và thông tin liên hệ nếu người tham chiếu đã đồng ý.</p>
                <textarea rows={2} value={referee} onChange={(e) => setReferee(e.target.value)} placeholder="Thông tin người tham chiếu (nếu có)..." className={inputClass} />
              </section>

              {/* 12. CONSENT */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">
                  12. Xác nhận đồng ý chia sẻ CV{" "}
                  <span className="text-sm font-normal text-slate-500">(Không bắt buộc)</span>
                </h3>
                <label className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm leading-6 text-slate-600">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-sky-600"
                  />
                  <span>
                    Tôi xác nhận thông tin cung cấp là chính xác và đồng ý để CVISION lưu trữ, xử lý, sử dụng và chia sẻ hồ sơ CV của tôi với doanh nghiệp/nhà tuyển dụng nhằm mục đích tư vấn và kết nối việc làm.
                  </span>
                </label>
              </section>

              {/* SERVICE DETAILS */}
              <section className="space-y-4">
                <h3 className="border-b border-sky-100 pb-3 text-lg font-extrabold text-sky-700">Thông tin gói dịch vụ</h3>
                <div>
                  <label className={labelClass}>Chọn gói dịch vụ *</label>
                  <select required value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
                    {servicePackages.map((item) => (
                      <option key={item.name} value={item.name}>{item.name} – {item.price}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Yêu cầu bổ sung (không bắt buộc)</label>
                  <textarea rows={3} value={extraRequest} onChange={(e) => setExtraRequest(e.target.value)} placeholder="Bạn muốn CVISION hỗ trợ thêm điều gì?" className={inputClass} />
                </div>
              </section>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 font-extrabold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Đang gửi thông tin..." : "Gửi thông tin đăng ký →"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                Các thông tin có dấu * là bắt buộc. Thông tin được gửi đến hệ thống tiếp nhận của CVISION.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-sky-100 bg-white px-5 py-7 text-center">
        <p className="font-extrabold tracking-wide text-sky-700">CVISION</p>
        <p className="mt-2 text-sm text-slate-400">© 2026 – Kết nối nhân tài và doanh nghiệp.</p>
      </footer>
    </main>
  );
}
