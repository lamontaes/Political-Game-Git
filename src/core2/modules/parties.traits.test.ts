/**
 * Personality in the parties engine (civic family): who joins the party they
 * are tied to, who goes to its meetings, and whom members back as chair. A
 * drawn place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every
 * resident a full person, played 120 days.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { drawnRaceWorld, RUN_SEED } from "../trait-test-kit";
import { decisionLean } from "../trait-decisions";
import { PARTIES_MODULE_ID, partyMeetings, type PartyRow } from "./parties";
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

describe("parties.attend reads the member's calibrated lean toward taking part", () => {
  it("those who came to a party meeting lean more toward attending than the members who never did", () => {
    const attendedBy = new Set<string>();
    let meetings = 0;
    for (const party of parties)
      for (const meeting of partyMeetings(api, party.id)) {
        meetings += 1;
        for (const id of meeting.attendeeIds)
          if (id !== meeting.leaderId) attendedBy.add(id);
      }
    const members = new Set<string>();
    for (const party of parties)
      for (const id of core.people.keys())
        if (core.memberships.has(`${id}:${party.organizationId}`))
          members.add(id);
    const lean = (id: string) =>
      decisionLean(
        core,
        core.people.get(id)!,
        "parties.attend",
        "attend",
        "stay-home",
      );
    const came = [...attendedBy].map(lean);
    const stayed = [...members].filter((id) => !attendedBy.has(id)).map(lean);
    console.log(
      `party meetings: ${meetings}, ${came.length} members came (mean lean ${came.length ? mean(came).toFixed(3) : "-"}), ${stayed.length} never did (${stayed.length ? mean(stayed).toFixed(3) : "-"})`,
    );
    expect(came.length).toBeGreaterThan(0);
    expect(stayed.length).toBeGreaterThan(0);
    expect(mean(came)).toBeGreaterThan(mean(stayed));
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
