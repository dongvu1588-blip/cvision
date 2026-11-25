
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MODEL = "gemini-3.5-flash-lite";

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tự động thử lại khi Gemini quá tải hoặc lỗi tạm thời
async function generateWithRetry(
  ai: GoogleGenAI,
  contents: any,
  config: any
): Promise<any> {
  // 1 lần gọi ban đầu + tối đa 4 lần thử lại
  const delays = [2000, 5000, 10000, 15000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      let errorDetails = '';
      try {
        errorDetails = JSON.stringify(error);
      } catch {
        errorDetails = message;
      }

      const combinedError = `${message} ${errorDetails}`;
      const retryable =
        /\b(408|429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|high demand|overloaded|timeout|ECONNRESET|ETIMEDOUT/i.test(
          combinedError
        );

      if (!retryable || attempt === delays.length) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 1000);
      const delay = delays[attempt] + jitter;
      console.warn(
        `Gemini gặp lỗi tạm thời. Thử lại lần ${attempt + 1}/${delays.length} sau ${delay}ms.`
      );
      await wait(delay);
    }
  }

  throw new Error('Gemini hiện không thể xử lý yêu cầu.');
}

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

    if (start === -1 || end <= start) {
      throw new Error("AI không trả về JSON hợp lệ.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCandidate(data: unknown): Candidate {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dữ liệu ứng viên AI trả về không hợp lệ.");
  }

  const item = data as Record<string, unknown>;

  const birthYearRaw = item.birth_year;
  const birthYear =
    typeof birthYearRaw === "number"
      ? birthYearRaw
      : typeof birthYearRaw === "string"
        ? Number(birthYearRaw)
        : null;

  return {
    full_name: toText(item.full_name),
    birth_year:
      birthYear !== null &&
      Number.isInteger(birthYear) &&
      birthYear >= 1900 &&
      birthYear <= new Date().getFullYear()
        ? birthYear
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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa cấu hình GEMINI_API_KEY trên máy chủ.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng chọn file CV PDF.",
        },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ chấp nhận file PDF.",
        },
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
        {
          success: false,
          error: "File tải lên không phải PDF hợp lệ.",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64 = bytes.toString("base64");

    const extractionPrompt = `
Bạn là chuyên gia tuyển dụng quốc tế và dịch thuật hồ sơ nhân sự.

Nhiệm vụ: Đọc toàn bộ CV PDF và trích xuất thông tin ứng viên thành JSON.

QUY TẮC BẮT BUỘC VỀ NGÔN NGỮ:
- Tất cả nội dung mô tả phải được viết bằng TIẾNG VIỆT.
- CV tiếng Trung: phải dịch nội dung sang tiếng Việt.
- CV tiếng Anh: phải dịch nội dung sang tiếng Việt.
- CV bằng ngôn ngữ khác: cũng phải dịch sang tiếng Việt.
- Không được chép nguyên đoạn tiếng Trung hoặc tiếng Anh vào các trường mô tả.
- Chức danh công việc phải dịch sang tiếng Việt.
- Mô tả kinh nghiệm phải dịch đầy đủ, rõ ràng, giữ đúng ý nghĩa và mốc thời gian.
- Học vấn, chuyên ngành, bằng cấp phải dịch sang tiếng Việt.
- Kỹ năng chuyên môn phải dịch sang tiếng Việt khi có thể.
- Địa chỉ, tỉnh thành và địa danh nước ngoài phải chuyển sang cách gọi tiếng Việt phù hợp nếu xác định được.
- languages phải ghi tên ngôn ngữ bằng tiếng Việt, ví dụ: Tiếng Trung, Tiếng Anh, Tiếng Nhật.
- Không được nhầm ngôn ngữ của CV với ngoại ngữ mà ứng viên biết.

CÁC TRƯỜNG PHẢI GIỮ NGUYÊN:
- full_name: giữ nguyên họ tên theo CV gốc, không tự đổi sang tên Việt.
- latest_company: giữ nguyên tên công ty, thương hiệu.
- phone: giữ nguyên số điện thoại.
- email: giữ nguyên địa chỉ email.
- Mã kỹ thuật và từ viết tắt như PE, PQE, PMC, SMT, AOI, MES, PLC, FAI, QCP, 8D, BMS phải giữ nguyên khi cần thiết.

QUY TẮC:
- Không tự bịa hoặc suy đoán thông tin.
- Không có thông tin thì trả về null.
- languages và skills luôn là mảng chuỗi.
- birth_year chỉ lấy năm sinh được ghi rõ.
- latest_position là chức danh gần nhất đã dịch sang tiếng Việt.
- latest_company giữ nguyên tên công ty gốc.
- Không tự thêm trình độ ngoại ngữ, kỹ năng, bằng cấp hoặc kinh nghiệm.

Chỉ trả về JSON hợp lệ, không Markdown, không giải thích.

Cấu trúc:
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

Hãy tự kiểm tra và dịch toàn bộ trường mô tả trước khi trả kết quả.
`;

    // Chỉ gọi Gemini một lần: vừa đọc CV vừa dịch nội dung sang tiếng Việt.
    // Gộp hai lượt giúp giảm số request cho mỗi CV.
    const extractionResponse = await generateWithRetry(
      ai,
      [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64,
              },
            },
            { text: extractionPrompt },
          ],
        },
      ],
      {
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    );

    if (!extractionResponse.text) {
      throw new Error("AI không đọc được nội dung CV.");
    }

    const candidate = normalizeCandidate(
      parseJson(extractionResponse.text)
    );

    return NextResponse.json({
      success: true,
      candidate,
      message: "AI đã đọc CV và dịch nội dung sang tiếng Việt.",
    });
  } catch (error) {
    console.error("AI read CV error:", error);

    const message =
      error instanceof Error ? error.message : String(error);

    let errorDetails = "";
    try {
      errorDetails = JSON.stringify(error);
    } catch {
      errorDetails = message;
    }

    const isOverloaded =
      /\b(408|429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|high demand|overloaded|timeout|ECONNRESET|ETIMEDOUT/i.test(
        `${message} ${errorDetails}`
      );

    return NextResponse.json(
      {
        success: false,
        error: isOverloaded
          ? "Gemini đang bận hoặc đã chạm giới hạn yêu cầu. Hệ thống đã thử lại nhưng chưa thành công. Vui lòng đợi một chút rồi thử lại. Nếu lỗi tiếp tục, hãy kiểm tra hạn mức Gemini API trong Google AI Studio."
          : `Không thể đọc và dịch CV: ${message}`,
      },
      {
        status: isOverloaded ? 503 : 500,
      }
    );
  }
}
