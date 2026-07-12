import { z } from "zod";
import type { ComparisonKeyInput } from "@compare/domain";

const specString = z
  .string()
  .trim()
  .min(1, "Spec fields cannot be empty")
  .refine((value) => !value.includes("|"), {
    message: "Spec fields cannot contain |",
  });

export const createSpecSchema = z.object({
  provider: specString,
  productLine: specString,
  plan: specString,
  delivery: specString.pipe(
    z.enum(["ACCOUNT", "TOPUP", "API_QUOTA", "INVITE_SEAT"]),
  ),
  accessMode: specString.pipe(z.enum(["EXCLUSIVE", "SHARED"])),
  ownership: specString.pipe(
    z.enum(["TRANSFERRED", "RETAINED", "NOT_APPLICABLE"]),
  ),
  region: specString,
  qualification: specString,
  validity: specString,
  commitment: specString,
  quota: specString,
});

export function formatSpecLabel(spec: ComparisonKeyInput): string {
  return [
    spec.provider,
    spec.productLine,
    spec.plan,
    spec.delivery,
    spec.accessMode,
    spec.quota,
  ].join(" / ");
}
