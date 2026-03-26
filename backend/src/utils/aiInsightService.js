import fetch from "node-fetch";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "GPT‑4.1.mini";
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function sanitizeInput(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function getAIInsight({
  prompt,
  data,
  model = "DEFAULT_MODEL",
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
    raw: result,
  };
}

export default getAIInsight;
