import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./spec-normalizer.tsx", import.meta.url)),
  "utf8",
);

describe("SpecNormalizer dialog contract", () => {
  it("exposes an accessible modal dialog and labelled close control", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="spec-normalizer-title"');
    expect(source).toContain('id="spec-normalizer-title"');
    expect(source).toContain('aria-label="Close specification normalization dialog"');
  });

  it("focuses the dialog on open and restores the previous focus on close", () => {
    expect(source).toContain("previouslyFocusedElement");
    expect(source).toContain("dialogRef.current?.focus()");
    expect(source).toContain("previouslyFocusedElement.current?.focus()");
  });

  it("closes on Escape and traps Tab navigation", () => {
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('event.key !== "Tab"');
    expect(source).toContain("focusableElements");
  });
});
