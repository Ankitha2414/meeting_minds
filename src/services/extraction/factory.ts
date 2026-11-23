import { ExtractionProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { OllamaProvider } from "./ollama-provider";
import { LMStudioProvider } from "./lmstudio-provider";

export function getExtractionProvider(): ExtractionProvider {
  const rawProvider = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  const providerType = rawProvider.replace(/[-_\s]/g, "");

  if (providerType === "ollama") {
    return new OllamaProvider();
  }

  if (providerType === "openai") {
    return new OpenAIProvider();
  }

  if (providerType === "lmstudio") {
    return new LMStudioProvider();
  }

  // Automatic fallback: if OPENAI_API_KEY is present, use OpenAI, else default to Ollama
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  return new OllamaProvider();
}
