
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = "gemini" | "openai";

type AIResult = {
  text: string;
  provider: AIProvider;
};

type FileInput = {
  base64: string;
  fileName: string;
  mimeType: string;
  extractedText?: string;
};

const GEMINI_PRIMARY_MODEL = "gemini-3.5-flash-lite";
const GEMINI_BACKUP_MODEL = "gemini-3.8-flash";

const OPENAI_MODEL =
  process.env.OPENAI_FALLBACK_MODEL || "gpt-4.1-mini";

const MAX_ATTEMPTS = 2;

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

function isRetryableError(error: unknown) {
  const details = errorInfo(error);

  const rateLimit =
    details.status === 429 &&
    /rate.?limit|too many requests|resource_exhausted/i.test(
      details.message
    );

  const temporary =
    [408, 500, 502, 503, 504].includes(details.status) ||
    /UNAVAILABLE|OVERLOADED|HIGH DEMAND|TIMEOUT|ECONNRESET|ETIMEDOUT/i.test(
      details.message
    );

  return rateLimit || temporary;
}

// Gemini hỗ trợ file trực tiếp hoặc nội dung đã được trích xuất.
async function callGeminiModel(
  model: string,
  prompt: string,
  file?: FileInput
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = file
    ? [
        {
          role: "user",
          parts: [
            ...(file.extractedText
              ? [
                  {
                    text: `NỘI DUNG ĐÃ TRÍCH XUẤT TỪ FILE ${file.fileName}:\n\n${file.extractedText}`,
                  },
                ]
              : [
                  {
                    inlineData: {
                      mimeType: file.mimeType,
                      data: file.base64,
                    },
                  },
                ]),
            {
              text: prompt,
            },
          ],
        },
      ]
    : prompt;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[CVISION] Gemini model=${model}, attempt=${attempt + 1}/${MAX_ATTEMPTS}`
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
        attempt < MAX_ATTEMPTS - 1 &&
        isRetryableError(error)
      ) {
        await wait(2000 * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("GEMINI_UNAVAILABLE");
}

// Gemini chính -> Gemini dự phòng.
async function callGeminiWithBackup(
  prompt: string,
  file?: FileInput
): Promise<string> {
  try {
    const result = await callGeminiModel(
      GEMINI_PRIMARY_MODEL,
      prompt,
      file
    );

    console.log("[CVISION] Primary Gemini succeeded.");

    return result;
  } catch (primaryError) {
    console.warn(
      "[CVISION] Primary Gemini unavailable. Switching to backup model.",
      errorInfo(primaryError)
    );
  }

  const result = await callGeminiModel(
    GEMINI_BACKUP_MODEL,
    prompt,
    file
  );

  console.log("[CVISION] Backup Gemini succeeded.");

  return result;
}

// OpenAI dự phòng cuối cùng.
async function callOpenAI(
  prompt: string,
  file?: FileInput
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

  let input: any = prompt;

  if (file) {
    if (file.extractedText) {
      input = [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `NỘI DUNG ĐÃ TRÍCH XUẤT TỪ FILE ${file.fileName}:\n\n${file.extractedText}`,
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ];
    } else if (file.mimeType.startsWith("image/")) {
      input = [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:${file.mimeType};base64,${file.base64}`,
              detail: "high",
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ];
    } else {
      input = [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: file.fileName,
              file_data: `data:${file.mimeType};base64,${file.base64}`,
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ];
    }
  }

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

// Bộ điều phối: Gemini chính -> Gemini dự phòng -> OpenAI.
async function generateWithFallback(
  prompt: string,
  file?: FileInput
): Promise<AIResult> {
  let geminiError: unknown;

  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGeminiWithBackup(prompt, file);

      return {
        text,
        provider: "gemini",
      };
    } catch (error) {
      geminiError = error;

      console.warn(
        "[CVISION] Both Gemini models failed. Activating OpenAI fallback.",
        errorInfo(error)
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
    const text = await callOpenAI(prompt, file);

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

    console.error("[CVISION] OpenAI fallback failed:", error);

    throw new Error("ALL_AI_PROVIDERS_FAILED");
  }
}

// API đọc và dịch CV đa định dạng.
export async function generateCvJson(
  prompt: string,
  base64: string,
  fileName: string,
  mimeType = "application/pdf",
  extractedText?: string
): Promise<AIResult> {
  return generateWithFallback(prompt, {
    base64,
    fileName,
    mimeType,
    extractedText,
  });
}

// API đối chiếu việc làm.
export async function generateJobMatchJson(
  prompt: string
): Promise<AIResult> {
  return generateWithFallback(prompt);
}
