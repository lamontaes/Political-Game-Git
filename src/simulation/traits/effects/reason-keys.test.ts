import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPTION_CLAUSES,
  composeTraitReason,
  traitReasonKey,
} from "../reason-english";
import { personalityTraitEffects } from "./index";

const here = __dirname;
const readerFiles = readdirSync(here).filter(
  (name) =>
    name.endsWith(".ts") &&
    !name.endsWith(".test.ts") &&
    name !== "index.ts" &&
    name !== "trait-proof-support.ts",
);

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("trait reasons are keys, and the English engine composes the words", () => {
  it("no effect file contains a sentence literal or an explanation field", () => {
    const offenders: string[] = [];
    for (const name of readerFiles) {
      const code = withoutComments(readFileSync(join(here, name), "utf8"));
      if (/\bexplanation\s*:/.test(code))
        offenders.push(`${name}: explanation`);
      for (const match of code.matchAll(/"((?:[^"\\]|\\.)*)"|`([^`]*)`/g)) {
        const text = match[1] ?? match[2] ?? "";
        if (/\s/.test(text) && !text.startsWith("import")) {
          offenders.push(`${name}: ${text}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every built-in lean has a composed reason from its key", () => {
    const missing: string[] = [];
    for (const effect of personalityTraitEffects()) {
      for (const lean of effect.leans) {
        const key = traitReasonKey(lean, effect.decision);
        if (!OPTION_CLAUSES[`${effect.decision}|${lean.option}`]) {
          missing.push(key);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("composes one sentence from the key and the recorded pole", () => {
    const key = traitReasonKey(
      {
        trait: "personality-v1:facet-practical",
        option: "accept",
        pole: "high",
      },
      "contact.answer",
    );
    expect(key).toBe(
      "personality-v1:facet-practical|contact.answer|accept|high",
    );
    expect(
      composeTraitReason({
        key,
        poleLabel: "Practical",
        poleMeaning: "Takes plain, workable requests at face value.",
        aboutSubject: false,
      }),
    ).toBe(
      "Practical: Takes plain, workable requests at face value. So they accept the request.",
    );
  });
});
