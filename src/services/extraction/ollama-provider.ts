import { ExtractionContext, ExtractionProvider, RawExtractionResult, RawExtractionSchema } from "./types";
import { buildExtractionPrompt } from "./prompt-builder";

export class OllamaProvider implements ExtractionProvider {
  readonly name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
    this.model = process.env.OLLAMA_MODEL || "llama3.1:8b";
  }

  async extract(context: ExtractionContext): Promise<RawExtractionResult> {
    const { systemPrompt, userPrompt } = buildExtractionPrompt(context);
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: combinedPrompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });
    } catch (err: any) {
      throw new Error(`Failed to connect to Ollama at ${this.baseUrl}. Ensure Ollama is running locally.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.response) {
      throw new Error("Ollama returned an empty response field.");
    }

    const parsedJson = JSON.parse(data.response);
    const validated = RawExtractionSchema.parse(parsedJson);
    return validated;
  }
}
