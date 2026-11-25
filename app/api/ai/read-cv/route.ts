
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MODEL = "gemini-3.5-flash-lite";
const MAX_ATTEMPTS = 3;

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

// Lấy thông tin lỗi từ Google GenAI SDK
function getGeminiError(error: unknown) {
  const err = error as any;

  const status = Number(
    err?.status ??
    err?.statusCode ??
    err?.response?.status ??
    err?.error?.code ??
    0
  );

  const message = [
    err?.message,
    err?.status,
    err?.code,
    err?.response?.statusText,
    err?.error?.message,
  ]
    .filter(Boolean)
    .join(" ");

  return { status, message };
}

// Kiểm tra lỗi có thể thử lại
function isTemporaryError(error: unknown): boolean {
  const { status, message } = getGeminiError(error);

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    /408|429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|HIGH DEMAND|OVERLOADED|RATE LIMIT|TIMEOUT|ECONNRESET|ETIMEDOUT/i.test(
      message
    )
  );
}

// Gọi Gemini với tối đa 3 lần thử
async function generateWithRetry(
  ai: GoogleGenAI,
  contents: any,
  config: any
): Promise<any> {
  const delays = [2000, 5000];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[CVISION] Gemini read-cv: lần ${attempt + 1}/${MAX_ATTEMPTS}`
      );

      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config,
      });
    } catch (error) {
      const details = getGeminiError(error);

      console.error("[CVISION] Gemini read-cv error:", {
        attempt: attempt + 1,
        status: details.status,
        message: details.message,
      });

      if (!isTemporaryError(error)) {
        throw error;
      }

      if (attempt === MAX_ATTEMPTS - 1) {
        if (
          details.status === 429 ||
          /RESOURCE_EXHAUSTED|RATE LIMIT/i.test(details.message)
        ) {
          throw new Error("GEMINI_QUOTA_EXCEEDED");
        }

        throw new Error("GEMINI_TEMPORARY_UNAVAILABLE");
      }

      const jitter = Math.floor(Math.random() * 500);
      const delay = delays[attempt] + jitter;

      console.log(`[CVISION] Thử lại sau ${delay}ms`);

      await wait(delay);
    }
  }

  throw new Error("GEMINI_TEMPORARY_UNAVAILABLE");
}

// Phân tích JSON do Gemini trả về
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
  if (value === null || value === undefined) {
    return null;
  }

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

// Chuẩn hóa dữ liệu ứng viên
function normalizeCandidate(data: unknown): Candidate {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error("Dữ liệu ứng viên AI trả về không hợp lệ.");
  }

  const item = data as Record<string, unknown>;

  const birthYearRaw = item.birth_year;

  const birthYear =
    typeof birthYearRaw === "number"
      ? birthYearRaw
      : typeof birthYearRaw === "string" &&
          birthYearRaw.trim()
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

// API ĐỌC VÀ DỊCH CV
export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra API Key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Chưa cấu hình GEMINI_API_KEY trên máy chủ.",
          error_code: "MISSING_API_KEY",
        },
        { status: 500 }
      );
    }

    // 2. Nhận file PDF
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng chọn file CV PDF.",
          error_code: "MISSING_FILE",
        },
        { status: 400 }
      );
    }

    // 3. Kiểm tra định dạng
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ chấp nhận file PDF.",
          error_code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      );
    }

    // 4. Kiểm tra dung lượng
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File PDF phải lớn hơn 0 và không vượt quá 10 MB.",
          error_code: "INVALID_FILE_SIZE",
        },
        { status: 400 }
      );
    }

    // 5. Đọc dữ liệu PDF
    const bytes = Buffer.from(await file.arrayBuffer());

    if (
      bytes.length < 5 ||
      bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "File tải lên không phải PDF hợp lệ.",
          error_code: "INVALID_PDF",
        },
        { status: 400 }
      );
    }

    console.log("[CVISION] Bắt đầu đọc CV:", {
      fileName: file.name,
      fileSize: file.size,
    });

    const ai = new GoogleGenAI({ apiKey });
    const base64 = bytes.toString("base64");

    // 6. Prompt đọc và dịch CV trong một lần gọi
    const extractionPrompt = `
Bạn là chuyên gia tuyển dụng quốc tế và dịch thuật hồ sơ nhân sự.

NHIỆM VỤ:
Đọc toàn bộ CV PDF, trích xuất thông tin ứng viên và dịch nội dung mô tả sang TIẾNG VIỆT.

I. QUY TẮC NGÔN NGỮ

- Tất cả nội dung mô tả phải viết bằng tiếng Việt.
- CV tiếng Trung phải dịch sang tiếng Việt.
- CV tiếng Anh phải dịch sang tiếng Việt.
- CV bằng ngôn ngữ khác cũng phải dịch sang tiếng Việt.
- Không chép nguyên đoạn tiếng Trung hoặc tiếng Anh vào trường mô tả nếu có thể dịch được.
- Dịch chức danh, học vấn, chuyên ngành, kỹ năng và kinh nghiệm.
- Giữ nguyên các mốc thời gian, số liệu, thành tích và nội dung công việc.
- languages phải ghi tên ngoại ngữ bằng tiếng Việt.
- Không nhầm ngôn ngữ trình bày CV với ngoại ngữ ứng viên biết.

II. CÁC TRƯỜNG PHẢI GIỮ NGUYÊN

- full_name: giữ nguyên họ tên theo CV gốc.
- latest_company: giữ nguyên tên công ty.
- phone: giữ nguyên số điện thoại.
- email: giữ nguyên địa chỉ email.
- Các mã chuyên ngành như PE, PQE, PMC, SMT, AOI, MES, PLC, FAI, QCP, 8D, BMS được giữ nguyên khi cần thiết.

III. QUY TẮC TRÍCH XUẤT

- Không tự bịa hoặc suy đoán thông tin.
- Không có thông tin thì trả về null.
- languages và skills luôn là mảng chuỗi.
- birth_year chỉ lấy năm sinh được ghi rõ.
- latest_position là chức danh gần nhất đã dịch sang tiếng Việt.
- latest_company giữ nguyên tên công ty gốc.
- Không tự thêm ngoại ngữ, kỹ năng, bằng cấp hoặc kinh nghiệm.
- Không nhầm số điện thoại với năm sinh.
- Không tự suy luận trình độ ngoại ngữ từ ngôn ngữ CV.

IV. CẤU TRÚC JSON BẮT BUỘC

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

CHỈ TRẢ VỀ MỘT JSON HỢP LỆ.
Không Markdown, không code fence, không giải thích bên ngoài JSON.

Hãy kiểm tra lại dữ liệu trước khi trả kết quả.
`;

    // 7. Gọi Gemini một lần để đọc và dịch CV
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
            {
              text: extractionPrompt,
            },
          ],
        },
      ],
      {
        temperature: 0.1,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      }
    );

    // 8. Kiểm tra phản hồi
    const rawText = extractionResponse.text || "";

    if (!rawText.trim()) {
      throw new Error("AI không trả về nội dung CV.");
    }

    // 9. Chuyển JSON thành dữ liệu ứng viên
    const parsedData = parseJson(rawText);
    const candidate = normalizeCandidate(parsedData);

    console.log("[CVISION] Đọc CV thành công:", {
      fullName: candidate.full_name,
      province: candidate.province,
    });

    // 10. Trả kết quả về frontend
    return NextResponse.json({
      success: true,
      candidate,
      message: "AI đã đọc CV và dịch nội dung sang tiếng Việt.",
    });

  } catch (error) {
    console.error("[CVISION] AI read CV error:", error);

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    // Lỗi hết quota hoặc giới hạn API
    if (message === "GEMINI_QUOTA_EXCEEDED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API đã chạm giới hạn sử dụng. Vui lòng kiểm tra quota và billing trong Google AI Studio.",
          error_code: "GEMINI_QUOTA_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Lỗi máy chủ Google quá tải
    if (message === "GEMINI_TEMPORARY_UNAVAILABLE") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Máy chủ Gemini đang quá tải hoặc tạm thời không khả dụng. Vui lòng thử lại sau ít phút.",
          error_code: "GEMINI_TEMPORARY_UNAVAILABLE",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "30",
          },
        }
      );
    }

    // Lỗi JSON hoặc lỗi xử lý khác
    return NextResponse.json(
      {
        success: false,
        error: `Không thể đọc và dịch CV: ${message}`,
        error_code: "GEMINI_READ_CV_ERROR",
      },
      { status: 500 }
    );
  }
}
