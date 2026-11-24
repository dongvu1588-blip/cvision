
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const data = await request.formData();
    const file = data.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Vui lòng chọn file CV PDF." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file PDF." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File PDF phải lớn hơn 0 và không vượt quá 10 MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
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
              text: `Bạn là chuyên gia đọc và phân tích CV tuyển dụng.

Hãy đọc file CV PDF và trích xuất chính xác thông tin ứng viên.
Không tự suy đoán hoặc bịa thông tin.
Không tìm thấy thông tin thì trả về null.
languages và skills phải là mảng chuỗi.

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
}`,
            },
          ],
        },
      ],
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

    const candidate = JSON.parse(
      cleaned.slice(start, end + 1)
    );

    return NextResponse.json({
      success: true,
      candidate,
    });
  } catch (error) {
    console.error("AI read CV error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể đọc CV. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }
}
