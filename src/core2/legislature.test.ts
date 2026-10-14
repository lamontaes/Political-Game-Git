/**
 * Golden path steps 6 to 9 (M3-01, M3-02, M3-04, first slice), in a random
 * place: a council member writes an ordinance with real amounts starting
 * from the law in force, learns two members' stakes and trades for a vote,
 * the council votes with each member's recorded reasons (on the record), the
 * mayor acts where the form of government gives a veto, and the law changes
 * the town on its effective date: named workers paid under the new floor are
 * raised. A town whose state preempts local minimum wages gets the block, in
 * the recorded rule's words.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { LAWS_MODULE_ID, lawInForce, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord, votesOf } from "./modules/record";
import {
  budgetsOf,
  enactedBudgetChanges,
  governments,
  openBudgets,
  setBudgetPriorities,
} from "./modules/budgets";
import {
  billOf,
  committeeRecords,
  draftBill,
  holdVote,
  learnStake,
  castMemberVote,
  mayorVeto,
  executiveDecision,
  LEGISLATURE_MODULE_ID,
  memberPosition,
  obligationsOf,
  FEDERAL_HOUSE,
  leanOf,
  memberKey,
  members,
  offerDeal,
  openLegislature,
  votesOn,
  authorityFor,
  askToCarry,
  type Provision,
} from "./modules/legislature";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { partySide } from "./appointments";
import { officialLean, officialOf } from "./modules/officials";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { billCatalog, provisionFor } from "./bill-catalog";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`legislature:${Date.now()}`).digest("hex");
const authority = JSON.parse(
  readFileSync(
    "data/research/laws/starting-law-2026/labor-workforce.json",
    "utf8",
  ),
).questions["us-policy-positions:labor-workforce.local-minimum-wage-authority"]
  .answers as Record<string, { answer: string; preempts?: boolean }>;
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
/** A town with its own council, in a state of the given kind. */
function town(states: readonly string[], salt: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = pick(states, `${salt}:${attempt}`);
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, `${salt}:place:${attempt}`).key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 250,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    const api = coreAPI(core);
    const council = townSeats(api).filter(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    if (council.length >= 3) return { core, api, key, council };
  }
  throw new Error("no town with a seated council");
}

