/**
 * Personality in the interest-groups engine (civic family): who joins a side's
 * group, which owners join an employers' association and who speaks for a
 * group. A drawn place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every resident a full person, played 120 days.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { countedPersonOf } from "../counted-actor";
import { gameStartDate } from "../game-start";
import { addDays } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { drawnRaceWorld, RUN_SEED, weightOf } from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { setTraitProbe } from "../trait-probe";
import { campaignParameter, personLean } from "../campaign-views";
import { viewOn } from "./views";
import { ownerOf } from "./business";
import {
  groupDraw,
  INTEREST_GROUPS_MODULE_ID,
  joinsGroup,
  ownerJoins,
  type GroupRow,
} from "./interest-groups";
import type { CoreAPI, CoreState, PersonState } from "../types";

const SEED = `${RUN_SEED}:interest-groups`;

let core: CoreState;
let api: CoreAPI;
let groups: GroupRow[];

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld(
    (attempt) => {
      const seed = `${SEED}:${attempt}`;
      return { seed, place: drawPlace(seed, "trait-wiring") };
    },
    120,
    undefined,
    2,
    // Both tests read a group residents joined, one with a resident speaker:
    // a town where none formed in the window moves the draw on.
    (world) => {
      const rows = world.api
        .moduleState(INTEREST_GROUPS_MODULE_ID)
        .table("groups")
        .rows() as unknown as GroupRow[];
      return rows.some(
        (g) =>
          (g.memberPersonIds ?? []).length &&
          g.lobbyistId &&
          world.core.people.has(g.lobbyistId),
      )
        ? null
        : "no group of residents with a resident speaker";
    },
  ));
  groups = api
    .moduleState(INTEREST_GROUPS_MODULE_ID)
    .table("groups")
    .rows() as unknown as GroupRow[];
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("interest-groups.member-join reads the resident's calibrated lean toward joining", () => {
  // At a weight of 0.115 most of who joins in a played town is how hard the
  // question pulls each resident and who they know in the group, so the
  // joiners' mean lean against everyone else's measures those, not the trait.
  // In one case, temperament decides the close calls at the decision's weight.
  it("the town's adults facing the same pull just under the bar join exactly when their lean at the decision's weight carries them over", () => {
    const residents = groups.filter((g) => (g.memberPersonIds ?? []).length);
    console.log(`groups of residents: ${residents.length}`);
    expect(residents.length).toBeGreaterThan(0);
    const weight = weightOf(core, "interest-groups.member-join");
    const short = 0.02;
    const pull = campaignParameter("groupJoinBar") - short;
    const year = Number(core.date.slice(0, 4));
    const adults = [...core.people.values()].filter(
      (p) => p.alive && year - Number(p.birthDate.slice(0, 4)) >= 18,
    );
    const rows = adults.map((p) => ({
      lean: decisionLean(
        core,
        p,
        "interest-groups.member-join",
        "join",
        "stay-out",
      ),
      joins: joinsGroup(api, p, pull, false, 0),
    }));
    const joined = rows.filter((r) => r.joins).map((r) => r.lean);
    const stayed = rows.filter((r) => !r.joins).map((r) => r.lean);
    console.log(
      `at a pull ${short} under the bar, weight ${weight}: ${joined.length} of ${rows.length} adults join (mean lean ${mean(joined).toFixed(3)}), ${stayed.length} stay out (${mean(stayed).toFixed(3)})`,
    );
    // Both sides are present, and the lean alone separates them at the weight.
    expect(joined.length).toBeGreaterThan(0);
    expect(stayed.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.joins).toBe(weight * r.lean > short);
    // With the trait weight at 0 nobody joins on a pull under the bar.
    expect(weight).toBeGreaterThan(0);
  });
});

describe("interest-groups.member-join weighs how strongly the group's members draw the resident in", () => {
  it("a resident with a close tie to a member joins on a question that pulls them too little to join alone", () => {
    const adults = [...core.people.values()].filter((p) => p.alive);
    let best:
      | {
          resident: PersonState;
          group: GroupRow;
          draw: number;
        }
      | undefined;
    for (const group of groups) {
      const members = new Set(group.memberPersonIds ?? []);
      if (members.size < 3) continue;
      for (const resident of adults) {
        if (members.has(resident.id)) continue;
        const draw = groupDraw(core, resident.id, members);
        if (!best || draw > best.draw) best = { resident, group, draw };
      }
    }
    console.log(
      `group draw: ${best?.resident.id} has a tie of closeness ${best?.draw.toFixed(2)} to a member of ${best?.group.id}`,
    );
    expect(best?.draw).toBeGreaterThan(0.3);
    // A pull of 0.3 is under the bar alone (0.44), whatever the resident's temperament (at most 0.115 of weight); with the member's tie it clears the bar.
    expect(joinsGroup(api, best!.resident, 0.3, false, 0)).toBe(false);
    expect(joinsGroup(api, best!.resident, 0.3, false, best!.draw)).toBe(true);
    // Nobody with no tie to a member is drawn.
    expect(groupDraw(core, best!.resident.id, new Set())).toBe(0);
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

describe("interest-groups.employer-join reads a counted owner's lean toward joining", () => {
  it("owners who are counted people, not full ones, weigh joining too, and two with the same stake decide differently for their temperament", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const seed = `${RUN_SEED}:employer-owners:${attempt}`;
      const place = drawPlace(seed, "trait-wiring");
      const start = gameStartDate();
      // The game's own build (two-level): most owners are counted until met.
      const world = buildBenchWorld(seed, start, {
        twoLevel: true,
        placeKey: place.key,
      });
      // The business engine records its owners on the first day.
      advanceCore(world.core, addDays(start, 1));
      const owners = [...world.core.organizations.values()].flatMap((org) => {
        const id = ownerOf(coreAPI(world.core), org.id);
        return id &&
          !world.core.people.has(id) &&
          countedPersonOf(world.core, id)
          ? [{ orgId: org.id, ownerId: id }]
          : [];
      });
      const calls: { actorId?: string; lean: number; yes?: boolean }[] = [];
      setTraitProbe({
        formula(row) {
          if (row.decisionId === "interest-groups.employer-join")
            calls.push({ actorId: row.actorId, lean: row.lean, yes: row.yes });
        },
      });
      let joined: string[] = [];
      try {
        // A bill that costs each of them a little more than the dues: the case is the same, so the lean settles it.
        const dues = campaignParameter("groupDuesMinor");
        joined = owners
          .filter((o) =>
            ownerJoins(coreAPI(world.core), o.orgId, dues * 1.1, dues),
          )
          .map((o) => o.ownerId);
      } finally {
        setTraitProbe(undefined);
      }
      tried.push(
        `${place.name} (${place.key}), seed ${seed}: ${owners.length} counted owners, ${calls.length} weighed`,
      );
      expect(calls.length, tried.join("; ")).toBe(owners.length);
      const yes = calls.filter((c) => c.yes);
      const no = calls.filter((c) => !c.yes);
      if (!yes.length || !no.length) continue;
      const mostWilling = yes.sort((a, b) => b.lean - a.lean)[0]!;
      const leastWilling = no.sort((a, b) => a.lean - b.lean)[0]!;
      console.log(
        `employer-join at ${tried.at(-1)}: ${mostWilling.actorId} (lean ${mostWilling.lean.toFixed(3)}) joined; ${leastWilling.actorId} (lean ${leastWilling.lean.toFixed(3)}) stayed out; ${joined.length} of ${owners.length} joined`,
      );
      expect(mostWilling.lean).toBeGreaterThan(leastWilling.lean);
      expect(joined).toContain(mostWilling.actorId);
      expect(joined).not.toContain(leastWilling.actorId);
      return;
    }
    throw new Error(`no draw held owners who split: ${tried.join("; ")}`);
  }, 300_000);
});
