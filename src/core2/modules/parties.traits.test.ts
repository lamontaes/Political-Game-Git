/**
 * Personality in the parties engine (civic family): who joins the party they
 * are tied to, who goes to its meetings, and whom members back as chair. A
 * drawn place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every
 * resident a full person, played 120 days.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { adultsOf, drawnRaceWorld, RUN_SEED } from "../trait-test-kit";
import { campaignParameter } from "../campaign-views";
import { homeDistanceMiles } from "../home-distance";
import { decisionLean } from "../trait-decisions";
import {
  attendCase,
  PARTIES_MODULE_ID,
  partyMeetings,
  type PartyRow,
} from "./parties";
import type { CoreAPI, CoreState } from "../types";

const SEED = `${RUN_SEED}:parties`;

let core: CoreState;
let api: CoreAPI;
let parties: PartyRow[];

// Building and playing a drawn town 120 days takes about 30 seconds, inside
// the 60 second hook limit.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld((attempt) => {
    const seed = `${SEED}:${attempt}`;
    return { seed, place: drawPlace(seed, "trait-wiring") };
  }, 120));
  parties = api
    .moduleState(PARTIES_MODULE_ID)
    .table("parties")
    .rows() as unknown as PartyRow[];
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("parties.attend weighs the member's free time and distance", () => {
  const attended = () => {
    const out = new Set<string>();
    for (const party of parties)
      for (const meeting of partyMeetings(api, party.id))
        for (const id of meeting.attendeeIds)
          if (id !== meeting.leaderId) out.add(id);
    return out;
  };

  it("a member's case for going falls with the hours their work takes and with how far they live", () => {
    // Every adult in town has a case for going (a member weighs it each meeting), so the whole town shows how it varies.
    const people = adultsOf(core);
    const weeklyWork = (id: string) =>
      [...(core.work.commitmentsByPerson.get(id) ?? [])]
        .map((c) => core.work.commitments.get(c)?.expectedWeeklyMinutes ?? 0)
        .reduce((a, b) => a + b, 0);
    const cases = people.map((p) => attendCase(core, p));
    const work = people.map((p) => weeklyWork(p.id));
    const miles = people.map((p) => homeDistanceMiles(core, p.householdId));
    const correlation = (xs: number[], ys: number[]) => {
      const mx = mean(xs),
        my = mean(ys);
      const cov = mean(xs.map((x, i) => (x - mx) * (ys[i]! - my)));
      const sx = Math.sqrt(mean(xs.map((x) => (x - mx) ** 2)));
      const sy = Math.sqrt(mean(ys.map((y) => (y - my) ** 2)));
      return sx && sy ? cov / (sx * sy) : 0;
    };
    const byWork = correlation(cases, work);
    // Among adults whose work already takes a full week the case varies only with distance.
    const full = people
      .map((_, i) => i)
      .filter((i) => work[i]! >= campaignParameter("turnoutWorkWeekMinutes"));
    const byMiles = correlation(
      full.map((i) => cases[i]!),
      full.map((i) => miles[i]!),
    );
    const came = attended();
    console.log(
      `adults: ${people.length}, ${came.size} members came to a meeting; the case falls with work hours (correlation ${byWork.toFixed(2)}) and, for those whose work takes a full week, with distance (${byMiles.toFixed(2)})`,
    );
    expect(people.length).toBeGreaterThan(100);
    expect(byWork).toBeLessThan(-0.2);
    expect(full.length).toBeGreaterThan(50);
    expect(byMiles).toBeLessThan(-0.9);
  });
});

describe("parties.join reads the person's calibrated lean toward joining", () => {
  it("the people tied to a party who did not join it lean away from joining more than those who did", () => {
    const ties = api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .rows() as unknown as { personId: string; partyId: string | null }[];
    const organizationOf = new Map(
      parties.map((p) => [p.id, p.organizationId]),
    );
    const joined: number[] = [];
    const notJoined: number[] = [];
    for (const tie of ties) {
      if (!tie.partyId || !core.people.has(tie.personId)) continue;
      const lean = decisionLean(
        core,
        core.people.get(tie.personId)!,
        "parties.join",
        "join",
        "stay-out",
      );
      (core.memberships.has(
        `${tie.personId}:${organizationOf.get(tie.partyId)}`,
      )
        ? joined
        : notJoined
      ).push(lean);
    }
    console.log(
      `party joining: ${joined.length} joined (mean lean ${mean(joined).toFixed(3)}), ${notJoined.length} did not (${notJoined.length ? mean(notJoined).toFixed(3) : "-"})`,
    );
    expect(joined.length).toBeGreaterThan(0);
    expect(notJoined.length).toBeGreaterThan(0);
    expect(mean(joined)).toBeGreaterThan(mean(notJoined));
  });
});
