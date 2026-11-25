
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const MODEL_NAME = "gemini-3.5-flash-lite";
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [2000, 5000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Nhận diện lỗi từ Google GenAI SDK
function getErrorInfo(error: unknown) {
  const err = error as Record<string, any>;

  const message = [
    err?.message,
    err?.status,
    err?.code,
    err?.statusCode,
    err?.cause?.message,
  ]
    .filter(Boolean)
    .join(" ");

  const status = Number(
    err?.status ||
    err?.statusCode ||
    err?.response?.status
  );

  return { message, status };
}

function isTemporaryError(error: unknown): boolean {
  const { message, status } = getErrorInfo(error);

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    /408|429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|HIGH DEMAND|OVERLOADED|RATE LIMIT|TIMEOUT|ECONNRESET|ETIMEDOUT/i.test(
      message
    )
  );
}

// Làm sạch và đọc JSON từ Gemini
function parseJson(raw: string): any {
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

// Chuẩn hóa mảng kết quả
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Chưa cấu hình GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { candidate, jobs } = body;

    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin ứng viên." },
        { status: 400 }
      );
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có tin tuyển dụng để đối chiếu." },
        { status: 400 }
      );
    }

    // Chỉ nhận các tin có ID hợp lệ
    const validJobs = jobs.filter(
      (job: any) =>
        job &&
        job.id !== null &&
        job.id !== undefined
    );

    if (validJobs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Danh sách việc làm không có ID hợp lệ." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Bạn là chuyên gia tuyển dụng và tư vấn nghề nghiệp của CVISION.

Hãy phân tích hồ sơ ứng viên và so sánh với danh sách việc làm được cung cấp.

THÔNG TIN ỨNG VIÊN:
${JSON.stringify(candidate, null, 2)}

DANH SÁCH VIỆC LÀM:
${JSON.stringify(validJobs, null, 2)}

YÊU CẦU:
1. Chỉ đề xuất công việc có trong danh sách được cung cấp.
2. Chỉ đề xuất công việc có trạng thái "Đang tuyển".
3. Đánh giá dựa trên kinh nghiệm, kỹ năng, học vấn, ngoại ngữ và địa điểm.
4. Không tự bịa thông tin ứng viên hoặc yêu cầu công việc.
5. Điểm phù hợp là số nguyên từ 0 đến 100.
6. Nêu rõ lý do phù hợp và những yêu cầu ứng viên còn thiếu.
7. Sắp xếp kết quả từ phù hợp nhất đến thấp nhất.
8. Chỉ trả về tối đa 5 công việc.
9. job_id phải khớp chính xác với ID trong danh sách việc làm.

CHỈ TRẢ VỀ JSON HỢP LỆ:

{
  "summary": "Nhận xét tổng quan về ứng viên",
  "recommendations": [
    {
      "job_id": "ID công việc chính xác",
      "job_title": "Tên vị trí",
      "match_score": 85,
      "reasons": [
        "Lý do phù hợp"
      ],
      "missing_skills": [
        "Kỹ năng hoặc yêu cầu còn thiếu"
      ],
      "recommendation": "Đánh giá và đề xuất"
    }
  ]
}
`;

    // Gọi Gemini có cơ chế retry
    let response: any = null;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(
          `[CVISION] Gemini job-match: ${attempt}/${MAX_ATTEMPTS}`
        );

        response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: 4096,
          },
        });

        break;
      } catch (error) {
        lastError = error;

        console.error(
          `[CVISION] Gemini error attempt ${attempt}:`,
          getErrorInfo(error)
        );

        if (!isTemporaryError(error)) {
          throw error;
        }

        if (attempt === MAX_ATTEMPTS) {
          throw new Error("GEMINI_TEMPORARY_UNAVAILABLE");
        }

        const delay = RETRY_DELAYS[attempt - 1];

        console.log(
          `[CVISION] Retry after ${delay}ms`
        );

        await wait(delay);
      }
    }

    if (!response) {
      throw lastError || new Error("AI không trả về kết quả.");
    }

    const rawText = response.text || "";

    if (!rawText.trim()) {
      throw new Error("Gemini trả về nội dung rỗng.");
    }

    const result = parseJson(rawText);

    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      throw new Error("Cấu trúc kết quả AI không hợp lệ.");
    }

    // Kiểm tra ID công việc
    const validJobIds = new Set(
      validJobs.map((job: any) => String(job.id))
    );

    const recommendations = Array.isArray(result.recommendations)
      ? result.recommendations
          .filter(
            (item: any) =>
              item &&
              item.job_id !== undefined &&
              validJobIds.has(String(item.job_id))
          )
          .map((item: any) => ({
            job_id: String(item.job_id),
            job_title:
              typeof item.job_title === "string"
                ? item.job_title
                : "",
            match_score: Math.max(
              0,
              Math.min(100, Math.round(Number(item.match_score) || 0))
            ),
            reasons: toStringArray(item.reasons),
            missing_skills: toStringArray(item.missing_skills),
            recommendation:
              typeof item.recommendation === "string"
                ? item.recommendation
                : "",
          }))
          .sort((a: any, b: any) => b.match_score - a.match_score)
          .slice(0, 5)
      : [];

    console.log(
      `[CVISION] Job matching completed: ${recommendations.length} recommendations`
    );

    return NextResponse.json({
      success: true,
      result: {
        summary:
          typeof result.summary === "string"
            ? result.summary
            : "",
        recommendations,
      },
    });

  } catch (error) {
    console.error("[CVISION] AI job matching error:", error);

    if (
      error instanceof Error &&
      error.message === "GEMINI_TEMPORARY_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini đang quá tải hoặc giới hạn yêu cầu. CV đã được đọc thành công. Vui lòng thử phân tích lại sau ít phút.",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "30",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể phân tích việc làm phù hợp.",
      },
      { status: 500 }
    );
  }
}
