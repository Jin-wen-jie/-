import { describe, expect, it } from "vitest";
import type { ComparisonKeyInput } from "@compare/domain";
import { createSpecSchema, formatSpecLabel } from "./specs.js";

const validSpec: ComparisonKeyInput = {
  provider: "OpenAI",
  productLine: "ChatGPT",
  plan: "Team",
  delivery: "ACCOUNT",
  accessMode: "SHARED",
  ownership: "RETAINED",
  region: "global",
  qualification: "K12",
  validity: "1year",
  commitment: "monthly",
  quota: "100 USD",
};

const fields = Object.keys(validSpec) as Array<keyof ComparisonKeyInput>;
const freeTextFields = [
  "provider",
  "productLine",
  "plan",
  "region",
  "qualification",
  "validity",
  "commitment",
  "quota",
] as const satisfies readonly (keyof ComparisonKeyInput)[];

describe("spec helpers", () => {
  it("trims every field before returning a valid spec", () => {
    const padded = Object.fromEntries(
      Object.entries(validSpec).map(([key, value]) => [key, `  ${value}  `]),
    );

    expect(createSpecSchema.parse(padded)).toEqual(validSpec);
  });

  it("rejects empty fields", () => {
    for (const field of fields) {
      expect(
        createSpecSchema.safeParse({ ...validSpec, [field]: "   " }).success,
        field,
      ).toBe(false);
    }
  });

  it("rejects comparison key delimiters in every field", () => {
    for (const field of fields) {
      expect(
        createSpecSchema.safeParse({
          ...validSpec,
          [field]: `${validSpec[field]}|other`,
        }).success,
        field,
      ).toBe(false);
    }
  });

  it("accepts only domain enum values", () => {
    expect(
      createSpecSchema.safeParse({ ...validSpec, delivery: "account" }).success,
    ).toBe(false);
    expect(
      createSpecSchema.safeParse({ ...validSpec, accessMode: "shared" }).success,
    ).toBe(false);
    expect(
      createSpecSchema.safeParse({ ...validSpec, ownership: "retained" }).success,
    ).toBe(false);
  });

  it.each(["UNDISCLOSED", "undisclosed", "PARSE_FAILED", "Parse_Failed"])(
    "rejects the %s placeholder in every free-text field",
    (placeholder) => {
      for (const field of freeTextFields) {
        expect(
          createSpecSchema.safeParse({
            ...validSpec,
            [field]: `  ${placeholder}  `,
          }).success,
          field,
        ).toBe(false);
      }
    },
  );

  it("allows the NOT_APPLICABLE domain value", () => {
    expect(
      createSpecSchema.safeParse({
        ...validSpec,
        ownership: "NOT_APPLICABLE",
      }).success,
    ).toBe(true);
  });

  it("gives every comparison field distinguishing value in the label", () => {
    const baseline = formatSpecLabel(validSpec);

    for (const field of fields) {
      const distinguishingValue = `${field}-distinguishing-value`;
      const changedSpec = {
        ...validSpec,
        [field]: distinguishingValue,
      } as ComparisonKeyInput;
      const changedLabel = formatSpecLabel(changedSpec);

      expect(changedLabel, field).not.toBe(baseline);
      expect(changedLabel, field).toContain(distinguishingValue);
    }
  });
});
