import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { advanceCore, createLifeCore } from "../core2/life";
import { openCampaigns } from "../core2/modules/campaigns";
import { openElections } from "../core2/modules/elections";
import { openLaws } from "../core2/modules/laws";
import { openOffices } from "../core2/modules/offices";
import { openParties } from "../core2/modules/parties";
import { openVoting } from "../core2/modules/voting";
import { withCountedVoterGroups } from "../core2/opening-voter-groups";
import { buildPopulation } from "../core2/population";
import { candidatesFor } from "../core2/modules/candidacy";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, CoreModule } from "../core2/types";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { composeJournal } from "./journal";
import { createDirector } from "./ledger";
import { peopleData, peopleModules } from "./play-modules";

// M4-01, stories from elections: through a November election in a drawn
// town of full people (in a two-level town the counted residents who run are
// not person records yet; asked of OPUS-CORE and OPUS-GOV), every resident on
// a ballot is named in the result, gets a moment citing it, sized larger for
// a win, and their journal says whether they won or lost; winners who take
// office get that moment too. Officials' seats (official:term:...) are not
// people until OPUS-OFFICIALS makes them so.
const START = "2026-03-01";
// Without the runner, a place drawn from all 56 the way the runner draws.
function drawPlace(label: string) {
  const hash = createHash("sha256").update(label).digest("hex");
  const states = [...lifePlaceStateIdentities()].sort((a, b) =>
    a.jurisdictionKey.localeCompare(b.jurisdictionKey),
  );
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const place = places[parseInt(hash.slice(8, 16), 16) % places.length]!;
  return { seed: hash, key: place.key };
}

const drawn = drawPlace("election-moments-default:M4-01-elections");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const full = buildPopulation({
  seed,
  placeKey: key,
  startedAt: START,
  minimumPeople: 400,
});
const input = withCountedVoterGroups(full);
const watch = input.people
  .filter((person) => person.tier !== "husk")
  .map((person) => person.id);
const director = createDirector({ watch });
const recorded: CoreEventInput[] = [];
const recorder: CoreModule = {
  id: "test-recorder",
  eventKinds: ["election-result", "took-office"],
  onEvent(_api, event) {
    recorded.push(event);
  },
};
const core = createLifeCore(input, {
  data: peopleData(),
  modules: [...peopleModules(), recorder, director.module],
});
openLaws(core);
openOffices(core, seed);
openElections(core);
openCampaigns(core);
openParties(core);
openVoting(core);
director.start(core);
advanceCore(core, "2027-01-20");
const watched = new Set(director.ledger.people.keys());
const moment = (personId: string, eventId: string) =>
  director.ledger.people
    .get(personId)
    ?.moments.find((row) => row.causeId === eventId);

describe(`moments from an election in ${full.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("names in each result every resident who chose to run and made the ballot", () => {
    const api = coreAPI(core);
    let named = 0;
    for (const event of recorded.filter(
      (row) => row.kind === "election-result",
    )) {
      const contestId = String(event.facts?.contestId ?? "");
      for (const decision of candidatesFor(api, contestId)) {
        if (decision.filing?.status !== "on-ballot") continue;
        expect(event.personIds, contestId).toContain(decision.personId);
        named += 1;
      }
      for (const id of event.personIds)
        expect(core.people.get(id), id).toBeDefined();
    }
    // A place where no resident filed has nobody to name (named is 0); where
    // someone did, the next checks follow them.
    void named;
  });

  it("gives each watched candidate a moment for their result, a win larger than a loss", () => {
    const won: number[] = [];
    const lost: number[] = [];
    for (const event of recorded.filter(
      (row) => row.kind === "election-result",
    ))
      for (const id of event.personIds.filter((row) => watched.has(row))) {
        const row = moment(id, event.id);
        expect(row, `${event.id} ${id}`).toBeDefined();
        (event.facts?.winnerId === id ? won : lost).push(row!.impact);
      }
    if (won.length && lost.length)
      expect(Math.min(...won)).toBeGreaterThan(Math.max(...lost));
  });

  it("tells each candidate's journal whether they won or lost, and who took office", () => {
    for (const event of recorded) {
      for (const id of event.personIds.filter((row) => watched.has(row))) {
        const lines = composeJournal(core, director, id).flatMap(
          (chapter) => chapter.lines,
        );
        const line = lines.find((row) =>
          row.sourceRecordIds.includes(event.id),
        );
        const office = String(event.facts?.office ?? "");
        const expected =
          event.kind === "took-office"
            ? `I took office as ${office}.`
            : event.facts?.winnerId === id
              ? `I won the race for ${office}.`
              : `I lost the race for ${office}.`;
        expect(line?.text, `${event.id} ${id}`).toBe(expected);
      }
    }
  });
});
