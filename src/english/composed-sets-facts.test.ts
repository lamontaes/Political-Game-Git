import { expect, it } from "vitest";
import { composeConversationLine } from "./conversation-words";
import type { PersonId } from "../core2/types";

// A fact a said part sets is known to the speaker who said it, so a later
// part that needs it can be said (english-composition setsFacts): the veto
// said at the next talk (Words lead, desk ruling 5) is an opener, the
// reason and a tail in the opener's bearing. Every moment key here gives
// all three parts, and the tail is one the opener's bearing allows.
it("a tail that needs the opener's bearing is said after it", () => {
  const facts = {
    bill: { text: "the Parks Ordinance", sourceRecordIds: ["bill:1"] },
    "reason-cost": { text: "yes", sourceRecordIds: ["office-act:veto:1"] },
  };
  const tails: Record<string, string[]> = {
    "im-still-sore-about-bill": ["im-not-holding-it-against-you"],
    "you-vetoed-bill": ["i-wanted-you-to-hear-that-from-me", "ill-remember-it"],
    "you-killed-bill": ["i-wont-forget-it"],
    "bill-is-law-now-over-your-veto": [
      "no-hard-feelings-we-got-there",
      "i-wanted-you-to-hear-that-from-me",
    ],
    "we-passed-bill-over-your-veto": ["ill-remember-who-stood-where"],
  };
  for (const stage of ["stood", "overridden"])
    for (let n = 0; n < 12; n += 1) {
      const line = composeConversationLine({
        seed: "composed-sets-facts",
        subject: "veto-say",
        speakerId: "person:1" as PersonId,
        traits: {},
        facts,
        stage,
        momentKey: `moment:${n}`,
      });
      const parts = line?.wording.parts ?? [];
      expect(parts, `${stage} ${n}: ${line?.text}`).toHaveLength(3);
      const opener = parts[0]!.split(".").at(-1)!;
      const tail = parts[2]!.split(".").at(-1)!;
      expect(tails[opener], `${stage} ${n}: ${line?.text}`).toContain(tail);
    }
});
