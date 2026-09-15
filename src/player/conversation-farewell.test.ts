import { describe, expect, it } from "vitest";

import { LIFE_TALK_INTENTS } from "../presentation/life-conversation";
import { FAREWELL_INTENT, FAREWELL_HOLD_MS } from "./SceneConversation";

/*
 * The conversation box closes itself on one specific intent key. If that key
 * is ever renamed in the intent table, the box would quietly stop closing and
 * the playtest's goodbye complaint would come back with no test failing, so
 * the link between the two is asserted rather than assumed.
 */
describe("the farewell intent the conversation box closes on", () => {
  it("is a real life-talk intent", () => {
    expect(Object.keys(LIFE_TALK_INTENTS)).toContain(FAREWELL_INTENT);
  });

  it("is the one that says goodbye, not another closing-sounding intent", () => {
    expect(
      LIFE_TALK_INTENTS[FAREWELL_INTENT as keyof typeof LIFE_TALK_INTENTS],
    ).toBe("Say goodbye");
  });

  it("holds the farewell long enough to read and not so long it stalls", () => {
    expect(FAREWELL_HOLD_MS).toBeGreaterThanOrEqual(800);
    expect(FAREWELL_HOLD_MS).toBeLessThanOrEqual(2500);
  });
});
