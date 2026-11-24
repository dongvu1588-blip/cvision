
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

type ExtractedJob = {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  requirements: string;
};

function cleanText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function parseAIResponse(raw: string): unknown {
  let text = raw.trim();

  // Bỏ Markdown code fence nếu Gemini trả về
  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    // Nếu có nội dung thừa bên ngoài JSON, lấy phần JSON
    const startObject = text.indexOf("{");
    const startArray = text.indexOf("[");

    let start = -1;

    if (startObject === -1) start = startArray;
    else if (startArray === -1) start = startObject;
    else start = Math.min(startObject, startArray);

    if (start === -1) {
      throw new Error("AI không trả về dữ liệu JSON hợp lệ.");
    }

    const opening = text[start];
    const closing = opening === "{" ? "}" : "]";
    const end = text.lastIndexOf(closing);

    if (end <= start) {
      throw new Error("Dữ liệu AI trả về chưa đầy đủ.");
    }

    return JSON.parse(text.slice(start, end + 1));
  }
}

function normalizeJobs(data: unknown): ExtractedJob[] {
  let items: unknown[] = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    const objectData = data as Record<string, unknown>;

    if (Array.isArray(objectData.jobs)) {
      items = objectData.jobs;
    } else if (Array.isArray(objectData.positions)) {
      items = objectData.positions;
    } else {
      items = [data];
    }
  }

  return items
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item)
    )
    .map((item) => ({
      title: cleanText(
        item.title ?? item.position ?? item.job_title ?? item.jobTitle
      ),
      company: cleanText(
        item.company ?? item.company_name ?? item.companyName ?? item.employer
      ),
      location: cleanText(
        item.location ?? item.job_location ?? item.work_location
      ),
      salary: cleanText(
        item.salary ?? item.salary_range ?? item.income
      ),
      description: cleanText(
        item.description ?? item.job_description ?? item.responsibilities
      ),
      requirements: cleanText(
        item.requirements ?? item.job_requirements ?? item.qualifications
      ),
    }))
    .filter(
      (job) =>
        job.title ||
        job.description ||
        job.requirements
    );
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Chưa cấu hình GEMINI_API_KEY trên máy chủ." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Vui lòng tải lên file PDF JD." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: "File PDF đang trống." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File PDF không được vượt quá 15 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Kiểm tra chữ ký PDF, tránh chỉ dựa vào tên file
    if (buffer.subarray(0, 5).toString() !== "%PDF-") {
      return NextResponse.json(
        { success: false, error: "File tải lên không phải PDF hợp lệ." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Bạn là chuyên gia tuyển dụng và phân tích tài liệu JD.

Hãy đọc toàn bộ file PDF được gửi kèm và trích xuất tất cả vị trí tuyển dụng có trong tài liệu.

YÊU CẦU:
1. Một PDF có thể chứa một hoặc nhiều vị trí tuyển dụng.
2. Mỗi vị trí phải được tách thành một phần tử riêng.
3. Không tự suy đoán hoặc bịa thông tin.
4. Thông tin không có trong tài liệu thì để chuỗi rỗng.
5. Giữ nguyên tên chức danh, tên doanh nghiệp và thuật ngữ kỹ thuật.
6. Nội dung mô tả và yêu cầu tuyển dụng trình bày bằng tiếng Việt nếu tài liệu có thể dịch được.
7. Không gộp nhiều vị trí khác nhau thành một vị trí.
8. Nếu không tìm thấy vị trí tuyển dụng, trả về mảng jobs rỗng.

CHỈ TRẢ VỀ JSON theo cấu trúc:

{
  "jobs": [
    {
      "title": "",
      "company": "",
      "location": "",
      "salary": "",
      "description": "",
      "requirements": ""
    }
  ]
}
`;

    const base64File = buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64File,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;

    if (!responseText) {
      return NextResponse.json(
        { success: false, error: "AI không trả về kết quả. Vui lòng thử lại." },
        { status: 502 }
      );
    }

    const parsed = parseAIResponse(responseText);
    const jobs = normalizeJobs(parsed);

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          success: true,
          jobs: [],
          message: "Không tìm thấy thông tin vị trí tuyển dụng trong PDF.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      jobs,
      count: jobs.length,
      message: `AI đã đọc và trích xuất ${jobs.length} vị trí tuyển dụng.`,
    });
  } catch (error) {
    console.error("AI READ JD ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Lỗi không xác định.";

    return NextResponse.json(
      {
        success: false,
        error: `Không thể phân tích PDF: ${message}`,
      },
      { status: 500 }
    );
  }
}
