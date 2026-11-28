import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../../../src/core2/campaign-data";
import { gameStartDate } from "../../../src/core2/game-start";
import {
  addDays,
  ageOnDate,
  makeIsoDate,
} from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import {
  fileCandidacy,
  filingRequirements,
  openContests,
  petitionOf,
} from "../../../src/core2/modules/elections";
import { corePlaceByKey } from "../../../src/core2/place-lookup";
import { coreAPI } from "../../../src/core2/state";
import {
  petitionAsksAtDoors,
  signaturesToGather,
} from "../../../src/core2/modules/campaigns";
import { petitionSigners } from "../../../src/core2/modules/elections";
import { campaignDay } from "../../../src/bench/campaign";
import { buildBenchWorld, NoPlayerHereError } from "../../../src/bench/world";
import { townResidentsByCash } from "../../support/resident-adults-test-kit";

// Owner, Nov 14 (decision card "Switch to asking for votes"): once the petition
// holds what a campaign gathers (the clerk's count plus the cushion), the
// player's doors stop asking for signatures and ask for votes. Played in three
// places drawn from all 56 (the Otisville, New York measurement pinned one
// world, and a change to a press owner's income moved it; CTO, Nov 27: test the
// behavior, not the pin). After the target, the next door knocked asks for the
// vote: in the same outing if doors remain, else in the next outing (CTO,
// Nov 28, by realism); a place whose target lands on the last door is named,
// and its next outing is the one checked. A place with no local petition race
// in the year is passed over by name.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const WANTED = 3;
const DRAWS = 24;

/** Plays one place; returns why it could not be checked, or null once every assertion ran. */
function playPlace(
  placeSeed: string,
  PLACE: string,
  where: string,
  lastDoor: string[],
): string | null {
  let built: ReturnType<typeof buildBenchWorld>;
  try {
    built = buildBenchWorld(placeSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
  } catch (error) {
    // A place where no player can live is passed over by name.
    if (!(error instanceof NoPlayerHereError)) throw error;
    return `${where}: ${error.message}`;
  }
  const { core } = built;
  const api = coreAPI(core);
  const local = () =>
    openContests(api).filter(
      (row) => row.level !== "federal" && row.level !== "state",
    );
  for (let week = 0; week < 52 && !local().length; week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const town = corePlaceByKey(PLACE)?.context.jurisdiction.id;
  const start = makeIsoDate(core.date);
  const adults = townResidentsByCash(core, coreAPI(core))
    .filter(
      (row) =>
        row.alive &&
        row.placeId === town &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), start) >= 35,
    )
    .slice(0, 60);
  let filed: { personId: string; filingId: string } | null = null;
  for (const adult of adults) {
    core.playerId = adult.id;
    for (const contest of local()) {
      const out = fileCandidacy(api, {
        personId: adult.id,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (out.status !== "refused" && out.filing.status === "petitioning") {
        filed = { personId: adult.id, filingId: out.filing.id };
        break;
      }
    }
    if (filed) break;
  }
  if (!filed) return `${where}: no petition race by ${start}`;
  const { personId, filingId } = filed;
  const target = signaturesToGather(api, filingId);
  // An outing knocks 45 doors, so twelve outings cannot gather more than 540
  // signatures even if every door signs: a larger target (1,004 at Chevy
  // Chase, Maryland) cannot show the switch here, and the place is passed over.
  if (target > 12 * 45)
    return `${where}: target ${target} is beyond twelve outings' doors`;
  const doorSigned = () =>
    petitionSigners(api, filingId).filter((s) => s.via === "door").length;
  const days: string[] = [];
  let switched = false;
  for (
    let day = 0;
    day < 12 && core.date <= petitionOf(api, filingId)!.due;
    day += 1
  ) {
    const asking = petitionAsksAtDoors(api, filingId);
    const before = doorSigned();
    const out = campaignDay(core, personId, { filingId, kind: "canvass" });
    days.push(
      `${core.date}: asking ${asking}, ${out.doorsKnocked} doors, ${out.reached} reached, signed ${out.signed}, answered ${out.answered}, door signers ${doorSigned()} of ${target}`,
    );
    if (asking) {
      // The outing that reaches the target shows both: the signed and the
      // doors after it that asked for the vote.
      if (!petitionAsksAtDoors(api, filingId)) {
        // The target landed in this outing: the doors after it ask for the
        // vote; if it landed on the last door, no door remains, so the place
        // is named and the next outing (the branch below) is the one checked.
        if (out.votesAsked! > 0)
          expect(out.votesAsked!, days.at(-1)).toBeGreaterThan(0);
        else lastDoor.push(`${where}: ${days.at(-1)}`);
      }
      expect(out.signed, days.at(-1)).not.toBeNull();
      expect(before, days.at(-1)).toBeLessThan(target);
    } else {
      switched = true;
      // A vote-asking outing: no signers, the strip reads "reached", nobody signs.
      expect(out.signed, days.at(-1)).toBeNull();
      expect(out.answered, days.at(-1)).toBe(out.votesAsked);
      expect(out.reached, days.at(-1)).toBeGreaterThan(0);
      expect(doorSigned(), days.at(-1)).toBe(before);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  process.stdout.write(
    `DOORS SWITCH ${where} ${filingId} target ${target}\n  ${days.join("\n  ")}\n`,
  );
  // Twelve outings reach a small target, not a large one (1,004 signatures at
  // Chevy Chase, Maryland): where the petition is still open and short, the
  // place cannot show the switch in this many outings and is passed over.
  if (!switched && core.date <= petitionOf(api, filingId)!.due)
    return `${where}: target ${target} not reached in 12 outings (${doorSigned()} door signers)`;
  expect(switched, days.join("\n")).toBe(true);
  expect(petitionAsksAtDoors(api, filingId)).toBe(false);
  return null;
}

it(`the player's doors ask for votes once the petition holds the target (${WANTED} drawn places, seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  const lastDoor: string[] = [];
  let checked = 0;
  for (let draw = 0; draw < DRAWS && checked < WANTED; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "campaign-doors-ask-votes");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    // A place's law asks a petition of a local race, or its doors have nothing
    // to switch: read from its filing data before the place is played, as a
    // walk draws a place where its scene can play.
    const petitions = ["municipalOffice", "countyOffice"].some(
      (family) =>
        filingRequirements(place.state, family as "municipalOffice").petition
          .basis !== "none-in-law",
    );
    const why = petitions
      ? playPlace(place.seed, place.key, where, lastDoor)
      : `${where}: its law asks no petition of a local race`;
    process.stdout.write(`DOORS place ${where}: ${why ?? "checked"}\n`);
    if (why) passed.push(why);
    else checked += 1;
  }
  expect(
    checked,
    `${WANTED} places needed; passed over: ${passed.join("; ")}`,
  ).toBe(WANTED);
  if (lastDoor.length)
    process.stdout.write(
      `DOORS target landed on the last door, next outing checked: ${lastDoor.join("; ")}\n`,
    );
}, 1_800_000);
