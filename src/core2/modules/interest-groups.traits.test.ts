/**
 * Personality in the interest-groups engine (civic family): who joins a side's
 * group, which owners join an employers' association and who speaks for a
 * group. A drawn place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every resident a full person, played 120 days.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { drawnRaceWorld, RUN_SEED, weightOf } from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { personLean } from "../campaign-views";
import { viewOn } from "./views";
import { INTEREST_GROUPS_MODULE_ID, type GroupRow } from "./interest-groups";
import type { CoreAPI, CoreState } from "../types";

const SEED = `${RUN_SEED}:interest-groups`;

let core: CoreState;
let api: CoreAPI;
let groups: GroupRow[];

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld(SEED, drawPlace(SEED, "trait-wiring"), 120));
  groups = api
    .moduleState(INTEREST_GROUPS_MODULE_ID)
    .table("groups")
    .rows() as unknown as GroupRow[];
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("interest-groups.member-join reads the resident's calibrated lean toward joining", () => {
  it("the residents who joined a group lean more toward joining than the town's adults who did not", () => {
    const residents = groups.filter((g) => (g.memberPersonIds ?? []).length);
    console.log(`groups of residents: ${residents.length}`);
    expect(residents.length).toBeGreaterThan(0);
    const members = new Set(residents.flatMap((g) => g.memberPersonIds ?? []));
    const lean = (id: string) =>
      decisionLean(
        core,
        core.people.get(id)!,
        "interest-groups.member-join",
        "join",
        "stay-out",
      );
    const year = Number(core.date.slice(0, 4));
    const outsiders = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          !members.has(p.id) &&
          year - Number(p.birthDate.slice(0, 4)) >= 18,
      )
      .map((p) => lean(p.id));
    const joined = [...members].filter((id) => core.people.has(id)).map(lean);
    console.log(
      `joined: ${joined.length}, mean lean ${mean(joined).toFixed(3)}; adults who did not: ${outsiders.length}, ${mean(outsiders).toFixed(3)}`,
    );
    expect(mean(joined)).toBeGreaterThan(mean(outsiders));
  });
});

describe("interest-groups.lobbyist reads the speaker's calibrated lean toward serving", () => {
  it("a resident group's speaker is someone whose stake (how strongly they feel the question) and traits together favor serving", () => {
    const speaking = groups.filter(
      (g) =>
        (g.memberPersonIds ?? []).length &&
        g.lobbyistId &&
        core.people.has(g.lobbyistId),
    );
    console.log(`resident groups with a speaker: ${speaking.length}`);
    expect(speaking.length).toBeGreaterThan(0);
    for (const group of speaking) {
      const speaker = core.people.get(group.lobbyistId!)!;
      const lean = decisionLean(
        core,
        speaker,
        "interest-groups.lobbyist",
        "serve",
        "decline",
      );
      const stake = Math.abs(
        viewOn(
          api,
          speaker.id,
          group.interest,
          personLean(core.people, speaker, 0),
        ),
      );
      expect(
        stake + weightOf(core, "interest-groups.lobbyist") * lean,
        group.id,
      ).toBeGreaterThan(0);
    }
  });
});
