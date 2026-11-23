import OpenAI from "openai";
import { ExtractionContext, ExtractionProvider, RawExtractionResult, RawExtractionSchema } from "./types";
import { buildExtractionPrompt } from "./prompt-builder";

export class LMStudioProvider implements ExtractionProvider {
  readonly name = "lmstudio";
  private client: OpenAI;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = (
      process.env.LMSTUDIO_BASE_URL ||
      process.env.LM_STUDIO_BASE_URL ||
      "http://127.0.0.1:1234/v1"
    ).replace(/\/$/, "");

    this.model = (
      process.env.LMSTUDIO_MODEL ||
      process.env.LM_STUDIO_MODEL ||
      ""
    ).trim();

    this.client = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: process.env.LMSTUDIO_API_KEY || "lm-studio",
    });
  }

  async extract(context: ExtractionContext): Promise<RawExtractionResult> {
    const { systemPrompt, userPrompt } = buildExtractionPrompt(context);

    // If model is not explicitly configured, try discovering the loaded model from LM Studio
    let modelToUse = this.model;
    if (!modelToUse) {
      try {
        const modelList = await this.client.models.list();
        if (modelList.data && modelList.data.length > 0) {
          modelToUse = modelList.data[0].id;
        }
      } catch {
        // Fallback if model listing fails or LM Studio accepts generic identifier
        modelToUse = "default";
      }
      if (!modelToUse) {
        modelToUse = "default";
      }
    }

    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: modelToUse,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      // Check connection refusal
      if (
        err?.code === "ECONNREFUSED" ||
        errMsg.includes("ECONNREFUSED") ||
        errMsg.includes("fetch failed")
      ) {
        throw new Error(
          `Failed to connect to LM Studio at ${this.baseUrl}. Ensure LM Studio local server is running.`
        );
      }

      // Some local models or LM Studio versions might reject response_format: { type: "json_object" }
      try {
        completion = await this.client.chat.completions.create({
          model: modelToUse,
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
      } catch (retryErr: any) {
        throw new Error(
          `LM Studio request failed: ${retryErr.message || errMsg}`
        );
      }
    }

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("LM Studio returned an empty response.");
    }

    const cleanedContent = this.extractJson(rawContent);

    try {
      const parsedJson = JSON.parse(cleanedContent);
      const validated = RawExtractionSchema.parse(parsedJson);
      return validated;
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse extraction output from LM Studio as valid JSON: ${parseError.message}`
      );
    }
  }

  private extractJson(content: string): string {
    const trimmed = content.trim();
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      return markdownMatch[1].trim();
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return trimmed;
  }
}
