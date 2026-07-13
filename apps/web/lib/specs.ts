import { z } from "zod";
import type { ComparisonKeyInput } from "@compare/domain";

const specField = z
  .string()
  .trim()
  .min(1, "Spec fields cannot be empty")
  .refine((value) => !value.includes("|"), {
    message: "Spec fields cannot contain |",
  })
  .refine((value) => !["UNDISCLOSED", "PARSE_FAILED"].includes(value), {
    message: "Spec fields cannot contain unresolved placeholders",
  });

export const createSpecSchema = z.object({
  provider: specField,
  productLine: specField,
  plan: specField,
  delivery: specField.pipe(
    z.enum(["ACCOUNT", "TOPUP", "API_QUOTA", "INVITE_SEAT"]),
  ),
  accessMode: specField.pipe(z.enum(["EXCLUSIVE", "SHARED"])),
  ownership: specField.pipe(
    z.enum(["TRANSFERRED", "RETAINED", "NOT_APPLICABLE"]),
  ),
  region: specField,
  qualification: specField,
  validity: specField,
  commitment: specField,
  quota: specField,
});

export function formatSpecLabel(spec: ComparisonKeyInput): string {
  return [
    `provider:${spec.provider}`,
    `product:${spec.productLine}`,
    `plan:${spec.plan}`,
    `delivery:${spec.delivery}`,
    `access:${spec.accessMode}`,
    `ownership:${spec.ownership}`,
    `region:${spec.region}`,
    `qualification:${spec.qualification}`,
    `validity:${spec.validity}`,
    `commitment:${spec.commitment}`,
    `quota:${spec.quota}`,
  ].join(" | ");
}
