/**
 * A new game starts the player at 18 or older (owner, Nov 16: "Just do 18 and up right now. Life
 * before 18 will come after early access."). Without the creator, the player is one of the town's
 * own adults, picked by the world's seeded unit; with the creator, a resident of the chosen age
 * whose household, partner and children are the life someone that age lived, and the chosen
 * birthday never rewrites someone of another age. Pinned: three places and world seeds drawn once
 * with drawPlace("age-probe", "a1" | "a3" | "a4") and fixed here.
 */
import { describe, expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  checkEligibility,
  ELECTIONS_MODULE_ID,
} from "../core2/modules/elections";
import { OPENING_KIN } from "../core2/opening-kin";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { applyChosenPerson } from "./creator";
import { buildBenchWorld, type EntrantPick, PLAYER_MIN_AGE } from "./world";

const PLACES = [
  {
    name: "Shubert, Nebraska",
    key: "3145225",
    seed: "4f084788fb52adfd1e9edfff00040a02e8e8447e725934bd60a26d12fa07322f",
  },
  {
    name: "Paradise, Montana",
    key: "3056425",
    seed: "7a13f2f5eb61c8130a2fb85cfb42a08325ac0933e0d0fa1e803a7b63fa3afda6",
  },
  {
    name: "Bethel Springs, Tennessee",
    key: "4705380",
    seed: "3f287e4e40d4bb6f2a2e7173efa10582e078529692a1917c7e02f6f2c8735f1e",
  },
];

const start = makeIsoDate(gameStartDate());
const ageOf = (core: CoreState, id: string) =>
  ageOnDate(makeIsoDate(core.people.get(id)!.birthDate), start);

/** The player's partner is an adult and each child is at least the kin builder's parent age younger. */
function familyFits(core: CoreState, playerId: string, where: string) {
  const player = core.people.get(playerId)!;
  const minParentAge = OPENING_KIN.fertilityByAge.rows[0]!.minAge;
  for (const fact of player.pastFacts ?? []) {
    const other = fact.facts?.otherPersonId
      ? core.people.get(fact.facts.otherPersonId as never)
      : undefined;
    if (!other) continue;
    if (fact.kind === "family:partner")
      expect(
        ageOf(core, other.id),
        `${where}: partner's age`,
      ).toBeGreaterThanOrEqual(PLAYER_MIN_AGE);
    if (fact.kind === "family:child")
      expect(
        ageOnDate(makeIsoDate(player.birthDate), makeIsoDate(other.birthDate)),
        `${where}: age at the child's birth`,
      ).toBeGreaterThanOrEqual(minParentAge);
  }
}

describe("a new game's player is 18 or older", () => {
  for (const place of PLACES) {
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    it(`without the creator: one of the town's adults, on its filing counter's age rule (${place.name})`, () => {
      setBookkeeping(false);
      const world = buildBenchWorld(place.seed, start, {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const age = ageOf(core, world.playerId!);
      expect(age, where).toBeGreaterThanOrEqual(PLAYER_MIN_AGE);
      const pick = JSON.parse(
        core.placeMetadata.openingPlayerPick!,
      ) as EntrantPick;
      expect(pick, where).toMatchObject({ how: "town-adult", age });
      familyFits(core, world.playerId!, where);
      // A town office with an 18-year-old minimum takes the player's filing on age.
      const api = coreAPI(core);
      const ageRules = [
        ...api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows(),
      ]
        .map((contest) =>
          checkEligibility(api, world.playerId!, String(contest.id)).find(
            (check) => check.rule === "minimum-age",
          ),
        )
        .filter((check) => check && Number(check.required) <= PLAYER_MIN_AGE);
      expect(
        ageRules.length,
        `${where}: contests with an 18 minimum`,
      ).toBeGreaterThan(0);
      expect(
        ageRules.filter((check) => !check!.met),
        `${where}: the player meets each 18 minimum`,
      ).toEqual([]);
    }, 60_000);

    it(`with the creator: a resident of the chosen age, whose family fits it (${place.name})`, () => {
      setBookkeeping(false);
      const chosen = {
        birthYear: Number(start.slice(0, 4)) - 26,
        birthMonth: 3,
        birthDay: 3,
      };
      const born = `${chosen.birthYear}-03-03`;
      const chosenAge = ageOnDate(makeIsoDate(born), start);
      let drawnAge: number | undefined;
      const world = buildBenchWorld(place.seed, start, {
        twoLevel: true,
        placeKey: place.key,
        playerBirthDate: born,
        playerGender: "female",
        chooseIdentity: (core, id) => {
          drawnAge = ageOf(core, id);
          applyChosenPerson(core, id, {
            givenName: "Pat",
            familyName: "Doe",
            gender: "female",
            ...chosen,
          } as never);
        },
      });
      const core = world.core;
      const pick = JSON.parse(
        core.placeMetadata.openingPlayerPick!,
      ) as EntrantPick;
      expect(pick, where).toMatchObject({ how: "chosen-age", chosenAge });
      // The chosen birthday moves the player only within the age their life was drawn at.
      expect(ageOf(core, world.playerId!), where).toBe(drawnAge);
      if (!pick.estimated) expect(drawnAge, where).toBe(chosenAge);
      familyFits(core, world.playerId!, where);
    }, 60_000);
  }
});
