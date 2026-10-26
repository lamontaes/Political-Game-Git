import { describe, expect, it } from "vitest";
import type { AuthorityReason } from "../core2/modules/legislature";
import controls from "./data/controls.json" with { type: "json" };

// A refused bill shows its reason in words, never the record code (owner:
// no hand-written player text; the screen shows control names for records).
// Every reason an authority check can refuse with is listed here; the type
// makes the list complete when a reason is added.
const REFUSALS: Record<
  Exclude<
    AuthorityReason,
    | "within-own-power"
    | "state-grants-local-minimum-wage"
    | "state-allows-local-tax"
    | "state-has-own-law"
    | "no-state-limit"
  >,
  true
> = {
  "level-lacks-power": true,
  "state-preempts-question": true,
  "state-preempts-local-minimum-wage": true,
  "state-gives-no-local-minimum-wage": true,
  "state-gives-no-local-tax": true,
  "no-state-law": true,
};

describe("a refused bill's reason in words", () => {
  const words = (controls as unknown as { authority: Record<string, string> })
    .authority;
  it.each(Object.keys(REFUSALS))(
    "%s has words that are not the code",
    (reason) => {
      expect(words[reason], reason).toBeTruthy();
      expect(words[reason], reason).not.toMatch(/^[a-z]+(?:-[a-z]+)+$/);
    },
  );
});
