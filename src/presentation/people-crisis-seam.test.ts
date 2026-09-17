import { describe, expect, it } from "vitest";
import { assertWorldIntegrity, serializeWorld } from "../simulation";
import { crisisPersonDeathRecipientNotices } from "../simulation/crisis/notices";
import {
  BEREAVEMENT_NOTICE_EVENT,
  applyDeathNotices,
} from "../simulation/people-bereavement";
import { recordFamilyAddition } from "../simulation/people-family";
import { recordPersonDeath } from "../simulation/vitality";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * CRUNCH47, the B–C seam composed: CRISIS says who died, B says who comes to
 * know it. One death, one notice per relative, written once.
 *
 * B's own consumer is proven against the contract in people-bereavement.test;
 * this file proves the two halves actually fit, against CRISIS's real reader.
 */

function yearsBefore(date: string, years: number) {
  const [y, m, d] = date.split("-");
  return `${Number(y) - years}-${m}-${d === "29" && m === "02" ? "28" : d}`;
}

describe("B + C: a death reaches the family exactly once", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "b-c-seam",
      startAge: 60,
    }),
  ).game!;
  const player = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, player);
  const first = recordFamilyAddition(opened, {
    kind: "birth",
    stableKey: "seam:child-1",
    occurredAt: yearsBefore(opened.currentDate, 34) as never,
    parentPersonIds: [player],
  });
  const second = recordFamilyAddition(first.world, {
    kind: "birth",
    stableKey: "seam:child-2",
    occurredAt: yearsBefore(opened.currentDate, 30) as never,
    parentPersonIds: [player],
  });
  const died = first.childPersonId;
  const survivor = second.childPersonId;
  const dead = recordPersonDeath(second.world, {
    stableKey: "seam:death",
    personId: died,
    diedAt: second.world.currentDate,
    causeKey: "cause:seam-fixture",
    sourceEntityIds: [second.world.id],
    summary: "Died; the cause is not recorded.",
    provenance: { kind: "authored", note: "B–C seam fixture." },
  });

  it("CRISIS names the people, B writes what they learned", () => {
    const notices = crisisPersonDeathRecipientNotices(dead);
    const forThisDeath = notices.filter((notice) => notice.personId === died);
    expect(forThisDeath.length).toBeGreaterThan(0);
    const recipients = forThisDeath.map((notice) => notice.recipientPersonId);
    expect(recipients).toContain(player);
    expect(recipients).toContain(survivor);
    // Each notice is its own effect, and every key is distinct.
    expect(new Set(forThisDeath.map((notice) => notice.effectKey)).size).toBe(
      forThisDeath.length,
    );
    const told = applyDeathNotices(dead, notices);
    const learned = told.history.events.filter(
      (event) => event.type === BEREAVEMENT_NOTICE_EVENT,
    );
    expect(learned.length).toBe(
      notices.filter((notice) => !notice.alreadyKnew).length,
    );
    for (const personId of [player, survivor]) {
      expect(
        told.history.knowledge.some(
          (entry) =>
            entry.personId === personId &&
            entry.eventId ===
              dead.history.personDeaths.find((d) => d.personId === died)!
                .eventId,
        ),
      ).toBe(true);
    }
    assertWorldIntegrity(told);
    // Reading the notices again writes nothing: the effect keys already hold.
    const again = applyDeathNotices(
      told,
      crisisPersonDeathRecipientNotices(told),
    );
    expect(serializeWorld(again)).toBe(serializeWorld(told));
  });

  it("a stranger is told nothing at all", () => {
    const told = applyDeathNotices(
      dead,
      crisisPersonDeathRecipientNotices(dead),
    );
    const stranger = told.personOrder.find(
      (id) =>
        id !== player &&
        id !== survivor &&
        id !== died &&
        !told.history.events.some(
          (event) =>
            event.type === BEREAVEMENT_NOTICE_EVENT &&
            event.involvedEntityIds.includes(id),
        ),
    )!;
    expect(stranger).toBeTruthy();
    const deathEventId = told.history.personDeaths.find(
      (d) => d.personId === died,
    )!.eventId;
    expect(
      told.history.knowledge.some(
        (entry) =>
          entry.personId === stranger && entry.eventId === deathEventId,
      ),
    ).toBe(false);
  });

  it("the cursor is B's own, and reading from it writes nothing twice", () => {
    const told = applyDeathNotices(
      dead,
      crisisPersonDeathRecipientNotices(dead),
    );
    const frontier = Math.max(
      ...crisisPersonDeathRecipientNotices(told).map(
        (notice) => notice.sequence,
      ),
    );
    const afterFrontier = crisisPersonDeathRecipientNotices(told, {
      afterSequence: frontier,
    });
    expect(afterFrontier).toEqual([]);
    expect(serializeWorld(applyDeathNotices(told, afterFrontier))).toBe(
      serializeWorld(told),
    );
  });
});
