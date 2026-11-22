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
  "w-full rounded-lg border border-slate-300 bg-white p-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
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
      // Khi chọn không có ngoại ngữ, tự lưu đúng nội dung yêu cầu.
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
        // Nếu lưu bản ghi thất bại, xóa ảnh vừa tải lên để tránh file rác.
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
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">C</div>
            <span className="text-2xl font-extrabold text-emerald-700">CVISION</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-emerald-700">← Trang chủ</Link>
        </div>
      </header>

      <section className="bg-emerald-800 px-5 py-14 text-center text-white">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-200">CVISION Career Services</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">Dịch vụ CV chuyên nghiệp</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-emerald-100 md:text-base">
          Cung cấp thông tin để CVISION hỗ trợ xây dựng hồ sơ chuyên nghiệp và phù hợp với mục tiêu nghề nghiệp của bạn.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-10">
          <h2 className="text-2xl font-extrabold">Bảng giá dịch vụ CV</h2>
          <p className="mt-2 text-slate-500">Chọn gói phù hợp trước khi gửi yêu cầu.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {servicePackages.map((item) => (
              <button key={item.name} type="button" onClick={() => { setServiceType(item.name); setSuccess(false); setErrorMessage(""); }}
                className={`rounded-2xl border p-5 text-left transition ${serviceType === item.name ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
                <span className="text-lg font-bold">{item.name}</span>
                <span className="mt-3 block text-2xl font-extrabold text-emerald-700">{item.price}</span>
                <span className="mt-3 block text-sm leading-6 text-slate-600">{item.description}</span>
                <span className="mt-4 block text-xs font-bold text-emerald-700">{serviceType === item.name ? "✓ Đã chọn gói" : "Chọn gói này"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-9">
          <h2 className="text-2xl font-extrabold">Phiếu thông tin hồ sơ CV</h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-slate-500">
            Vui lòng điền đầy đủ các mục có dấu <span className="text-red-600">*</span>. Thông tin sẽ được gửi trực tiếp đến hệ thống CVISION.
          </p>

          <div className="mb-6 rounded-xl bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">Gói dịch vụ đang chọn</p>
            <p className="mt-1 font-bold text-emerald-900">{selectedPackage.name}</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-700">{selectedPackage.price}</p>
            <p className="mt-1 text-sm text-emerald-800">{selectedPackage.description}</p>
          </div>

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Đăng ký thành công! CVISION đã nhận được thông tin và ảnh của bạn. Chúng tôi sẽ liên hệ theo số điện thoại bạn cung cấp.
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{errorMessage}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">1. Ảnh CV <span className="text-red-600">*</span></h3>
              <p className="text-sm leading-6 text-slate-500">Chọn ảnh nghiêm túc, gọn gàng, thần thái tự tin. Trang phục lịch sự, ưu tiên áo có cổ hoặc phong cách công sở. Ảnh rõ nét sẽ giúp CV chuyên nghiệp hơn.</p>
              <input id="cv-request-photo" type="file" accept="image/jpeg,image/png,image/webp" required
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className={inputClass} />
              <p className="text-xs text-slate-400">Chấp nhận JPG, PNG hoặc WEBP; dung lượng tối đa 5 MB.</p>
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">2. Thông tin cá nhân <span className="text-red-600">*</span></h3>
              <p className="text-sm text-slate-500">Vui lòng nhập tên đầy đủ bằng chữ in hoa để hồ sơ được trình bày thống nhất.</p>
              <div><label className={labelClass}>Họ và tên (IN HOA) *</label><input required value={fullName} onChange={(e) => setFullName(e.target.value.toLocaleUpperCase("vi-VN"))} placeholder="NGUYỄN VĂN A" className={inputClass} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={labelClass}>Ngày sinh *</label><input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Số điện thoại *</label><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nhập số điện thoại" className={inputClass} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className={labelClass}>Email *</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" className={inputClass} /></div>
                <div><label className={labelClass}>Địa chỉ hiện tại *</label><input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Phường/xã, tỉnh/thành phố" className={inputClass} /></div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">3. Kinh nghiệm làm việc <span className="text-red-600">*</span></h3>
              <p className="text-sm leading-6 text-slate-500">Sắp xếp từ công việc gần nhất; viết ngắn gọn, đúng trọng tâm. Nếu đã có kinh nghiệm, ưu tiên 2–3 công việc liên quan. Nếu chưa có, có thể ghi thực tập hoặc công việc thể hiện khả năng thích nghi và trách nhiệm.</p>
              <textarea required rows={5} value={workExperience} onChange={(e) => setWorkExperience(e.target.value)} placeholder="Tên công ty – Vị trí – Thời gian làm việc&#10;Mô tả nhiệm vụ và kết quả đạt được..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">4. Kỹ năng <span className="text-red-600">*</span></h3>
              <p className="text-sm text-slate-500">Chỉ liệt kê kỹ năng phù hợp với ngành nghề ứng tuyển, ví dụ: PLC, Microsoft Office, AutoCAD, 2D, 3D...</p>
              <textarea required rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Nhập các kỹ năng của bạn..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">5. Ngoại ngữ <span className="text-red-600">*</span></h3>
              <p className="text-sm text-slate-500">Có thể ghi tiếng Anh, Trung, Hàn, Nhật... kèm trình độ. Nếu không có, vui lòng chọn “Không có”.</p>
              <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={noLanguage} onChange={(e) => { setNoLanguage(e.target.checked); if (e.target.checked) setLanguages("Không có"); else if (languages === "Không có") setLanguages(""); }} className="h-4 w-4 accent-emerald-700" /> Không có ngoại ngữ</label>
              {!noLanguage && <textarea required rows={2} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Ví dụ: Tiếng Anh – cơ bản; Tiếng Trung – HSK 4..." className={inputClass} />}
              {noLanguage && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Đã chọn: Không có.</p>}
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">6. Sở thích</h3>
              <p className="text-sm text-slate-500">Có thể chia sẻ sở thích cá nhân để nhà tuyển dụng hiểu thêm về bạn.</p>
              <textarea rows={2} value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Ví dụ: đọc sách, thể thao, du lịch..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">7. Mục tiêu nghề nghiệp <span className="text-red-600">*</span></h3>
              <p className="text-sm text-slate-500">Viết ngắn gọn, rõ ràng về định hướng và mục tiêu công việc.</p>
              <textarea required rows={3} value={careerObjective} onChange={(e) => setCareerObjective(e.target.value)} placeholder="Nhập mục tiêu nghề nghiệp của bạn..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">8. Học vấn <span className="text-red-600">*</span></h3>
              <p className="text-sm text-slate-500">Ghi tên trường, chuyên ngành, thời gian học và xếp loại (nếu phù hợp).</p>
              <textarea required rows={3} value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Tên trường – Chuyên ngành – Thời gian – Xếp loại..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">9. Chứng chỉ</h3>
              <p className="text-sm text-slate-500">Ví dụ: Chứng chỉ kế toán tổng hợp, MOS...</p>
              <textarea rows={2} value={certificates} onChange={(e) => setCertificates(e.target.value)} placeholder="Liệt kê chứng chỉ (nếu có)..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">10. Giải thưởng</h3>
              <p className="text-sm text-slate-500">Các giải thưởng liên quan đến học tập, chuyên môn hoặc công việc (nếu có).</p>
              <textarea rows={2} value={awards} onChange={(e) => setAwards(e.target.value)} placeholder="Liệt kê giải thưởng (nếu có)..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">11. Người tham chiếu</h3>
              <p className="text-sm text-slate-500">Không bắt buộc. Có thể ghi họ tên, chức vụ, đơn vị và thông tin liên hệ nếu người tham chiếu đã đồng ý.</p>
              <textarea rows={2} value={referee} onChange={(e) => setReferee(e.target.value)} placeholder="Thông tin người tham chiếu (nếu có)..." className={inputClass} />
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">
                12. Xác nhận đồng ý chia sẻ CV <span className="text-sm font-normal text-slate-500">(Không bắt buộc)</span>
              </h3>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" />
                <span>Tôi xác nhận thông tin cung cấp là chính xác và đồng ý để CVISION lưu trữ, xử lý, sử dụng và chia sẻ hồ sơ CV của tôi với doanh nghiệp/nhà tuyển dụng nhằm mục đích tư vấn và kết nối việc làm.</span>
              </label>
            </section>

            <section className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-bold text-emerald-800">Thông tin gói dịch vụ</h3>
              <div><label className={labelClass}>Chọn gói dịch vụ *</label><select required value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>{servicePackages.map((item) => <option key={item.name} value={item.name}>{item.name} – {item.price}</option>)}</select></div>
              <div><label className={labelClass}>Yêu cầu bổ sung (không bắt buộc)</label><textarea rows={3} value={extraRequest} onChange={(e) => setExtraRequest(e.target.value)} placeholder="Bạn muốn CVISION hỗ trợ thêm điều gì?" className={inputClass} /></div>
            </section>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Đang gửi thông tin..." : "Gửi thông tin đăng ký"}
            </button>
            <p className="text-center text-xs leading-5 text-slate-400">Các thông tin có dấu * là bắt buộc. Thông tin được gửi đến hệ thống tiếp nhận của CVISION.</p>
          </form>
        </div>
      </section>

      <footer className="border-t bg-white px-5 py-6 text-center text-sm text-slate-400">CVISION © 2026 – Kết nối nhân tài và doanh nghiệp.</footer>
    </main>
  );
}
