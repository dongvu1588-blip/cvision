
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trong môi trường." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const message = body.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    ) {
      return NextResponse.json(
        { error: "Tin nhắn không hợp lệ hoặc quá dài." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents:
        "Bạn là trợ lý AI của CVISION, nền tảng tuyển dụng và dịch vụ CV tại Việt Nam. " +
        "Hãy trả lời bằng tiếng Việt, thân thiện, dễ hiểu và hữu ích. " +
        "Không tự bịa thông tin tuyển dụng hoặc doanh nghiệp.\n\n" +
        "Câu hỏi của người dùng: " +
        message.trim(),
    });

    return NextResponse.json({
      success: true,
      reply: response.text || "Xin lỗi, AI chưa tạo được câu trả lời.",
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return NextResponse.json(
      { error: "Không thể kết nối Gemini. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
