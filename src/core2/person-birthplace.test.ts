/**
 * Where the town's grown residents were born: one birthplace record each,
 * drawn from their state's American Community Survey shares (table B05002),
 * held to their family, and read by the moves pass and the card.
 *
 * Pinned at Edgar, Wisconsin (5522550), seed edgar-petition-1: the town's
 * opening, then each resident's whole past opened. Measured at about 40
 * seconds; the limit is twice that, because building the town is the cost.
 */
import { expect, it } from "vitest";
import bornTable from "../../data/research/core/acs-2023-b05002-born-in-state.json" with { type: "json" };
import { knownCard } from "../bench/card";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { openWholePast } from "./modules/people";
import { bornIn } from "./past-module";
import {
  coreStateKeyOfJurisdictionId,
  corePlaceByJurisdictionId,
} from "./place-lookup";
import { BIRTHPLACE_FACT, BORN_ABROAD } from "./person-birthplace";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

it(`${where}: grown residents are born where their state's people were, and the move and the card read it`, () => {
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const player = core.people.get(core.playerId as PersonId)!;
  const town = player.placeId;
  const townName = corePlaceByJurisdictionId(town as never)!.displayName;
  const grown = [...core.people.values()]
    .filter(
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        person.placeId === town &&
        person.birthDate <= "2007-01-20",
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  let inState = 0;
  let abroad = 0;
  let toldElsewhere = 0;
  let broughtByIt = 0;
  for (const person of grown) {
    // Opened as the player would meet them: a resident the opening's
    // families did not reach gets their birthplace from the same draw now.
    openWholePast(core, person.id);
    const facts = (person.pastFacts ?? []).filter(
      (row) => row.kind === BIRTHPLACE_FACT,
    );
    // One record of where they were born.
    expect(facts.length, `${person.id}, ${where}`).toBe(1);
    const placeId = facts[0]!.facts!.placeId!;
    if (placeId === BORN_ABROAD) abroad += 1;
    else if (
      (corePlaceByJurisdictionId(placeId as never)?.stateJurisdictionKey ??
        coreStateKeyOfJurisdictionId(placeId)) === "US-WI"
    )
      inState += 1;
    else {
      // Born in another state: the moves pass brings them from it, by the
      // birthplace record (when they came inside the past the world runs),
      // and the card names the town that record resolves to, never the
      // town they live in.
      const [moved] = preStartHistory(core, {
        kind: "person.moved-in",
        personId: person.id as PersonId,
      });
      if (moved) {
        broughtByIt += 1;
        expect(moved.facts.originRecordId, `${person.id}, ${where}`).toBe(
          facts[0]!.id,
        );
      }
      const born = corePlaceByJurisdictionId(
        bornIn(core, person).placeId as never,
      )!.displayName;
      const card = JSON.stringify(knownCard(core, core.playerId!, person.id));
      expect(born, `${person.id}, ${where}`).not.toBe(townName);
      if (card.includes(`Born in ${born}`)) toldElsewhere += 1;
    }
  }
  const n = grown.length;
  const share = (
    bornTable as { places: Record<string, { bornWhereTheyLiveShare: number }> }
  ).places.WI!.bornWhereTheyLiveShare;
  // Within three binomial spreads of the survey's share born in the state.
  const spread = 3 * Math.sqrt((share * (1 - share)) / n);
  process.stdout.write(
    `${where}: ${n} grown residents, ${inState} born in Wisconsin (survey ${share}), ${n - inState - abroad} in another state or territory, ${abroad} abroad; ${broughtByIt} brought by a move that reads it; ${toldElsewhere} cards name the other-state town.\n`,
  );
  expect(n).toBeGreaterThan(100);
  expect(Math.abs(inState / n - share), where).toBeLessThan(spread);
  expect(n - inState - abroad, where).toBeGreaterThan(0);
  expect(broughtByIt, where).toBeGreaterThan(0);
}, 80_000);