describe(
  "golden path steps 6 to 9: write, negotiate, vote, sign, the town changes",
  { timeout: 300_000 },
  () => {
    it("an ordinance raising the minimum wage passes or fails on members' reasons and, if enacted, raises named workers", () => {
      const allowing = Object.keys(authority)
        .filter((s) => authority[s]!.answer === "yes")
        .sort();
      const { core, api, key, council } = town(allowing, "allow");
      const you = council[0]!.holder!.personId!;
      const office = council[0]!.office.id;
      const floor = lawInForce(api, "minimum-wage").value!;
      // Real amounts, from the law in force: two dollars over today's floor.
      const bill = draftBill(api, {
        bodyOfficeId: office,
        sponsorId: you,
        provisions: [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: floor + 200,
            unit: "minor/hour",
          },
        ],
      });
      expect(bill.status).toBe("drafted");
      expect(bill.number).toMatch(/^2026-\d{3}$/);
      expect(bill.authority[0]!.allowed).toBe(true);
      // Learn two members' stakes, through a conversation and their record.
      const others = council.slice(1).map((s) => s.holder!.personId!);
      const stakes = [
        learnStake(api, bill.id, others[0]!, "conversation"),
        learnStake(api, bill.id, others[1]!, "record"),
      ];
      // Trade with the least supportive of them: a deal changes the terms on record.
      const target = [...stakes].sort((a, b) => a.total - b.total)[0]!;
      const deal = offerDeal(api, {
        billId: bill.id,
        memberId: target.memberId,
        kind: "back-their-item",
      });
      // The offer is on the record either way (audit 3, deals): taken, the
      // sponsor owes it and it moves the member; declined, it moves no one.
      expect(billOf(api, bill.id).deals).toHaveLength(1);
      if (deal.accepted) {
        expect(deal.after.deal).toBeGreaterThan(deal.before.deal);
        expect(
          obligationsOf(api, bill.sponsorId).some(
            (o) => o.owedTo === target.memberId,
          ),
        ).toBe(true);
      } else {
        expect(deal.after.total).toBe(deal.before.total);
        expect(billOf(api, bill.id).deals[0]!.status).toBe("declined");
        expect(learnStake(api, bill.id, target.memberId, "record").deal).toBe(
          0,
        );
      }
      // The vote: each member's reasons are recorded, and on the record.
      const after = holdVote(api, bill.id);
      const votes = votesOn(api, bill.id);
      expect(votes.length).toBeGreaterThanOrEqual(council.length);
      for (const v of votes)
        expect(v.position.total).toBe(
          v.position.views +
            v.position.constituents +
            v.position.sponsor +
            v.position.deal +
            v.position.trait,
        );
      for (const m of council.map((s) => s.holder!.personId!)) {
        const v = votes.find((x) => x.memberId === m)!;
        if (v.vote !== "abstain")
          expect(votesOf(api, m).some((r) => r.measureId === bill.number)).toBe(
            true,
          );
      }
      // If it became law: on its date the town's law changes and named workers are raised.
      if (
        after.status === "enacted" ||
        after.status === "signed" ||
        after.status === "overridden"
      ) {
        const row = (
          api
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .query("bySeriesOnly", ["minimum-wage"]) as unknown as {
            effectiveDate: string;
            terms?: { enactedBy?: string };
          }[]
        ).find((r) => r.terms?.enactedBy === bill.number)!;
        const commitment = [...core.work.commitments.values()].find(
          (c) =>
            c.endsAt === undefined &&
            core.visiblePlaceIds.has(
              core.organizations.get(c.organizationId)!.placeId,
            ),
        );
        // Edge-case fixture: one generated worker paid exactly today's floor, as the opening should pay (see OPUS-CORE need).
        if (commitment)
          core.work.commitments.set(commitment.id, {
            ...commitment,
            hourlyMinor: floor,
          });
        advanceCore(
          core,
          new Date(Date.parse(`${row.effectiveDate}T00:00:00Z`) + 86_400_000)
            .toISOString()
            .slice(0, 10),
        );
        expect(lawInForce(api, "minimum-wage").value).toBe(floor + 200);
        if (commitment)
          expect(core.work.commitments.get(commitment.id)!.hourlyMinor).toBe(
            floor + 200,
          );
      }
      govReport(
        "legislature",
        JSON.stringify({
          place: key,
          seed,
          bill: bill.number,
          from: floor,
          to: floor + 200,
          cost: bill.costEstimate,
          stakes,
          deal: deal.after,
          status: after.status,
          votes: votes.map(
            (v) => `${v.memberId}: ${v.vote} (${v.position.total.toFixed(2)})`,
          ),
        }),
      );
    });

    it("an ordinance adding to a budget line changes the city's budget when it passes", () => {
      const allowing = Object.keys(authority).sort();
      const { core, api, council } = town(allowing, "budget");
      openBudgets(core);
      const cityGov = governments(api).find((g) => g.level === "city");
      const city = cityGov ? budgetsOf(api, cityGov.id)[0] : undefined;
      if (!city) return;
      const before = city.spendingMinor.parks ?? 0;
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: council[0]!.holder!.personId!,
        provisions: [{ kind: "budget-line", line: "parks", value: 50_000_000 }],
      });
      expect(bill.status).toBe("drafted");
      const after = holdVote(api, bill.id);
      const now = budgetsOf(api, city.governmentId).find(
        (b) => b.fiscalYear === city.fiscalYear,
      )!;
      if (["enacted", "signed", "overridden"].includes(after.status)) {
        expect(now.spendingMinor.parks).toBe(before + 50_000_000);
        expect(now.adoptedBy).toContain(bill.number);
      } else expect(now.spendingMinor.parks ?? 0).toBe(before);
      govReport(
        "legislature",
        JSON.stringify({
          budgetBill: bill.number,
          status: after.status,
          parksBefore: before,
          parksAfter: now.spendingMinor.parks,
          votes: votesOn(api, bill.id).map(
            (v) => `${v.vote} (${v.position.total.toFixed(2)})`,
          ),
        }),
      );
    });

    it("a state bill moves through both chambers on the same engine, the governor acts, and members' votes are on their records", () => {
      const states = Object.keys(authority)
        .filter(
          (k) =>
            ![
              "US-NE",
              "US-DC",
              "US-AS",
              "US-GU",
              "US-MP",
              "US-VI",
              "US-PR",
            ].includes(k),
        )
        .sort();
      const { core, api } = town(states, "state");
      const lower = townSeats(api).find(
        (s) => s.office.kind === "legislature-lower",
      )!;
      const sponsor = lower.holder!;
      const sponsorKey = sponsor.personId ?? `official:${sponsor.id}`;
      const floor = lawInForce(api, "minimum-wage").value!;
      const bill = draftBill(api, {
        bodyOfficeId: lower.office.id,
        sponsorId: sponsorKey,
        provisions: [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: floor + 100,
            unit: "minor/hour",
          },
        ],
      });
      expect(bill.status).toBe("drafted");
      const after = holdVote(api, bill.id);
      // The chamber is large: the bill went to committee first, on the record.
      const committees = committeeRecords(api, bill.id);
      expect(committees.length).toBeGreaterThanOrEqual(1);
      const first = committees[0]!;
      expect(first.memberIds).toContain(first.chairId);
      if (!first.heard || !first.reported) expect(after.status).toBe("failed");
      const votes = votesOn(api, bill.id) as unknown as {
        memberId: string;
        vote: string;
        chamber?: string;
      }[];
      const chambers = new Set(votes.map((v) => v.chamber).filter(Boolean));
      if (after.status !== "failed") expect(chambers.size).toBe(2);
      if (first.reported)
        expect(
          votesOf(api, sponsorKey).some((r) => r.measureId === bill.number),
        ).toBe(true);
      if (["enacted", "signed", "overridden"].includes(after.status)) {
        const row = (
          api
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .query("bySeriesOnly", ["minimum-wage"]) as unknown as {
            effectiveDate: string;
            level: string;
            terms?: { enactedBy?: string };
          }[]
        ).find((r) => r.terms?.enactedBy === bill.number)!;
        expect(row.level).toBe("state");
        advanceCore(
          core,
          new Date(Date.parse(`${row.effectiveDate}T00:00:00Z`) + 86_400_000)
            .toISOString()
            .slice(0, 10),
        );
        expect(lawInForce(api, "minimum-wage").value).toBeGreaterThanOrEqual(
          floor + 100,
        );
      }
      govReport(
        "legislature",
        JSON.stringify({
          stateBill: bill.number,
          status: after.status,
          chambers: [...chambers],
          yesNo: [...chambers].map(
            (c) =>
              `${c}: ${votes.filter((v) => v.chamber === c && v.vote === "yes").length}-${votes.filter((v) => v.chamber === c && v.vote === "no").length}`,
          ),
          executive: votes.find((v) => v.vote === "sign" || v.vote === "veto")
            ?.vote,
        }),
      );
    });

    it("the mayor's budget priorities go to the council's vote at the fiscal year's start", () => {
      const { core, api } = town(Object.keys(authority).sort(), "budget-vote");
      openBudgets(core);
      const city = governments(api).find((g) => g.level === "city");
      if (!city) return;
      const mayor = townSeats(api).find(
        (s) => s.office.kind === "mayor" && s.holder?.personId,
      );
      setBudgetPriorities(api, {
        governmentId: city.id,
        setBy: mayor?.holder?.personId ?? "council",
        changes: { parks: 10_000_000 },
      });
      const before = budgetsOf(api, city.id)[0]!;
      const start = `${before.fiscalYear + 1}-${city.fiscalYearStart}`;
      advanceCore(core, start);
      const next = budgetsOf(api, city.id).find(
        (b) => b.fiscalYear === before.fiscalYear + 1,
      )!;
      expect(next.adoptedOn).toBe(start);
      expect(next.adoptedBy).toMatch(/council vote|council rejected/);
      if (next.adoptedBy.startsWith("council vote"))
        expect(next.spendingMinor.parks).toBe(
          (before.spendingMinor.parks ?? 0) + 10_000_000,
        );
      govReport(
        "legislature",
        JSON.stringify({
          budgetVote: next.adoptedBy,
          parksBefore: before.spendingMinor.parks,
          parksAfter: next.spendingMinor.parks,
        }),
      );
    }, 120_000); // a whole fiscal year of daily work in one town; 30 s is too tight on slower runners

    it("a budget bill that passes changes the adopted budget by its lines; one that fails carries the enacted lines", () => {
      const { core, api, key } = town(
        Object.keys(authority).sort(),
        "budget-lines",
      );
      openBudgets(core);
      const city = governments(api).find((g) => g.level === "city");
      if (!city) return;
      // No priorities set: the elected executive proposes from their own lean.
      const before = budgetsOf(api, city.id)[0]!;
      const start = `${before.fiscalYear + 1}-${city.fiscalYearStart}`;
      advanceCore(core, start);
      const next = budgetsOf(api, city.id).find(
        (b) => b.fiscalYear === before.fiscalYear + 1,
      )!;
      const councils = new Set(
        townSeats(api)
          .filter((s) => s.office.kind === "council")
          .map((s) => s.office.id),
      );
      const bill = (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as {
          kind?: string;
          status: string;
          number: string;
          bodyOfficeId: string;
          provisions: { line?: string; value: number }[];
        }[]
      ).find(
        (b) =>
          b.kind === "budget" &&
          councils.has(b.bodyOfficeId) &&
          next.adoptedBy.includes(b.number),
      );
      const label = `${key}, seed ${seed}: ${next.adoptedBy}`;
      expect(bill, label).toBeDefined();
      const changes: Record<string, number> = {};
      if (bill!.status === "enacted")
        for (const p of bill!.provisions)
          changes[p.line!] = (changes[p.line!] ?? 0) + p.value;
      for (const line of new Set([
        ...Object.keys(before.spendingMinor),
        ...Object.keys(changes),
      ]))
        expect(next.spendingMinor[line] ?? 0, `${label}: ${line}`).toBe(
          Math.max(0, (before.spendingMinor[line] ?? 0) + (changes[line] ?? 0)),
        );
      expect(enactedBudgetChanges(api, city.id), label).toEqual(changes);
      govReport(
        "legislature",
        JSON.stringify({
          budgetBill: bill!.number,
          status: bill!.status,
          changes,
        }),
      );
    }, 120_000); // a whole fiscal year of daily work in one town

    it("the bill paper's catalog: 18 menus, amounts from the law in force, picks that draft real bills", () => {
      const { api, council } = town(Object.keys(authority).sort(), "catalog");
      const menus = billCatalog(api, "city");
      expect(menus).toHaveLength(18);
      const all = menus.flatMap((m) => m.topics.flatMap((t) => t.policies));
      const wage = all.find((p) => p.id === "law:minimum-wage")!;
      expect(wage.inForce).toBe(lawInForce(api, "minimum-wage").value);
      expect(all.some((p) => p.kind === "policy-question")).toBe(true);
      expect(all.some((p) => p.kind === "budget-line")).toBe(true);
      const provisions = [
        provisionFor({
          policyId: "budget:parks",
          operation: "expand",
          amount: 5_000_000,
        }),
        provisionFor({
          policyId: all.find((p) => p.kind === "policy-question")!.id,
          operation: "enact",
        }),
      ];
      if (wage.authority.allowed)
        provisions.push(
          provisionFor({
            policyId: wage.id,
            operation: "raise",
            amount: wage.inForce! + 100,
            effectiveDate: "2026-07-01",
          }),
        );
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: council[0]!.holder!.personId!,
        provisions,
      });
      expect(bill.provisions).toHaveLength(provisions.length);
      expect(["drafted", "blocked"]).toContain(bill.status);
      expect(() =>
        provisionFor({ policyId: wage.id, operation: "enact" }),
      ).toThrow();
    });

    it("a town whose state preempts local minimum wages gets the block in the rule's words", () => {
      const preempting = Object.keys(authority)
        .filter((s) => authority[s]!.preempts === true)
        .sort();
      const { api, council } = town(preempting, "preempt");
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: council[0]!.holder!.personId!,
        provisions: [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: lawInForce(api, "minimum-wage").value! + 200,
          },
        ],
      });
      expect(bill.status).toBe("blocked");
      expect(bill.authority[0]!.warning).toBe("preempted");
      expect([
        "state-preempts-local-minimum-wage",
        "state-gives-no-local-minimum-wage",
      ]).toContain(bill.authority[0]!.reason);
      expect(holdVote(api, bill.id).status).toBe("blocked");
    });

    it("a body may only set the amounts the law gives its level (no council sets SNAP or the Medicare tax)", () => {
      const states = Object.keys(authority).sort();
      const { api, council } = town(states, "powers");
      const sponsor = council[0]!.holder!.personId!;
      for (const series of ["snap-maximum", "medicare-tax", "medicaid-match"]) {
        const bill = draftBill(api, {
          bodyOfficeId: council[0]!.office.id,
          sponsorId: sponsor,
          provisions: [{ kind: "law-amount", series, value: 1 }],
        });
        expect(bill.status, series).toBe("blocked");
        expect(bill.authority[0]!.source.length).toBeGreaterThan(0);
      }
      const lower = townSeats(api).find(
        (s) =>
          s.office.kind === "legislature-lower" ||
          s.office.kind === "legislature-unicameral",
      );
      if (lower) {
        const stateBill = draftBill(api, {
          bodyOfficeId: lower.office.id,
          sponsorId: lower.holder?.personId ?? `official:${lower.holder!.id}`,
          provisions: [
            { kind: "law-amount", series: "snap-maximum", value: 1 },
          ],
        });
        expect(stateBill.status).toBe("blocked");
      }
      const house = townSeats(api).find((s) => s.office.kind === "us-house");
      if (house) {
        const federal = draftBill(api, {
          bodyOfficeId: house.office.id,
          sponsorId: `official:${house.holder?.id ?? "x"}`,
          provisions: [
            { kind: "law-amount", series: "snap-maximum", value: 1 },
          ],
        });
        expect(federal.status).toBe("drafted");
      }
    });

    it("the player casts their own vote and, as mayor, decides to sign or veto (audit 3)", () => {
      const states = Object.keys(authority).sort();
      const { core, api, council } = town(states, "player");
      const player = council[0]!.holder!.personId!;
      (core as unknown as { playerId: string }).playerId = player;
      const floor = lawInForce(api, "minimum-wage").value!;
      // A raise where the state lets towns set a wage; elsewhere a policy
      // question the town may answer.
      const wage: Provision = {
        kind: "law-amount",
        series: "minimum-wage",
        value: floor + 100,
        unit: "minor/hour",
      };
      const provision =
        [
          wage,
          ...PLATFORM_QUESTIONS.map((question): Provision => ({
            kind: "policy-question",
            question,
            value: 1,
          })),
        ].find((p) => authorityFor(api, p).allowed) ?? wage;
      const draft = () =>
        draftBill(api, {
          bodyOfficeId: council[0]!.office.id,
          sponsorId: council[1]!.holder!.personId!,
          provisions: [provision],
        });
      // Not cast: the player is never voted for, so they abstain.
      const first = draft();
      if (first.status === "blocked") return;
      holdVote(api, first.id);
      expect(
        votesOn(api, first.id).find((v) => v.memberId === player)?.vote,
      ).toBe("abstain");
      // Cast: the player's vote is their choice, whatever the engine would say.
      const second = draft();
      const mine =
        memberPosition(api, second.id, player).total > 0 ? "no" : "yes";
      castMemberVote(api, second.id, player, mine);
      holdVote(api, second.id);
      expect(
        votesOn(api, second.id).find((v) => v.memberId === player)?.vote,
      ).toBe(mine);
      // As mayor: a passed ordinance waits on the player's desk.
      const mayor = townSeats(api).find(
        (s) => s.office.kind === "mayor" && s.holder?.personId,
      );
      if (!mayor) return;
      (core as unknown as { playerId: string }).playerId =
        mayor.holder!.personId!;
      const third = draft();
      for (const seat of council)
        castMemberVote(api, third.id, seat.holder!.personId!, "yes");
      const waiting = holdVote(api, third.id);
      // Only where the state gives the mayor a veto does the bill wait for
      // a signature; otherwise the passed ordinance is law.
      if (!mayorVeto(api).veto) {
        expect(waiting.status).toBe("enacted");
        return;
      }
      expect(waiting.status).toBe("awaiting-signature");
      const decided = executiveDecision(api, third.id, true);
      expect(["signed", "enacted"]).toContain(decided.status);
      // Left on the desk past the office's window, a bill becomes law
      // unsigned, and the law records that it did.
      const fourth = draft();
      for (const seat of council)
        castMemberVote(api, fourth.id, seat.holder!.personId!, "yes");
      holdVote(api, fourth.id);
      const left = billOf(api, fourth.id) as typeof fourth & {
        signBy?: string;
      };
      expect(left.status).toBe("awaiting-signature");
      expect(left.signBy).toBeDefined();
      const after = new Date(
        Date.parse(`${left.signBy}T00:00:00Z`) + 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      advanceCore(core, after);
      const law = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows()
        .find(
          (row) =>
            (row as { terms?: { enactedBy?: string } }).terms?.enactedBy ===
            fourth.number,
        ) as { terms?: { decision?: string; decidedBy?: string } } | undefined;
      expect(law?.terms?.decision).toBe("unsigned");
      expect(law?.terms?.decidedBy).toBe(mayor.holder!.personId);
    });
  },
);

