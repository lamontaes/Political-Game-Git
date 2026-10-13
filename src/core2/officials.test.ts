/**
 * M1-12 (OPUS-OFFICIALS), in a random place among all 56: every member of
 * Congress and the town's state's officials are people from the opening,
 * views vary within each party, independents keep their caucus and reasons,
 * and a federal and a state vote split within a party on members' own
 * recorded reasons, not on a party line.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import {
  openOffices,
  OFFICES_MODULE_ID,
  type TermRow,
} from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  draftBill,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  memberPosition,
  members,
  openLegislature,
} from "./modules/legislature";
import { allOfficials, officialOf } from "./modules/officials";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { partySide } from "./appointments";
import { realLocalities } from "./places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`officials:${Date.now()}`).digest("hex");

function world() {
  const places = [...realLocalities()].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const hash = createHash("sha256").update(`${seed}:place`).digest("hex");
  const key =
    process.env.GOLDEN_PATH_PLACE_KEY ??
    places[parseInt(hash.slice(0, 8), 16) % places.length]!.key;
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: key,
      startedAt: START,
      minimumPeople: 200,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openRecord(core);
  openLegislature(core);
  return { core, api: coreAPI(core), key };
}

describe(
  "M1-12 officials are people with their own reasons",
  { timeout: 600_000 },
  () => {
    it("seats Congress, governors and the state's officials as people; votes split within parties", () => {
      const { core, api, key } = world();
      const where = `place ${key}, seed ${seed}`;
      const house = members(api, FEDERAL_HOUSE);
      const senate = members(api, FEDERAL_SENATE);
      expect(house.length, where).toBeGreaterThanOrEqual(430);
      expect(senate.length, where).toBe(100);
      // Every member is a full person with traits and an official record.
      for (const term of [...house, ...senate]) {
        const person = core.people.get(term.personId ?? "");
        expect(person, `${term.seatId} ${where}`).toBeDefined();
        expect(Object.keys(person!.traits).length).toBeGreaterThan(0);
        expect(officialOf(api, term.personId!)?.seatId).toBeDefined();
      }
      // Every term the offices engine seats outside the town has its person.
      const terms = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[];
      expect(
        terms.every((t) => t.personId),
        where,
      ).toBe(true);
      const officials = allOfficials(api);
      expect(
        officials.filter((o) => o.officeKind === "governor").length,
      ).toBeGreaterThanOrEqual(50);
      // Views vary within a party: all three wings of each major party.
      for (const side of [-1, 1]) {
        const mine = officials.filter(
          (o) => o.bodyKind === "us-house" && partySide(o.party) === side,
        );
        expect(new Set(mine.map((o) => o.wing)).size, where).toBe(3);
        const ideals = mine.map((o) => o.ideal);
        expect(
          Math.max(...ideals) - Math.min(...ideals),
          where,
        ).toBeGreaterThan(0.3);
      }
      // Independents in the Senate keep the roster's caucus and a reason.
      const independents = officials.filter(
        (o) => o.bodyKind === "us-senate" && o.independent,
      );
      expect(independents.length, where).toBe(2);
      for (const o of independents) {
        expect(o.independent!.caucus).toBe("Democratic");
        expect(o.independent!.reason.length).toBeGreaterThan(0);
      }
      // Votes: across the policy questions, some split within a party, and
      // the caucusing independents vote with their caucus most of the time.
      const office = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .rows() as unknown as {
          id: string;
          kind: string;
        }[]
      ).find((o) => o.kind.startsWith("us-house"))!;
      let withinSplit = 0;
      let partyVotes = 0;
      let withCaucus = 0;
      let independentVotes = 0;
      for (const question of PLATFORM_QUESTIONS) {
        const bill = draftBill(api, {
          bodyOfficeId: office.id,
          sponsorId: memberKey(senate[0]!),
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        const votes = senate.map((m) => {
          const id = memberKey(m);
          const o = officialOf(api, id)!;
          const position = memberPosition(api, bill.id, id);
          // Each part is a recorded reason; together they make the position.
          expect(position.total).toBeCloseTo(
            position.views +
              position.constituents +
              position.sponsor +
              position.deal +
              position.lobby +
              position.trait +
              (position.party ?? 0) +
              (position.wing ?? 0) +
              (position.ambition ?? 0) +
              (position.press ?? 0),
          );
          return {
            o,
            yes: position.total > 0,
            side: partySide(o.independent?.caucus ?? o.party),
          };
        });
        const majority = (side: number) => {
          const mine = votes.filter((v) => v.side === side && !v.o.independent);
          return { yes: mine.filter((v) => v.yes).length, n: mine.length };
        };
        const d = majority(-1);
        const r = majority(1);
        if ((d.yes > 0 && d.yes < d.n) || (r.yes > 0 && r.yes < r.n))
          withinSplit += 1;
        const dYes = d.yes * 2 > d.n;
        if (dYes !== r.yes * 2 > r.n) {
          partyVotes += 1;
          for (const v of votes.filter((x) => x.o.independent)) {
            independentVotes += 1;
            if (v.yes === dYes) withCaucus += 1;
          }
        }
      }
      expect(withinSplit, where).toBeGreaterThan(0);
      // Not every question is a party vote: popular policies draw both parties.
      expect(partyVotes, where).toBeLessThan(PLATFORM_QUESTIONS.length);
      expect(withCaucus / Math.max(1, independentVotes), where).toBeGreaterThan(
        0.75,
      );
    });
  },
);
