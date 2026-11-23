import OpenAI from "openai";
import { ExtractionContext, ExtractionProvider, RawExtractionResult, RawExtractionSchema } from "./types";
import { buildExtractionPrompt } from "./prompt-builder";

export class OpenAIProvider implements ExtractionProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the server.");
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async extract(context: ExtractionContext): Promise<RawExtractionResult> {
    const { systemPrompt, userPrompt } = buildExtractionPrompt(context);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsedJson = JSON.parse(rawContent);
    const validated = RawExtractionSchema.parse(parsedJson);
    return validated;
  }
}
