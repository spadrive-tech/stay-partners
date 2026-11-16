import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN = "X-Lovable-AIG-Run-ID";

export interface DescribeInput {
  title: string;
  type: string;
  city?: string | undefined;
  address?: string | undefined;
  nightly_rate?: number | undefined;
  units?: number | undefined;
  amenities?: string[] | undefined;
  house_rules?: string | undefined;
  notes?: string | undefined;
  tone: string;
}

export async function generateDescription(input: DescribeInput): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("The writing assistant isn't set up yet.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (url, init) => {
      const h = new Headers(init?.headers);
      if (runId) h.set(RUN, runId);
      const r = await fetch(url, { ...init, headers: h });
      runId ??= r.headers.get(RUN) ?? undefined;
      return r;
    },
  });
  const details = [
    `Title: ${input.title}`,
    `Type: ${input.type === "hotel_room" ? "Hotel room" : "Shortlet apartment"}`,
    input.city && `City: ${input.city}`,
    input.address && `Area/address: ${input.address}`,
    input.nightly_rate && `Nightly rate: ₦${input.nightly_rate.toLocaleString("en-NG")}`,
    input.units && `Units: ${input.units}`,
    input.amenities?.length && `Amenities: ${input.amenities.join(", ")}`,
    input.house_rules && `House rules: ${input.house_rules}`,
    input.notes && `Host notes: ${input.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    system:
      "You write listing descriptions for Kiataka Stays, a Nigerian accommodation marketplace. Write 120-180 words in 2-3 short paragraphs of plain text (no headings, no markdown, no emojis). Use only facts provided — never invent amenities, distances or landmarks. Do not mention the price or full street address. Use British/Nigerian English.",
    prompt: `Tone: ${input.tone}\n\nProperty details:\n${details}`,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = (await result.text).trim();
  if (!text) throw new Error("No description was generated. Please try again.");
  return text;
}
