import type { z } from "zod";

const INVALID = "Ugyldig input.";

/** Parse with Zod; throw generic Error for any validation failure (no field leaks). */
export function parseOrThrow<S extends z.ZodType<unknown>>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(INVALID);
  return r.data as z.infer<S>;
}
