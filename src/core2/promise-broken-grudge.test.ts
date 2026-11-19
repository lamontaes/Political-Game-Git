import { expect, it } from "vitest";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween, feelingBetween } from "./closeness";
import { drivesReport } from "./modules/drives";
import { findTownBorrower } from "../../tests/support/real-borrower";
import { type Check, playPayOnTime } from "../../tests/support/promise-play";

// A promise broken is on record against the one who gave it (`promise.broken`,
// written where the engine ends the promise as broken). The one owed answers
// by their own temperament (a grudge, proving themselves, a cause or carrying
// on), so the claim is that the drives engine answered the record, and that a
// grudge it formed feeds the one feeling read. The broken promise is the
// pay-on-time case the promise tests play: a drawn place advanced until a
// borrower the town's own credit engine bills misses a payment.
const ok: Check = (holds, message) => expect(holds, message).toBe(true);

it("a promise the engine ends as broken is answered by the one owed, in a drawn place", () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let from = 0;
  for (let tries = 0; tries < 6; tries += 1) {
    const found = findTownBorrower(from, passedOver);
    const result = playPayOnTime(found, ok);
    if (!result.played) {
      passedOver.push(result.passed);
      from = found.nextDraw;
      continue;
    }
    const { core, where } = found;
    const answered = Object.entries(drivesReport(core).responsesByRule)
      .filter(([key]) => key.startsWith("promise-broken:"))
      .reduce((sum, [, n]) => sum + (n as number), 0);
    expect(
      answered,
      `${where}: a promise was broken (${result.played.slice(0, 200)}) and the drives engine answered none (passed over: ${passedOver.join("; ") || "none"})`,
    ).toBeGreaterThan(0);
    const grudges = drivesReport(core).drives.filter(
      (d) => d.kind === "grudge",
    );
    for (const d of grudges) {
      const holder = d.personId as never;
      const target = d.targetId as never;
      if (!target || !core.people.has(target)) continue;
      if (closenessBetween(core, holder, target) > 0)
        expect(
          feelingBetween(core, holder, target),
          `${where}: ${d.id}`,
        ).toBeLessThan(closenessBetween(core, holder, target));
    }
    return;
  }
  throw new Error(
    `no promise was broken in six places: ${passedOver.join("; ")}`,
  );
}, 570_000);