describe("asking a member to carry a bill", () => {
  it("the member answers from their own position, their tie to the asker and the asker's standing", () => {
    const states = Object.keys(authority).sort();
    const { core, api, council } = town(states, "carry");
    const seated = new Set(council.map((s) => s.holder?.personId));
    const asker = [...core.people.values()]
      .filter((p) => p.alive && !seated.has(p.id) && p.tier !== "husk")
      .sort(
        (a, b) => b.knownIds.size - a.knownIds.size || a.id.localeCompare(b.id),
      )[0]!;
    const member = council[0]!.holder!.personId!;
    const provision =
      PLATFORM_QUESTIONS.map((question): Provision => ({
        kind: "policy-question",
        question,
        value: 1,
      })).find((p) => authorityFor(api, p).allowed) ?? null;
    if (!provision) return;
    const before =
      api.state.relationships.get([asker.id, member].sort().join(":"))?.level ??
      0;
    const asked = askToCarry(api, {
      askerId: asker.id,
      memberId: member,
      bodyOfficeId: council[0]!.office.id,
      provisions: [provision],
    });
    // The answer is the sum of the recorded reasons, never a roll.
    expect(asked.carried).toBe(asked.position.total + asked.standing > 0);
    expect(asked.standing).toBeGreaterThanOrEqual(0);
    if (asked.carried) {
      const bill = billOf(api, asked.billId!) as ReturnType<typeof billOf> & {
        requestedBy?: string;
      };
      expect(bill.sponsorId).toBe(member);
      expect(bill.requestedBy).toBe(asker.id);
    } else expect(asked.billId).toBeNull();
    // Asking is a conversation: the two know each other a little better.
    expect(
      api.state.relationships.get([asker.id, member].sort().join(":"))?.level ??
        0,
    ).toBeGreaterThan(before);
  });
});

