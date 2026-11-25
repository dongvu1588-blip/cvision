
import { NextRequest, NextResponse } from "next/server";
import { generateJobMatchJson } from "@/lib/ai-provider";

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

    if (start < 0 || end <= start) {
      throw new Error("AI không trả về JSON hợp lệ.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
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

    const validJobs = jobs.filter(
      (job: any) =>
        job &&
        job.id !== null &&
        job.id !== undefined
    );

    if (validJobs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có công việc với ID hợp lệ." },
        { status: 400 }
      );
    }

    const prompt = `
Bạn là chuyên gia tuyển dụng và tư vấn nghề nghiệp của CVISION.

Hãy phân tích hồ sơ ứng viên và so sánh với danh sách việc làm.

THÔNG TIN ỨNG VIÊN:
${JSON.stringify(candidate, null, 2)}

DANH SÁCH VIỆC LÀM:
${JSON.stringify(validJobs, null, 2)}

YÊU CẦU:
1. Chỉ đề xuất công việc có trong danh sách.
2. Chỉ đề xuất công việc có trạng thái "Đang tuyển".
3. Đánh giá dựa trên kinh nghiệm, kỹ năng, học vấn, ngoại ngữ và địa điểm.
4. Không tự bịa thông tin.
5. match_score là số nguyên từ 0 đến 100.
6. Nêu lý do phù hợp và yêu cầu còn thiếu.
7. Sắp xếp từ phù hợp nhất đến thấp nhất.
8. Tối đa 5 công việc.
9. job_id phải khớp chính xác với ID công việc.

CHỈ TRẢ VỀ JSON HỢP LỆ:
{
  "summary": "Nhận xét tổng quan về ứng viên",
  "recommendations": [
    {
      "job_id": "ID công việc chính xác",
      "job_title": "Tên vị trí",
      "match_score": 85,
      "reasons": ["Lý do phù hợp"],
      "missing_skills": ["Kỹ năng còn thiếu"],
      "recommendation": "Đánh giá và đề xuất"
    }
  ]
}
`;

    const aiResult = await generateJobMatchJson(prompt);
    const result = parseJson(aiResult.text);

    if (!result || typeof result !== "object") {
      throw new Error("Kết quả phân tích không hợp lệ.");
    }

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
              Math.min(
                100,
                Math.round(Number(item.match_score) || 0)
              )
            ),
            reasons: toStringArray(item.reasons),
            missing_skills: toStringArray(item.missing_skills),
            recommendation:
              typeof item.recommendation === "string"
                ? item.recommendation
                : "",
          }))
          .sort(
            (a: any, b: any) =>
              b.match_score - a.match_score
          )
          .slice(0, 5)
      : [];

    console.log("[CVISION] Job matching completed:", {
      provider: aiResult.provider,
      recommendations: recommendations.length,
    });

    return NextResponse.json({
      success: true,
      provider: aiResult.provider,
      result: {
        summary:
          typeof result.summary === "string"
            ? result.summary
            : "",
        recommendations,
      },
    });
  } catch (error) {
    console.error("[CVISION] Job matching error:", error);

    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "OPENAI_FALLBACK_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          success: false,
          error: "Gemini đang gặp sự cố nhưng chưa cấu hình OpenAI dự phòng.",
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
          error: "Gemini và OpenAI đều chưa thể phân tích việc làm. Vui lòng thử lại sau.",
          error_code: message,
        },
        { status: 503 }
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
