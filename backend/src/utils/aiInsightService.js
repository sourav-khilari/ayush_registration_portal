import fetch from "node-fetch";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const HF_BASE_URL =
  process.env.HUGGINGFACE_BASE_URL || "https://router.huggingface.co";
const DEFAULT_HF_MODEL =
  process.env.HUGGINGFACE_MODEL || "deepseek-ai/DeepSeek-R1:fastest";
const SAFE_HF_CHAT_MODEL = "deepseek-ai/DeepSeek-R1:fastest";

function sanitizeInput(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function getAIInsight({
  prompt,
  data,
  model = DEFAULT_MODEL,
  temperature = 0.2,
  maxTokens = 700,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const cleanPrompt = sanitizeInput(prompt);
  const cleanData = sanitizeInput(data);

  if (!cleanPrompt) {
    throw new Error("prompt is required");
  }

  if (!cleanData) {
    throw new Error("data is required and must be a non-empty string");
  }

  const systemMessage =
    "You are an expert analysis assistant. Provide concise, actionable insights based only on provided data.";

  const userMessage = `Task/Prompt:\n${cleanPrompt}\n\nInput Data (string):\n${cleanData}`;

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const apiMessage = result?.error?.message || "OpenAI request failed";
    throw new Error(apiMessage);
  }

  const insight = result?.choices?.[0]?.message?.content?.trim();
  if (!insight) {
    throw new Error("No insight returned from OpenAI");
  }

  return {
    insight,
    model: result?.model || model,
    usage: result?.usage || null,
    provider: "openai",
    raw: result,
  };
}

export async function getHuggingFaceInsight({
  prompt,
  data,
  model = DEFAULT_HF_MODEL,
  temperature = 0.2,
  maxTokens = 700,
}) {
  const apiToken = process.env.HUGGINGFACE_API_TOKEN;
  if (!apiToken) {
    throw new Error("HUGGINGFACE_API_TOKEN is not configured");
  }

  const cleanPrompt = sanitizeInput(prompt);
  const cleanData = sanitizeInput(data);

  if (!cleanPrompt) {
    throw new Error("prompt is required");
  }

  if (!cleanData) {
    throw new Error("data is required and must be a non-empty string");
  }

  const chatBase =
    String(HF_BASE_URL).includes("api-inference.huggingface.co")
      ? "https://router.huggingface.co"
      : HF_BASE_URL;

  const systemMessage =
    "You are an expert analysis assistant. Provide concise, actionable insights based only on provided data.";
  const userMessage = `Task/Prompt:\n${cleanPrompt}\n\nInput Data (string):\n${cleanData}`;

  const requestInsight = async (modelId) => {
    const response = await fetch(`${chatBase}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        model: modelId,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      let apiMessage = "Hugging Face request failed";
      if (typeof result?.error === "string") apiMessage = result.error;
      else if (result?.error?.message) apiMessage = result.error.message;
      else if (typeof result?.message === "string") apiMessage = result.message;
      else if (result && typeof result === "object") apiMessage = JSON.stringify(result);

      const error = new Error(apiMessage);
      error.response = result;
      error.status = response.status;
      throw error;
    }

    const insight = String(
      result?.choices?.[0]?.message?.content ||
        result?.choices?.[0]?.text ||
        ""
    ).trim();

    if (!insight) {
      throw new Error("No insight returned from Hugging Face");
    }

    return {
      insight,
      model: modelId,
      usage: null,
      provider: "huggingface",
      raw: result,
    };
  };

  try {
    return await requestInsight(model);
  } catch (error) {
    const errorMessage = String(error?.message || "");
    const isChatModelError =
      errorMessage.toLowerCase().includes("not a chat model") ||
      error?.response?.error?.code === "model_not_supported";

    if (isChatModelError && model !== SAFE_HF_CHAT_MODEL) {
      console.warn(
        `[AI_PROVIDER_WARN] Hugging Face model '${model}' is not chat-compatible. Retrying with '${SAFE_HF_CHAT_MODEL}'.`
      );
      return requestInsight(SAFE_HF_CHAT_MODEL);
    }

    throw error;
  }
}

export async function getAIInsightWithFallback(params) {
  try {
    return await getAIInsight(params);
  } catch (openAiError) {
    console.error("[AI_PROVIDER_ERROR] OpenAI failed:", openAiError?.message || openAiError);
    const hfResult = await getHuggingFaceInsight(params);
    return hfResult;
  }
}

export default getAIInsight;
