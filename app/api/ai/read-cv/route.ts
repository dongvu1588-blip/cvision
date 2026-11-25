
import { NextRequest, NextResponse } from "next/server";
import { generateCvJson } from "@/lib/ai-provider";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Candidate = {
  full_name: string | null;
  birth_year: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  education: string | null;
  languages: string[];
  skills: string[];
  experience: string | null;
  latest_position: string | null;
  latest_company: string | null;
};

function parseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("AI không trả về JSON hợp lệ.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function toText(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function normalizeCandidate(data: unknown): Candidate {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dữ liệu ứng viên không hợp lệ.");
  }

  const item = data as Record<string, unknown>;

  const rawYear = item.birth_year;

  const year =
    typeof rawYear === "number"
      ? rawYear
      : typeof rawYear === "string" && rawYear.trim()
        ? Number(rawYear)
        : null;

  return {
    full_name: toText(item.full_name),

    birth_year:
      year !== null &&
      Number.isInteger(year) &&
      year >= 1900 &&
      year <= new Date().getFullYear()
        ? year
        : null,

    phone: toText(item.phone),
    email: toText(item.email),
    address: toText(item.address),
    province: toText(item.province),
    education: toText(item.education),
    languages: toStringArray(item.languages),
    skills: toStringArray(item.skills),
    experience: toText(item.experience),
    latest_position: toText(item.latest_position),
    latest_company: toText(item.latest_company),
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn file CV PDF." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { success: false, error: "Chỉ chấp nhận file PDF." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File PDF phải lớn hơn 0 và không vượt quá 10 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (
      bytes.length < 5 ||
      bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      return NextResponse.json(
        { success: false, error: "File PDF không hợp lệ." },
        { status: 400 }
      );
    }

    const prompt = `
Bạn là chuyên gia tuyển dụng quốc tế và dịch thuật hồ sơ nhân sự.

NHIỆM VỤ:
Đọc toàn bộ CV PDF, trích xuất thông tin ứng viên và dịch nội dung mô tả sang TIẾNG VIỆT.

QUY TẮC NGÔN NGỮ:
- Tất cả nội dung mô tả phải viết bằng tiếng Việt.
- CV tiếng Trung, tiếng Anh hoặc ngôn ngữ khác phải được dịch sang tiếng Việt.
- Không chép nguyên đoạn ngoại ngữ vào trường mô tả nếu có thể dịch.
- Dịch chức danh, học vấn, chuyên ngành, kỹ năng và kinh nghiệm.
- Giữ nguyên mốc thời gian, số liệu và thành tích.
- languages ghi tên ngoại ngữ bằng tiếng Việt.
- Không nhầm ngôn ngữ CV với ngoại ngữ ứng viên biết.

CÁC TRƯỜNG PHẢI GIỮ NGUYÊN:
- full_name: họ tên gốc.
- latest_company: tên công ty gốc.
- phone: số điện thoại.
- email: địa chỉ email.
- Giữ nguyên mã PE, PQE, PMC, SMT, AOI, MES, PLC, FAI, QCP, 8D, BMS.

QUY TẮC:
- Không bịa thông tin.
- Không có thông tin thì trả null.
- languages và skills luôn là mảng.
- birth_year chỉ lấy năm sinh ghi rõ.
- latest_position dịch sang tiếng Việt.
- latest_company giữ nguyên tên gốc.
- Không tự suy đoán ngoại ngữ, bằng cấp hoặc kinh nghiệm.

CHỈ TRẢ VỀ JSON HỢP LỆ:
{
  "full_name": null,
  "birth_year": null,
  "phone": null,
  "email": null,
  "address": null,
  "province": null,
  "education": null,
  "languages": [],
  "skills": [],
  "experience": null,
  "latest_position": null,
  "latest_company": null
}

Không Markdown, không giải thích ngoài JSON.
`;

    const result = await generateCvJson(
      prompt,
      bytes.toString("base64"),
      file.name
    );

    const candidate = normalizeCandidate(
      parseJson(result.text)
    );

    console.log("[CVISION] CV extraction completed:", {
      provider: result.provider,
      candidate: candidate.full_name,
    });

    return NextResponse.json({
      success: true,
      candidate,
      provider: result.provider,
      message:
        result.provider === "gemini"
          ? "Gemini đã đọc và dịch CV thành công."
          : "AI dự phòng đã đọc và dịch CV thành công.",
    });
  } catch (error) {
    console.error("[CVISION] Read CV error:", error);

    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "OPENAI_FALLBACK_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          success: false,
          error: "Gemini đang gặp sự cố nhưng chưa cấu hình OPENAI_API_KEY.",
          error_code: message,
        },
        { status: 503 }
      );
    }

    if (message === "AI_PROVIDER_KEYS_MISSING") {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa cấu hình API Key cho các nhà cung cấp AI.",
          error_code: message,
        },
        { status: 500 }
      );
    }

    if (message === "ALL_AI_PROVIDERS_FAILED") {
      return NextResponse.json(
        {
          success: false,
          error: "Cả Gemini và AI dự phòng đều không thể đọc CV. Vui lòng thử lại sau.",
          error_code: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Không thể đọc CV: ${message}`,
      },
      { status: 500 }
    );
  }
}
