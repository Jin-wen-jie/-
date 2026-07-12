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

  it("includes quota in the display label", () => {
    expect(formatSpecLabel(validSpec)).toContain(validSpec.quota);
  });
});
