/**
 * Zod schemas for parameter validation
 */

import { z } from "zod";

export const SequencerParametersSchema = z.object({
  updateFrequency: z
    .number()
    .min(150, "Update frequency must be at least 1000ms")
    .max(60000, "Update frequency must not exceed 60000ms")
    .int("Update frequency must be an integer"),

  spreadRange: z
    .object({
      min: z
        .number()
        .min(0, "Min spread must be at least 0 bps")
        .max(10000, "Min spread must not exceed 10000 bps")
        .int("Min spread must be an integer"),

      max: z
        .number()
        .min(0, "Max spread must be at least 0 bps")
        .max(10000, "Max spread must not exceed 10000 bps")
        .int("Max spread must be an integer"),
    })
    .refine((data) => data.max >= data.min, {
      message: "Max spread must be greater than or equal to min spread",
    }),

  correlationFactor: z
    .number()
    .min(0.0, "Correlation factor must be at least 0.0")
    .max(1.0, "Correlation factor must not exceed 1.0"),
});

export type ValidatedParameters = z.infer<typeof SequencerParametersSchema>;

/**
 * Validate sequencer parameters
 * @throws {z.ZodError} if validation fails
 */
export function validateParameters(params: unknown): ValidatedParameters {
  return SequencerParametersSchema.parse(params);
}

/**
 * Safely validate parameters, returning validation result
 */
export function safeValidateParameters(params: unknown) {
  return SequencerParametersSchema.safeParse(params);
}
