import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const CONSENT_POLICY_VERSION = "1.0";

const CONSENT_TEXT =
  "Tôi đã đọc và đồng ý với Chính sách bảo mật CVISION. Tôi đồng ý để CVISION đọc, phân tích và lưu CV cùng thông tin liên hệ nhằm tư vấn, giới thiệu việc làm và cho phép bộ phận tuyển dụng CVISION liên hệ khi phù hợp.";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  rtf: "application/rtf",
};

function text(value: unknown, maxLength = 5000): string | null {
  if (value === null || value === undefined) return null;

  const result = Array.isArray(value)
    ? value.map((item) => String(item)).join(", ")
    : String(value);

  return result.trim().slice(0, maxLength) || null;
}

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function getSafeFileName(fileName: string): string {
  const extension = getExtension(fileName);
  const originalBase = fileName.slice(0, -(extension.length + 1));

  const safeBase =
    originalBase
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^[_\.]+|[_\.]+$/g, "")
      .slice(-80) || "cv";

  return `${safeBase}.${extension}`;
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;
  let insertedCandidateId: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Máy chủ chưa cấu hình Supabase." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const candidateRaw = formData.get("candidate");

    if (formData.get("consent") !== "true") {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn cần đồng ý với Chính sách bảo mật trước khi gửi CV.",
        },
        { status: 400 }
      );
    }

    if (formData.get("consent_policy_version") !== CONSENT_POLICY_VERSION) {
      return NextResponse.json(
        {
          success: false,
          error: "Phiên bản chính sách không hợp lệ. Vui lòng tải lại trang.",
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || typeof candidateRaw !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Thiếu file CV hoặc thông tin ứng viên.",
        },
        { status: 400 }
      );
    }

    const extension = getExtension(file.name);
    const contentType = MIME_TYPES[extension];

    if (!contentType) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Định dạng chưa được hỗ trợ. Vui lòng sử dụng PDF, DOCX, XLSX, XLS, PPTX, JPG, JPEG, PNG, WEBP, TXT, CSV hoặc RTF.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File CV phải lớn hơn 0 và không vượt quá 20 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Kiểm tra chữ ký đối với một số định dạng phổ biến.
    // Không dùng file.type do trình duyệt cung cấp làm căn cứ duy nhất.
    if (
      extension === "pdf" &&
      (bytes.length < 5 ||
        bytes.subarray(0, 5).toString("ascii") !== "%PDF-")
    ) {
      return NextResponse.json(
        { success: false, error: "Nội dung file không đúng định dạng PDF." },
        { status: 400 }
      );
    }

    if (
      ["jpg", "jpeg"].includes(extension) &&
      !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    ) {
      return NextResponse.json(
        { success: false, error: "Nội dung file không đúng định dạng JPG/JPEG." },
        { status: 400 }
      );
    }

    if (
      extension === "png" &&
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    ) {
      return NextResponse.json(
        { success: false, error: "Nội dung file không đúng định dạng PNG." },
        { status: 400 }
      );
    }

    if (
      extension === "webp" &&
      (bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
        bytes.subarray(8, 12).toString("ascii") !== "WEBP")
    ) {
      return NextResponse.json(
        { success: false, error: "Nội dung file không đúng định dạng WEBP." },
        { status: 400 }
      );
    }

    let candidate: Record<string, unknown>;

    try {
      candidate = JSON.parse(candidateRaw);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Thông tin ứng viên không đúng định dạng.",
        },
        { status: 400 }
      );
    }

    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return NextResponse.json(
        { success: false, error: "Thông tin ứng viên không hợp lệ." },
        { status: 400 }
      );
    }

    const fullName = text(candidate.full_name, 200);

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          error: "AI chưa đọc được họ tên. Vui lòng kiểm tra lại CV.",
        },
        { status: 400 }
      );
    }

    const safeFileName = getSafeFileName(file.name);

    uploadedPath =
      `public-ai/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("candidate-cvs")
      .upload(uploadedPath, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Không tải được CV lên kho lưu trữ: ${uploadError.message}`
      );
    }

    const birthYearRaw = text(candidate.birth_year, 10);
    const birthYear = birthYearRaw ? Number(birthYearRaw) : null;

    const payload = {
      full_name: fullName,
      phone: text(candidate.phone, 50),
      email: text(candidate.email, 255),
      address: text(candidate.address, 500),
      province: text(candidate.province, 150),
      birth_year:
        birthYear !== null &&
        Number.isInteger(birthYear) &&
        birthYear >= 1900 &&
        birthYear <= new Date().getFullYear()
          ? birthYear
          : null,
      education: text(candidate.education, 1000),
      languages: text(candidate.languages, 2000),
      skills: text(candidate.skills, 5000),
      experience: text(candidate.experience, 10000),
      latest_position: text(
        candidate.latest_position || candidate.position,
        300
      ),
      latest_company: text(
        candidate.latest_company || candidate.company,
        300
      ),
      cv_url: uploadedPath,
      photo_url: null,
      source: "Public AI CV",
      status: "valid",
      uploaded_by: null,
    };

    const { data, error: insertError } = await supabase
      .from("candidates")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      throw new Error(
        `Không lưu được hồ sơ ứng viên: ${insertError.message}`
      );
    }

    insertedCandidateId = String(data.id);

    const { error: consentError } = await supabase
      .from("candidate_consents")
      .insert({
        candidate_id: data.id,
        consent_type: "public_cv_submission",
        policy_version: CONSENT_POLICY_VERSION,
        consent_text: CONSENT_TEXT,
        consented_at: new Date().toISOString(),
        source: "ai-career",
      });

    if (consentError) {
      throw new Error(
        `Không ghi nhận được xác nhận đồng ý: ${consentError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      candidate_id: data.id,
      fileName: file.name,
      fileType: extension,
      message: "CV đã được gửi về CVISION.",
    });
  } catch (error) {
    console.error("Public CV submission error:", error);

    if (insertedCandidateId) {
      await supabase
        .from("candidates")
        .delete()
        .eq("id", insertedCandidateId);
    }

    if (uploadedPath) {
      await supabase.storage
        .from("candidate-cvs")
        .remove([uploadedPath])
        .catch(() => undefined);
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể gửi CV về CVISION. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }
}
