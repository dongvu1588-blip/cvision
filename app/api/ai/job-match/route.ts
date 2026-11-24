
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const MODEL_NAME = "gemini-3.5-flash-lite";
const MAX_ATTEMPTS = 3;

function isTemporaryError(error: unknown): boolean {
  const err = error as {
    status?: number;
    code?: number | string;
    message?: string;
  };

  const message = String(err?.message || "").toUpperCase();
  const status = Number(err?.status || err?.code);

  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("HIGH DEMAND") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("429") ||
    message.includes("RATE LIMIT")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { candidate, jobs } = body;

    if (!candidate || typeof candidate !== "object") {
      return NextResponse.json(
        { error: "Thiếu thông tin ứng viên." },
        { status: 400 }
      );
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { error: "Không có tin tuyển dụng để đối chiếu." },
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
${JSON.stringify(jobs, null, 2)}

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

CHỈ TRẢ VỀ JSON HỢP LỆ theo cấu trúc:
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

    // TỰ ĐỘNG THỬ LẠI KHI GEMINI QUÁ TẢI
    let response;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(
          `AI job matching: lần thử ${attempt}/${MAX_ATTEMPTS}`
        );

        response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
        });

        break;
      } catch (error) {
        lastError = error;

        console.error(
          `Gemini job matching lỗi lần ${attempt}:`,
          error
        );

        if (!isTemporaryError(error)) {
          throw error;
        }

        if (attempt === MAX_ATTEMPTS) {
          throw new Error("GEMINI_TEMPORARY_UNAVAILABLE");
        }

        // Chờ 2 giây, sau đó 4 giây trước khi thử lại
        await wait(attempt * 2000);
      }
    }

    if (!response) {
      throw lastError || new Error("AI không trả về kết quả.");
    }

    const rawText = response.text || "";

    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("AI không trả về JSON hợp lệ.");
    }

    const result = JSON.parse(
      cleaned.slice(start, end + 1)
    );

    // Chỉ giữ lại những công việc thực sự tồn tại trong danh sách
    const validJobIds = new Set(
      jobs.map((job: { id: string }) => job.id)
    );

    const recommendations = Array.isArray(result.recommendations)
      ? result.recommendations
          .filter(
            (item: { job_id?: string }) =>
              item.job_id && validJobIds.has(item.job_id)
          )
          .slice(0, 5)
      : [];

    return NextResponse.json({
      success: true,
      result: {
        summary: result.summary || "",
        recommendations,
      },
    });
  } catch (error) {
    console.error("AI job matching error:", error);

    if (
      error instanceof Error &&
      error.message === "GEMINI_TEMPORARY_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          error:
            "Máy chủ Gemini đang quá tải. Hệ thống đã thử lại 3 lần nhưng chưa thành công. CV của bạn đã được đọc; hãy nhấn phân tích lại sau ít phút.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể phân tích việc làm phù hợp.",
      },
      { status: 500 }
    );
  }
}
