
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = "gemini" | "openai";

type AIResult = {
  text: string;
  provider: AIProvider;
};

const GEMINI_PRIMARY_MODEL = "gemini-3.5-flash-lite";
const GEMINI_BACKUP_MODEL = "gemini-3.8-flash";

const OPENAI_MODEL =
  process.env.OPENAI_FALLBACK_MODEL || "gpt-4.1-mini";

const GEMINI_MAX_ATTEMPTS = 2;

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

// Chuẩn hóa và kiểm tra JSON
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

// Xác định lỗi có thể thử lại
function isTemporaryError(error: unknown) {
  const details = errorInfo(error);

  const rateLimited =
    details.status === 429 ||
    /RESOURCE_EXHAUSTED|RATE LIMIT/i.test(details.message);

  if (rateLimited) return false;

  return (
    [408, 500, 502, 503, 504].includes(details.status) ||
    /UNAVAILABLE|OVERLOADED|HIGH DEMAND|TIMEOUT|ECONNRESET|ETIMEDOUT/i.test(
      details.message
    )
  );
}

// Gọi một model Gemini cụ thể
async function callGeminiModel(
  model: string,
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
            {
              text: prompt,
            },
          ],
        },
      ]
    : prompt;

  let lastError: unknown;

  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[CVISION] Gemini model=${model}, attempt=${attempt + 1}/${GEMINI_MAX_ATTEMPTS}`
      );

      const response = await ai.models.generateContent({
        model,
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
      lastError = error;

      const details = errorInfo(error);

      console.error("[CVISION] Gemini failed:", {
        model,
        attempt: attempt + 1,
        status: details.status,
        message: details.message,
      });

      if (
        attempt < GEMINI_MAX_ATTEMPTS - 1 &&
        isTemporaryError(error)
      ) {
        await wait(1500 * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("GEMINI_UNAVAILABLE");
}

// Gọi Gemini chính, sau đó Gemini dự phòng
async function callGeminiWithBackup(
  prompt: string,
  pdf?: {
    base64: string;
    fileName: string;
  }
): Promise<string> {
  try {
    const result = await callGeminiModel(
      GEMINI_PRIMARY_MODEL,
      prompt,
      pdf
    );

    console.log("[CVISION] Primary Gemini succeeded.");

    return result;
  } catch (primaryError) {
    console.warn(
      "[CVISION] Primary Gemini unavailable. Switching to backup Gemini.",
      errorInfo(primaryError)
    );
  }

  try {
    const result = await callGeminiModel(
      GEMINI_BACKUP_MODEL,
      prompt,
      pdf
    );

    console.log("[CVISION] Backup Gemini succeeded.");

    return result;
  } catch (backupError) {
    console.error(
      "[CVISION] Backup Gemini unavailable.",
      errorInfo(backupError)
    );

    throw backupError;
  }
}

// Gọi OpenAI dự phòng cuối cùng
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

  console.log(
    "[CVISION] Switching to OpenAI fallback:",
    OPENAI_MODEL
  );

  try {
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
  } catch (error) {
    const details = errorInfo(error);

    console.error("[CVISION] OpenAI fallback failed:", {
      status: details.status,
      message: details.message,
    });

    if (
      details.status === 429 &&
      /credit_balance_exhausted|insufficient_quota|no credits remaining/i.test(
        details.message
      )
    ) {
      throw new Error("OPENAI_CREDITS_EXHAUSTED");
    }

    throw error;
  }
}

// Bộ điều phối AI: Gemini chính -> Gemini dự phòng -> OpenAI
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
      const text = await callGeminiWithBackup(prompt, pdf);

      return {
        text,
        provider: "gemini",
      };
    } catch (error) {
      geminiError = error;

      console.warn(
        "[CVISION] Both Gemini models unavailable. Activating OpenAI fallback."
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
    if (
      error instanceof Error &&
      error.message === "OPENAI_CREDITS_EXHAUSTED"
    ) {
      throw error;
    }

    console.error("[CVISION] All AI providers failed.");

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
