import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateDescription } from "./describe.server";

const schema = z.object({
  title: z.string().min(1).max(200),
  type: z.string().max(40),
  city: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  nightly_rate: z.number().optional(),
  units: z.number().optional(),
  amenities: z.array(z.string().max(60)).max(30).optional(),
  house_rules: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  tone: z.string().max(40),
});

export const describeListing = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    try {
      return { text: await generateDescription(data), error: null as string | null };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      const msg =
        status === 429
          ? "The writing assistant is busy. Please wait a moment and try again."
          : status === 402
            ? "AI credits have run out for this workspace."
            : e instanceof Error && !status
              ? e.message
              : "Couldn't generate a description right now.";
      return { text: "", error: msg };
    }
  });
