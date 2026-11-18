import { expect, it } from "vitest";
import { composeConversationLine } from "./conversation-words";
import type { PersonId } from "../core2/types";

// A fact a said part sets is known to the speaker who said it, so a later
// part that needs it can be said (english-composition setsFacts): the veto
// said at the next talk (Words lead, desk ruling 5) is an opener, the
// reason and a tail in the opener's bearing. The cut of Nov 17 left one tail
// ("I'll remember it", bearing guarded, after a veto that stood), so a tail is
// said after the opener that sets that bearing and after no other, and a veto
// that was overridden has none.
it("a tail that needs the opener's bearing is said after it", () => {
  const facts = {
    bill: { text: "the Parks Ordinance", sourceRecordIds: ["bill:1"] },
    "reason-opposed-groups": {
      text: "yes",
      sourceRecordIds: ["office-act:veto:1"],
    },
    group: { text: "the landlords", sourceRecordIds: ["group:1"] },
  };
  const tails: Record<string, string[]> = {
    "you-vetoed-bill": ["ill-remember-it"],
  };
  const said: Record<string, number> = { tail: 0, none: 0 };
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
      const opener = parts[0]!.split(".").at(-1)!;
      expect(
        parts.length,
        `${stage} ${n}: ${line?.text}`,
      ).toBeGreaterThanOrEqual(2);
      if (parts.length === 2) {
        said.none! += 1;
        expect(tails[opener], `${stage} ${n}: ${line?.text}`).toBeUndefined();
      } else {
        said.tail! += 1;
        expect(parts, `${stage} ${n}: ${line?.text}`).toHaveLength(3);
        const tail = parts[2]!.split(".").at(-1)!;
        expect(tails[opener], `${stage} ${n}: ${line?.text}`).toContain(tail);
      }
    }
  expect(
    said.tail,
    "a veto that stood is sometimes followed by a tail",
  ).toBeGreaterThan(0);
});
