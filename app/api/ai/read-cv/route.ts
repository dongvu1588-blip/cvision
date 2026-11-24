
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
              text: `Bạn là chuyên gia tuyển dụng nhân sự và dịch thuật CV quốc tế.

NHIỆM VỤ:
Đọc toàn bộ file CV PDF, trích xuất chính xác thông tin ứng viên và chuyển nội dung sang TIẾNG VIỆT.

QUY TẮC NGÔN NGỮ:
1. Tất cả nội dung mô tả phải được viết bằng tiếng Việt.
2. Nếu CV viết bằng tiếng Trung, dịch tiếng Trung sang tiếng Việt.
3. Nếu CV viết bằng tiếng Anh, dịch tiếng Anh sang tiếng Việt.
4. Nếu CV viết bằng ngôn ngữ khác, cũng dịch sang tiếng Việt.
5. Chức danh công việc phải được dịch sang tiếng Việt.
6. Mô tả kinh nghiệm làm việc phải được dịch đầy đủ, dễ hiểu.
7. Kỹ năng chuyên môn và thuật ngữ kỹ thuật phải được dịch chính xác.
8. Học vấn, chuyên ngành, bằng cấp và địa điểm phải được chuyển sang tiếng Việt nếu xác định được.
9. Tên người phải giữ nguyên theo CV gốc, không tự ý dịch hoặc đổi tên.
10. Tên công ty, thương hiệu và mã sản phẩm giữ nguyên tên gốc.
11. Các thuật ngữ chuyên ngành như PE, PQE, PMC, SMT, AOI, MES, PLC, FAI, QCP, 8D, LabVIEW được giữ nguyên khi cần thiết; có thể giải thích bằng tiếng Việt.
12. Không để nguyên đoạn văn tiếng Trung hoặc tiếng Anh trong các trường mô tả nếu có thể dịch chính xác.

QUY TẮC TRÍCH XUẤT:
1. Không tự suy đoán hoặc bịa thông tin.
2. Không tìm thấy thông tin thì trả về null.
3. languages và skills phải là mảng chuỗi.
4. languages phải ghi tên ngôn ngữ bằng tiếng Việt, ví dụ: Tiếng Trung, Tiếng Anh, Tiếng Nhật.
5. skills phải chứa các kỹ năng đã được dịch sang tiếng Việt khi có thể.
6. experience phải tóm tắt quá trình làm việc bằng tiếng Việt, giữ đúng mốc thời gian.
7. latest_position phải là chức danh tiếng Việt, có thể kèm thuật ngữ viết tắt chuyên ngành.
8. latest_company phải giữ nguyên tên công ty theo CV.
9. birth_year chỉ lấy năm sinh nếu CV thể hiện rõ.
10. phone và email phải giữ nguyên chính xác.

QUY TẮC ĐỘ CHÍNH XÁC:
- Không tự suy luận trình độ ngoại ngữ nếu CV không nêu.
- Không tự thêm kinh nghiệm, kỹ năng hoặc bằng cấp.
- Nếu không chắc chắn về bản dịch chuyên ngành, giữ nguyên thuật ngữ gốc.
- Không nhầm địa chỉ với quê quán hoặc địa điểm làm việc.
- Không tự đổi tên riêng của ứng viên Trung Quốc hoặc quốc gia khác sang tên Việt Nam.

CHỈ TRẢ VỀ JSON HỢP LỆ.
Không Markdown, không giải thích bên ngoài JSON.

CẤU TRÚC:
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

TRƯỚC KHI TRẢ KẾT QUẢ:
Kiểm tra lại toàn bộ các trường.
Đảm bảo nội dung mô tả đã được chuyển sang tiếng Việt.
Đảm bảo không làm sai lệch thông tin gốc.
Đảm bảo JSON hợp lệ.`,
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
