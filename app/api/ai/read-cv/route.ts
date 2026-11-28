import { NextRequest, NextResponse } from "next/server";
import { generateCvJson } from "@/lib/ai-provider";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";


const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TEXT_LENGTH = 120000;

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

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  rtf: "application/rtf",
};

const SUPPORTED_EXTENSIONS = Object.keys(MIME_TYPES);

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function extractRtf(bytes: Buffer) {
  const raw = bytes.toString("latin1");

  return raw
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\line/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\\([{}\\])/g, "$1")
    .trim();
}

async function extractPptx(bytes: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const getNumber = (name: string) =>
        Number(name.match(/slide(\d+)/)?.[1] || 0);

      return getNumber(a) - getNumber(b);
    });

  if (slideFiles.length === 0) {
    throw new Error("Không tìm thấy nội dung slide trong PowerPoint.");
  }

  const slides: string[] = [];

  for (const fileName of slideFiles) {
    const file = zip.file(fileName);
    if (!file) continue;

    const xml = await file.async("text");

    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXml(match[1]))
      .filter(Boolean);

    if (texts.length > 0) {
      slides.push(texts.join(" "));
    }
  }

  return slides
    .map((text, index) => `Slide ${index + 1}:\n${text}`)
    .join("\n\n");
}

async function extractFileText(
  bytes: Buffer,
  extension: string
): Promise<string | null> {
  switch (extension) {
    case "docx": {
      const result = await mammoth.extractRawText({
        buffer: bytes,
      });

      return result.value;
    }

    case "xlsx":
    case "xls": {
      const workbook = XLSX.read(bytes, {
        type: "buffer",
        cellDates: true,
      });

      return workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];

        return (
          `BẢNG: ${sheetName}\n` +
          XLSX.utils.sheet_to_csv(sheet)
        );
      }).join("\n\n");
    }

    case "csv": {
      const workbook = XLSX.read(bytes, {
        type: "buffer",
      });

      return workbook.SheetNames.map((name) =>
        XLSX.utils.sheet_to_csv(workbook.Sheets[name])
      ).join("\n\n");
    }

    case "pptx":
      return extractPptx(bytes);

    case "txt":
      return new TextDecoder("utf-8").decode(bytes);

    case "rtf":
      return extractRtf(bytes);

    case "pdf":
    case "jpg":
    case "jpeg":
    case "png":
    case "webp":
      return null;

    default:
      throw new Error("Định dạng file chưa được hỗ trợ.");
  }
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

    if (start < 0 || end <= start) {
      throw new Error("AI không trả về JSON hợp lệ.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function toText(value: unknown): string | null {
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

function normalizeCandidate(data: unknown): Candidate {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dữ liệu ứng viên không hợp lệ.");
  }

  const item = data as Record<string, unknown>;

  const rawYear = item.birth_year;

  const year =
    typeof rawYear === "number"
      ? rawYear
      : typeof rawYear === "string" && rawYear.trim()
        ? Number(rawYear)
        : null;

  return {
    full_name: toText(item.full_name),

    birth_year:
      year !== null &&
      Number.isInteger(year) &&
      year >= 1900 &&
      year <= new Date().getFullYear()
        ? year
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

const prompt = `
Bạn là chuyên gia tuyển dụng quốc tế và dịch thuật hồ sơ nhân sự.

NHIỆM VỤ:
Đọc toàn bộ nội dung CV được cung cấp từ file PDF, Word, Excel,
PowerPoint, hình ảnh hoặc tài liệu văn bản.

Trích xuất thông tin ứng viên và dịch nội dung mô tả sang TIẾNG VIỆT.

QUY TẮC NGÔN NGỮ:
- Tất cả nội dung mô tả phải viết bằng tiếng Việt.
- CV tiếng Trung, tiếng Anh hoặc ngôn ngữ khác phải được dịch sang tiếng Việt.
- Không chép nguyên đoạn ngoại ngữ vào trường mô tả nếu có thể dịch.
- Dịch chức danh, học vấn, chuyên ngành, kỹ năng và kinh nghiệm.
- Giữ nguyên mốc thời gian, số liệu và thành tích.
- languages ghi tên ngoại ngữ bằng tiếng Việt.
- Không nhầm ngôn ngữ CV với ngoại ngữ ứng viên biết.

CÁC TRƯỜNG PHẢI GIỮ NGUYÊN:
- full_name: họ tên gốc.
- latest_company: tên công ty gốc.
- phone: số điện thoại.
- email: địa chỉ email.
- Giữ nguyên mã PE, PQE, PMC, SMT, AOI, MES, PLC, FAI, QCP, 8D, BMS.

QUY TẮC:
- Không bịa thông tin.
- Không có thông tin thì trả null.
- languages và skills luôn là mảng.
- birth_year chỉ lấy năm sinh ghi rõ.
- latest_position dịch sang tiếng Việt.
- latest_company giữ nguyên tên gốc.
- Không tự suy đoán ngoại ngữ, bằng cấp hoặc kinh nghiệm.

CHỈ TRẢ VỀ JSON HỢP LỆ:
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

Không Markdown, không giải thích ngoài JSON.
`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng chọn file CV.",
        },
        { status: 400 }
      );
    }

    const extension = getExtension(file.name);

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Định dạng chưa hỗ trợ. Vui lòng sử dụng PDF, DOCX, XLSX, XLS, PPTX, JPG, PNG, WEBP, TXT, CSV hoặc RTF.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File phải lớn hơn 0 và không vượt quá 20 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Kiểm tra chữ ký cơ bản cho PDF.
    if (extension === "pdf") {
      if (
        bytes.length < 5 ||
        bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "File PDF không hợp lệ.",
          },
          { status: 400 }
        );
      }
    }

    const mimeType = MIME_TYPES[extension];

    // Trích xuất văn bản với những định dạng Office và văn bản.
    const extractedText = await extractFileText(
      bytes,
      extension
    );

    if (
      extractedText !== null &&
      !extractedText.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy nội dung văn bản trong file.",
        },
        { status: 400 }
      );
    }

    if (extractedText && extractedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: "Nội dung file quá dài. Vui lòng rút gọn tài liệu.",
        },
        { status: 400 }
      );
    }

    const result = await generateCvJson(
      prompt,
      bytes.toString("base64"),
      file.name,
      mimeType,
      extractedText || undefined
    );

    const candidate = normalizeCandidate(
      parseJson(result.text)
    );

    console.log("[CVISION] CV extraction completed:", {
      provider: result.provider,
      candidate: candidate.full_name,
      fileName: file.name,
      extension,
    });

    return NextResponse.json({
      success: true,
      candidate,
      provider: result.provider,
      fileName: file.name,
      fileType: extension,
      message:
        result.provider === "gemini"
          ? "Gemini đã đọc và dịch CV thành công."
          : "AI dự phòng đã đọc và dịch CV thành công.",
    });
  } catch (error) {
    console.error("[CVISION] Read CV error:", error);

    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "OPENAI_FALLBACK_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          success: false,
          error: "Gemini đang gặp sự cố nhưng chưa cấu hình OPENAI_API_KEY.",
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
          error: "Cả Gemini và AI dự phòng đều không thể đọc CV. Vui lòng thử lại sau.",
          error_code: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Không thể đọc CV: ${message}`,
      },
      { status: 500 }
    );
  }
}
