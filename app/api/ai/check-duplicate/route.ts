
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

type CandidateInfo = {
  id?: string;
  full_name?: string | null;
  name?: string | null;
  birth_year?: number | string | null;
  province?: string | null;
  address?: string | null;
  education?: string | null;
  languages?: string | string[] | null;
  skills?: string | string[] | null;
  experience?: string | null;
  latest_position?: string | null;
  position?: string | null;
  latest_company?: string | null;
  company?: string | null;
};

function cleanText(value: unknown, maxLength = 1500): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ").slice(0, maxLength);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).slice(0, maxLength);
}

function sanitizeCandidate(candidate: CandidateInfo) {
  return {
    id: cleanText(candidate.id, 100),
    full_name: cleanText(candidate.full_name || candidate.name, 200),
    birth_year: cleanText(candidate.birth_year, 10),
    province: cleanText(candidate.province, 150),
    address: cleanText(candidate.address, 250),
    education: cleanText(candidate.education, 300),
    languages: cleanText(candidate.languages, 300),
    skills: cleanText(candidate.skills, 1000),
    experience: cleanText(candidate.experience, 1500),
    latest_position: cleanText(
      candidate.latest_position || candidate.position,
      250
    ),
    latest_company: cleanText(
      candidate.latest_company || candidate.company,
      250
    ),
  };
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

    const candidate = body?.candidate as CandidateInfo;
    const existingCandidates = body?.existingCandidates;

    if (
      !candidate ||
      typeof candidate !== "object" ||
      !Array.isArray(existingCandidates)
    ) {
      return NextResponse.json(
        { error: "Thiếu thông tin để kiểm tra trùng lặp." },
        { status: 400 }
      );
    }

    if (existingCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        duplicates: [],
      });
    }

    // Giới hạn 20 hồ sơ trong mỗi lần kiểm tra.
    const limitedCandidates = existingCandidates
      .filter(
        (item: CandidateInfo) =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          item.id.trim() !== ""
      )
      .slice(0, 20);

    if (limitedCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        duplicates: [],
      });
    }

    // Chỉ gửi thông tin cần thiết cho AI.
    // Không gửi số điện thoại hoặc email.
    const newCandidate = sanitizeCandidate(candidate);

    const oldCandidates = limitedCandidates.map(
      (item: CandidateInfo) => sanitizeCandidate(item)
    );

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `
Bạn là chuyên gia kiểm tra dữ liệu ứng viên của hệ thống CVISION.

NHIỆM VỤ:
So sánh hồ sơ ứng viên mới với danh sách hồ sơ đã tồn tại.
Xác định những hồ sơ có khả năng thuộc cùng một người.

ỨNG VIÊN MỚI:
${JSON.stringify(newCandidate)}

DANH SÁCH ỨNG VIÊN ĐÃ CÓ:
${JSON.stringify(oldCandidates)}

NGUYÊN TẮC PHÂN TÍCH:

1. Không kết luận trùng chỉ vì hai người có cùng họ tên.
2. Chú ý tên có dấu và không dấu, tên viết khác thứ tự hoặc có sai khác nhỏ.
3. So sánh năm sinh, tỉnh thành, địa chỉ và học vấn.
4. So sánh vị trí công việc, công ty từng làm và kinh nghiệm.
5. So sánh kỹ năng và quá trình làm việc nếu có dữ liệu.
6. Không tự suy đoán thông tin không được cung cấp.
7. Không coi hai người là một chỉ vì cùng làm một công ty hoặc cùng vị trí.
8. Chỉ sử dụng ID có trong danh sách ứng viên đã có.
9. Nếu không đủ bằng chứng, không đưa vào danh sách trùng.
10. Không có quyền xóa, sửa hoặc thay đổi dữ liệu ứng viên.

THANG ĐIỂM:

- 85 đến 100: high - Khả năng trùng cao, có nhiều thông tin tương đồng.
- 65 đến 84: medium - Có dấu hiệu tương đồng nhưng cần người kiểm tra.
- Dưới 65: Không đưa vào kết quả.

YÊU CẦU:
- match_score là số nguyên từ 0 đến 100.
- reasons là danh sách lý do cụ thể dựa trên dữ liệu được cung cấp.
- Không tạo ID giả.
- Không trả về hồ sơ không có trong danh sách.

CHỈ TRẢ VỀ JSON THEO CẤU TRÚC:

{
  "duplicates": [
    {
      "candidate_id": "ID hồ sơ đã tồn tại",
      "match_score": 90,
      "level": "high",
      "reasons": [
        "Tên ứng viên tương đồng",
        "Năm sinh giống nhau",
        "Quá trình làm việc có nhiều điểm tương đồng"
      ]
    }
  ]
}
`,
      config: {
        responseMimeType: "application/json",
      },
    });

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

    const result = JSON.parse(cleaned.slice(start, end + 1));

    const validIds = new Set(
      oldCandidates.map((item) => item.id)
    );

    const duplicates = Array.isArray(result.duplicates)
      ? result.duplicates
          .filter(
            (item: {
              candidate_id?: string;
              match_score?: number;
              level?: string;
              reasons?: unknown;
            }) => {
              const score = Number(item.match_score);

              return (
                typeof item.candidate_id === "string" &&
                validIds.has(item.candidate_id) &&
                Number.isFinite(score) &&
                score >= 65 &&
                (item.level === "high" || item.level === "medium")
              );
            }
          )
          .map(
            (item: {
              candidate_id: string;
              match_score: number;
              level: string;
              reasons?: unknown;
            }) => ({
              candidate_id: item.candidate_id,
              match_score: Math.max(
                0,
                Math.min(100, Math.round(Number(item.match_score)))
              ),
              level: item.level,
              reasons: Array.isArray(item.reasons)
                ? item.reasons
                    .filter(
                      (reason: unknown) => typeof reason === "string"
                    )
                    .slice(0, 5)
                : [],
            })
          )
      : [];

    return NextResponse.json({
      success: true,
      duplicates,
    });
  } catch (error) {
    console.error("AI duplicate check error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể kiểm tra CV trùng lặp.",
      },
      { status: 500 }
    );
  }
}
