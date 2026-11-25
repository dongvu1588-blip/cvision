
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = "gemini" | "openai";

type AIResult = {
  text: string;
  provider: AIProvider;
};

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const OPENAI_MODEL =
  process.env.OPENAI_FALLBACK_MODEL || "gpt-6-luna";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorInfo(error: unknown) {
  const err = error as any;

  return {
    status: Number(
      err?.status ??
      err?.statusCode ??
      err?.response?.status ??
      0
    ),
    message: String(err?.message || error || ""),
  };
}

// Kiểm tra JSON trước khi chấp nhận kết quả của nhà cung cấp
function validateJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    JSON.parse(cleaned);
    return;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("AI_RESPONSE_INVALID_JSON");
    }

    JSON.parse(cleaned.slice(start, end + 1));
  }
}

function normalizeJsonText(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("AI_RESPONSE_INVALID_JSON");
    }

    const result = cleaned.slice(start, end + 1);
    JSON.parse(result);
    return result;
  }
}

// Gọi Gemini trước
async function callGemini(
  prompt: string,
  pdf?: {
    base64: string;
    fileName: string;
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = pdf
    ? [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdf.base64,
              },
            },
            { text: prompt },
          ],
        },
      ]
    : prompt;

  // Tối đa 2 lần gọi Gemini.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      console.log(`[CVISION] Gemini attempt ${attempt + 1}/2`);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      });

      const text = response.text || "";

      if (!text.trim()) {
        throw new Error("AI_RESPONSE_EMPTY");
      }

      return normalizeJsonText(text);
    } catch (error) {
      const details = errorInfo(error);

      console.error("[CVISION] Gemini failed:", {
        status: details.status,
        message: details.message,
      });

      const rateLimited =
        details.status === 429 ||
        /RESOURCE_EXHAUSTED|RATE LIMIT/i.test(details.message);

      const temporary =
        [408, 500, 502, 503, 504].includes(details.status) ||
        /UNAVAILABLE|OVERLOADED|TIMEOUT|ECONNRESET|ETIMEDOUT/i.test(
          details.message
        );

      if (attempt === 0 && temporary && !rateLimited) {
        await wait(1500);
        continue;
      }

      throw error;
    }
  }

  throw new Error("GEMINI_UNAVAILABLE");
}

// Gọi OpenAI dự phòng
async function callOpenAI(
  prompt: string,
  pdf?: {
    base64: string;
    fileName: string;
  }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_FALLBACK_NOT_CONFIGURED");
  }

  const client = new OpenAI({
    apiKey,
    timeout: 45000,
    maxRetries: 0,
  });

  const input = pdf
    ? [
        {
          role: "user" as const,
          content: [
            {
              type: "input_file" as const,
              filename: pdf.fileName,
              file_data: `data:application/pdf;base64,${pdf.base64}`,
              detail: "auto" as const,
            },
            {
              type: "input_text" as const,
              text: prompt,
            },
          ],
        },
      ]
    : prompt;

  console.log("[CVISION] Switching to OpenAI fallback:", OPENAI_MODEL);

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input,
    text: {
      format: {
        type: "json_object",
      },
    },
    max_output_tokens: 8192,
    store: false,
  });

  const text = response.output_text || "";

  if (!text.trim()) {
    throw new Error("OPENAI_RESPONSE_EMPTY");
  }

  return normalizeJsonText(text);
}

// Bộ điều phối Gemini -> OpenAI
async function generateWithFallback(
  prompt: string,
  pdf?: {
    base64: string;
    fileName: string;
  }
): Promise<AIResult> {
  let geminiError: unknown;

  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGemini(prompt, pdf);

      return {
        text,
        provider: "gemini",
      };
    } catch (error) {
      geminiError = error;

      console.warn(
        "[CVISION] Gemini unavailable. Activating OpenAI fallback."
      );
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    if (geminiError) {
      throw new Error("OPENAI_FALLBACK_NOT_CONFIGURED");
    }

    throw new Error("AI_PROVIDER_KEYS_MISSING");
  }

  try {
    const text = await callOpenAI(prompt, pdf);

    return {
      text,
      provider: "openai",
    };
  } catch (error) {
    console.error("[CVISION] OpenAI fallback failed:", error);

    throw new Error("ALL_AI_PROVIDERS_FAILED");
  }
}

// API đọc và dịch PDF
export async function generateCvJson(
  prompt: string,
  base64: string,
  fileName: string
): Promise<AIResult> {
  return generateWithFallback(prompt, {
    base64,
    fileName,
  });
}

// API đối chiếu việc làm
export async function generateJobMatchJson(
  prompt: string
): Promise<AIResult> {
  return generateWithFallback(prompt);
}
