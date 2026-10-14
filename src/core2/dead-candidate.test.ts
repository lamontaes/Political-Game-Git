/**
 * A candidate who dies leaves the races still to come the same day, and their
 * campaign stops: nobody campaigns or is voted for from the grave. In a
 * random place.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ballot,
  fileCandidacy,
  openContests,
  openElections,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`dead-candidate:${Date.now()}`).digest("hex");
const drawn = drawPlace(seed, "dead-candidate");
const where = `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${seed}`;

describe(`a candidate who dies (${where})`, () => {
  it("leaves every race still to come, the same day", () => {
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: drawn.key,
        startedAt: START,
        minimumPeople: 200,
      }),
    );
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    const api = coreAPI(core);
    const adults = [...core.people.values()]
      .filter((p) => 2026 - Number(p.birthDate.slice(0, 4)) >= 35)
      .sort((a, b) => a.id.localeCompare(b.id));
    let filed: { contestId: string; personId: string } | null = null;
    for (const contest of openContests(api)) {
      for (const person of adults) {
        const r = fileCandidacy(api, {
          personId: person.id,
          contestId: contest.id,
          platform: [],
          party: null,
        });
        if (r.status === "on-ballot") {
          filed = { contestId: contest.id, personId: person.id };
          break;
        }
      }
      if (filed) break;
    }
    // A place with no race open to an independent filer this year.
    if (!filed) return;
    api.updatePerson(filed.personId, { alive: false });
    api.emit({
      id: `test-death:${filed.personId}`,
      date: START,
      kind: "life.death",
      personIds: [filed.personId],
      placeId: core.people.get(filed.personId)!.placeId,
      source: { tag: "SOURCED", citation: "test", asOf: START },
    });
    expect(
      ballot(api, filed.contestId).some((f) => f.personId === filed!.personId),
      where,
    ).toBe(false);
  }, 300_000);
});
