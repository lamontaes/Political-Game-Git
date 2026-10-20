/**
 * A counted resident and the same person filled in agree alike with a
 * platform (pool item elections-counted-voters-read-group-stances): the
 * counted group reads the same stance rule as a full person, with the faith
 * and degree they will have when met. A place is drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { groupAgreement } from "./campaign-views";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { agreementWith, countedStanceProfile } from "./modules/views";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const platform = [
  { question: "civil-family-community.restrict-abortion", position: 1 },
  { question: "labor-workforce.raise-minimum-wage", position: -1 },
  { question: "environment-energy.price-carbon", position: 1 },
];

it("a counted resident's agreement with a platform equals the filled-in person's", () => {
  const place = drawPlace(seed, "counted-stance");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const adults = countedResidents(core as CoreState).filter(
    (voter) => voter.birthDate < "2000-01-01",
  );
  expect(adults.length, where).toBeGreaterThan(8);
  // A spread of counted adults, so faith and education differ among them.
  const picked = adults.filter(
    (_, i) => i % Math.ceil(adults.length / 8) === 0,
  );
  const profiles = new Set<string>();
  for (const voter of picked) {
    const lean = 0.3;
    const profile = countedStanceProfile(api, voter);
    expect(profile, `${where}: ${voter.id} has a profile`).not.toBeNull();
    profiles.add(`${profile!.faith}|${profile!.college}`);
    const counted = groupAgreement(lean, platform, profile);
    fillInPerson(core as CoreState, voter.id as never);
    const full = agreementWith(api, voter.id, lean, platform);
    expect(full, `${where}: ${voter.id} counted then filled in`).toBeCloseTo(
      counted,
      9,
    );
  }
  // The group of voters is not one profile: faith and degree differ.
  expect(profiles.size, where).toBeGreaterThan(1);
}, 900_000);
