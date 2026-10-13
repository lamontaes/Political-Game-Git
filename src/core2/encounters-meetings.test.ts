import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { createLifeCore } from "./life";
import { openCampaigns } from "./modules/campaigns";
import { openElections } from "./modules/elections";
import { encountersModule } from "./modules/encounters";
import { openLaws } from "./modules/laws";
import { openLegislature } from "./modules/legislature";
import { holdTownHall, openMeetings } from "./modules/meetings";
import { openOffices } from "./modules/offices";
import { openPress } from "./modules/press";
import { openRecord } from "./modules/record";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// SG-P15-encounters, meetings: at a town hall OPUS-GOV's meetings engine
// holds in a drawn town, each resident who came meets the host, and no one
// else is met by being in the room.
const START = "2026-01-05";
const drawn = drawPlace(
  "encounters-meetings-default",
  "P15-encounters-meetings",
);
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const population = buildPopulation({
  seed,
  placeKey: key,
  startedAt: START,
  minimumPeople: 300,
});
const core = createLifeCore(population, { modules: [encountersModule] });
openLaws(core);
openOffices(core, seed);
openElections(core);
openCampaigns(core);
openRecord(core);
openLegislature(core);
openPress(core);
openMeetings(core);
const api = coreAPI(core);
const host = [...core.people.values()]
  .filter(
    (person) =>
      person.alive &&
      person.tier !== "husk" &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(START)) >= 30,
  )
  .sort((a, b) => a.id.localeCompare(b.id))[0]!;
const knewBefore = new Map(
  [...core.people.values()].map((person) => [
    person.id,
    new Set(person.knownIds),
  ]),
);
const hall = holdTownHall(api, { hostId: host.id });

describe(`meeting people at a town hall in ${population.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("each attendee meets the host", () => {
    expect(hall.attendeeIds.length).toBeGreaterThan(0);
    let met = 0;
    for (const id of hall.attendeeIds) {
      expect(core.people.get(id)!.knownIds.has(host.id)).toBe(true);
      expect(host.knownIds.has(id)).toBe(true);
      if (!knewBefore.get(id)!.has(host.id)) met += 1;
    }
    expect(met).toBeGreaterThan(0);
  });

  it("meets no one else for being in the room", () => {
    for (const id of hall.attendeeIds) {
      const added = [...core.people.get(id)!.knownIds].filter(
        (other) => !knewBefore.get(id)!.has(other),
      );
      for (const other of added) expect(other).toBe(host.id);
    }
  });
});
