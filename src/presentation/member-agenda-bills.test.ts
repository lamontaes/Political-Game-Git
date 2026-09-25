import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { measurePropositionAnswer } from "../simulation/issue-record";
import { fileMemberAgendaBill } from "../simulation/governing/member-agenda";
import { principledLeaning } from "../simulation/governing/officeholder-principles";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import type { World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * A state with no written bills gets bills from its own members.
 *
 * Before: Colorado's seated legislature filed nothing, because the only bills
 * a state sent were authored scenario measures, and the governor's office
 * recorded that no bill reached it. After: on the legislature's bill day a
 * seated member files a bill on the question their own principles press
 * hardest, answering it the way they lean, and it goes to the clock.
 */
describe("a member files a bill of their own", () => {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-CO",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "member-agenda-US-CO",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const colorado = stateJurisdictionForKey("US-CO")!.id;
  const pack = legislativePackForJurisdiction(colorado)!;
  let world: World = openOrdinaryLife(game.world, game.playerPersonId);
  const agendaBills = (w: World) =>
    (w.history.legislativeMeasures ?? []).filter(
      (measure) =>
        measure.jurisdictionId === colorado &&
        measure.stableKey.endsWith(":agenda"),
    );
  for (let day = 0; day < 120 && agendaBills(world).length === 0; day += 1)
    world = passOrdinaryDays(world, 1);

  it("files a bill on the bill day, carried by a seated member", () => {
    const [bill] = agendaBills(world);
    expect(bill).toBeDefined();
    const seated = new Set(
      stateLegislators(world, `${pack.packId}:candidacy`).map(
        (member) => member.personId,
      ),
    );
    expect(seated.has(bill!.sponsorPersonId!)).toBe(true);
    expect(bill!.sponsorPersonId).not.toBe(game.playerPersonId);
  });

  it("answers the question the way the sponsor's principles lean", () => {
    const bill = agendaBills(world)[0]!;
    expect(bill.propositionAnswers).toHaveLength(1);
    const { propositionId } = bill.propositionAnswers![0]!;
    const answer = measurePropositionAnswer(bill, propositionId);
    const { score } = principledLeaning(
      world,
      bill.sponsorPersonId!,
      propositionId,
    );
    expect(Math.abs(score)).toBeGreaterThanOrEqual(3);
    // Nothing is law on the question yet, so only support files a bill.
    expect(answer).toBe("yes");
    expect(score).toBeGreaterThan(0);
    expect(bill.shortTitle).toBe(
      world.policyCatalog.propositions[propositionId]!.name,
    );
  });

  it("files once per bill day", () => {
    const bill = agendaBills(world)[0]!;
    const intakeKey = bill.stableKey
      .replace(/^legislative-intake\/v1:/, "")
      .replace(/:agenda$/, "");
    const again = fileMemberAgendaBill(world, {
      jurisdictionId: colorado,
      intakeKey,
    });
    expect(again).toBe(world);
  });
}, 900_000);