describe("a Congress member from elsewhere", () => {
  // Regression (wire-all-modules, Oct 12): reading one member's lean rebuilt
  // the whole chamber, once per member per vote. Since OPUS-OFFICIALS every
  // member is a person: their lean is their own position, read from their
  // official record, and the parties' medians sit on their own sides.
  it("leans by their own position, as the chamber lists them", () => {
    const state = pick(
      [...lifePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      "congress-lean:state",
    );
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "congress-lean:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 20,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openLegislature(core);
    const api = coreAPI(core);
    const house = members(api, FEDERAL_HOUSE);
    expect(house.length, `seed ${seed}, ${state} place ${key}`).toBeGreaterThan(
      400,
    );
    const leans = new Map<number, number[]>();
    for (const term of house) {
      const official = officialOf(api, memberKey(term));
      expect(official, term.id).toBeDefined();
      const lean = leanOf(api, memberKey(term));
      expect(lean, term.id).toBe(officialLean(official!));
      const side = partySide(term.party);
      leans.set(side, [...(leans.get(side) ?? []), lean]);
    }
    const median = (xs: number[]) =>
      [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    expect(median(leans.get(-1)!)).toBeLessThan(0);
    expect(median(leans.get(1)!)).toBeGreaterThan(0);
  });
});
