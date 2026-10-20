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
import { coreAPI, registerModule } from "./state";
import {
  bribePull,
  considerBribe,
  corruptionModule,
} from "./modules/corruption";
import { LAWS_MODULE_ID, lawInForce, openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord, votesOf } from "./modules/record";
import {
  budgetsOf,
  departmentRequests,
  enactedBudgetChanges,
  governments,
  openBudgets,
  setBudgetPriorities,
} from "./modules/budgets";
import {
  appropriationsWithProjects,
  billOf,
  billTitle,
  projectRequestOf,
  requestProject,
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
  executiveOf,
  proposalRight,
  proposeAsExecutive,
  reviseBill,
  type Provision,
} from "./modules/legislature";
import { campaignParameter, PLATFORM_QUESTIONS } from "./campaign-views";
import { partySide } from "./appointments";
import { officialLean, officialOf } from "./modules/officials";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
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
/** A town whose budgets open with a city government (a territory has none). */
const withCity = (t: {
  core: ReturnType<typeof createLifeCore>;
  api: ReturnType<typeof coreAPI>;
}) => {
  openBudgets(t.core);
  return governments(t.api).some((g) => g.level === "city");
};

/** A town where some platform question may be enacted by its council. */
const withProvision = (t: {
  core: ReturnType<typeof createLifeCore>;
  api: ReturnType<typeof coreAPI>;
}) =>
  PLATFORM_QUESTIONS.some(
    (question) =>
      authorityFor(t.api, { kind: "policy-question", question, value: 1 })
        .allowed,
  );
/** ... and an elected mayor. */
const withProvisionAndMayor = (t: {
  core: ReturnType<typeof createLifeCore>;
  api: ReturnType<typeof coreAPI>;
}) =>
  withProvision(t) &&
  townSeats(t.api).some((s) => s.office.kind === "mayor" && s.holder?.personId);

/**
 * A town with a seated council of three or more. With `ready`, a town the
 * check turns down is passed over and the next is drawn (a test that needs a
 * city government says so here instead of ending early without a check).
 */
function town(
  states: readonly string[],
  salt: string,
  ready?: (t: {
    core: ReturnType<typeof createLifeCore>;
    api: ReturnType<typeof coreAPI>;
  }) => boolean,
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = pick(states, `${salt}:${attempt}`);
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
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
    if (council.length >= 3 && (!ready || ready({ core, api })))
      return { core, api, key, council };
  }
  throw new Error(
    `no town with a seated council${ready ? " and what the test needs" : ""} (${salt}, seed ${seed})`,
  );
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
      expect(bill.number).toMatch(/^2026-\d+$/);
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
      // A trade the member took is on their vote row, with no stage where it
      // was made outside a committee or the floor.
      if (deal.accepted) {
        const row = votes.find((x) => x.memberId === target.memberId)!;
        expect(row.traded, `vote ${row.id}`).toEqual([
          expect.objectContaining({ kind: "back-their-item" }),
        ]);
      }
      for (const m of council.map((s) => s.holder!.personId!)) {
        const v = votes.find((x) => x.memberId === m)!;
        if (v.vote !== "abstain")
          expect(
            votesOf(api, m).some((r) => r.measureId === bill.number),
            `member ${m} voted ${v.vote} on ${bill.number} with no vote record (vote ${v.id}, place ${key}, seed ${seed})`,
          ).toBe(true);
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
            estimate: boolean;
            source: string | string[];
            terms?: { enactedBy?: string };
          }[]
        ).find((r) => r.terms?.enactedBy === bill.number)!;
        // An ordinance takes effect a tunable delay after adoption, so its
        // row says it is an estimate and cites the delay.
        expect(row.estimate).toBe(true);
        expect(String(row.source)).toContain("ordinanceEffectiveDays");
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
      const { api, council } = town(allowing, "budget", withCity);
      const cityGov = governments(api).find((g) => g.level === "city")!;
      const city = budgetsOf(api, cityGov.id)[0]!;
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

    it("a state member's project request becomes a line naming the city, and the grant lands in the city treasury", () => {
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
      const tried: string[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { api, key } = town(
          states,
          `project:${attempt}`,
          (t) =>
            withCity(t) && governments(t.api).some((g) => g.level === "state"),
        );
        const city = governments(api).find((g) => g.level === "city")!;
        const lower = townSeats(api).find(
          (s) => s.office.kind === "legislature-lower",
        )!;
        const body = lower.office.id;
        const requests = members(api, body).map((term) =>
          requestProject(api, {
            bodyOfficeId: body,
            memberId: memberKey(term),
            recipientId: city.id,
            line: "parks",
            amountMinor: 10_000,
          }),
        );
        const bill = appropriationsWithProjects(api, {
          bodyOfficeId: body,
          sponsorId: memberKey(members(api, body)[0]!),
        });
        const after = requests.map((r) => projectRequestOf(api, r.id)!);
        // Every request is settled on standing, with its reasons kept.
        for (const r of after) {
          expect(["included", "dropped"], r.id).toContain(r.status);
          expect(r.reasons.length, r.id).toBe(2);
        }
        const included = after.filter((r) => r.status === "included");
        if (!bill || !included.length) {
          tried.push(`${key}: none included`);
          continue;
        }
        const lines = bill.provisions.filter((p) => p.recipientId === city.id);
        expect(lines.length).toBe(included.length);
        expect(included.every((r) => r.billId === bill.id)).toBe(true);
        const cityCash = () =>
          api.accounts().balance(api.accounts().main(city.organizationId));
        const before = cityCash();
        const result = holdVote(api, bill.id);
        if (!["enacted", "signed", "overridden"].includes(result.status)) {
          tried.push(`${key}: ${result.status}`);
          continue;
        }
        const paid = included.map((r) => projectRequestOf(api, r.id)!);
        for (const r of paid) {
          expect(r.status, r.id).toBe("paid");
          expect(r.grantId, r.id).toBe(`project-grant:${r.id}`);
          expect((r.paidMinor ?? 0) + (r.shortMinor ?? 0), r.id).toBe(
            r.amountMinor,
          );
        }
        expect(cityCash() - before).toBe(
          paid.reduce((sum, r) => sum + (r.paidMinor ?? 0), 0),
        );
        return;
      }
      throw new Error(
        `no state bill with a request passed: ${tried.join("; ")}, seed ${seed}`,
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
      const { core, api } = town(
        Object.keys(authority).sort(),
        "budget-vote",
        withCity,
      );
      const city = governments(api).find((g) => g.level === "city")!;
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

    it("a budget proposal that changes nothing still goes to the council as a bill with sections, and no bill is filed without one", () => {
      const { core, api, key } = town(
        Object.keys(authority).sort(),
        "budget-no-changes",
        withCity,
      );
      const city = governments(api).find((g) => g.level === "city")!;
      const mayor = townSeats(api).find(
        (s) => s.office.kind === "mayor" && s.holder?.personId,
      );
      // The executive proposes no change at all (batch 11: a passed bill with
      // no title, because it had no sections).
      setBudgetPriorities(api, {
        governmentId: city.id,
        setBy: mayor?.holder?.personId ?? "council",
        changes: {},
      });
      const before = budgetsOf(api, city.id)[0]!;
      advanceCore(core, `${before.fiscalYear + 1}-${city.fiscalYearStart}`);
      const bills = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as {
        id: string;
        kind?: string;
        number: string;
        provisions: Provision[];
      }[];
      const label = `${key}, seed ${seed}`;
      expect(
        bills.filter((b) => b.kind === "budget").length,
        label,
      ).toBeGreaterThan(0);
      for (const bill of bills) {
        expect(
          bill.provisions.length,
          `${label}: ${bill.number}`,
        ).toBeGreaterThan(0);
        expect(billTitle(billOf(api, bill.id)).subjects.length).toBeGreaterThan(
          0,
        );
      }
      expect(() =>
        draftBill(api, {
          bodyOfficeId: townSeats(api).find((s) => s.office.kind === "council")!
            .office.id,
          sponsorId: "council",
          provisions: [],
        }),
      ).toThrow(/at least one section/);
    }, 120_000); // a whole fiscal year of daily work in one town

    it("a budget bill that passes changes the adopted budget by its lines; one that fails carries the enacted lines", () => {
      const { core, api, key } = town(
        Object.keys(authority).sort(),
        "budget-lines",
        withCity,
      );
      const city = governments(api).find((g) => g.level === "city")!;
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

    it("a budget without an executive carries department lines without doubling funding", () => {
      const { core, api, council } = town(
        Object.keys(authority).sort(),
        "department-budget",
      );
      openBudgets(core);
      const city = governments(api).find((g) => g.level === "city")!;
      expect(city).toBeDefined();
      // Edge fixture: remove the executive office, leaving the elected council.
      const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
      for (const office of offices.rows())
        if (office.kind === "mayor") offices.remove(office.id);
      const before = budgetsOf(api, city.id)[0]!;
      const fy = before.fiscalYear + 1;
      const requested = departmentRequests(api, city, fy);
      advanceCore(core, `${fy}-${city.fiscalYearStart}`);
      const bill = (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as {
          kind?: string;
          bodyOfficeId: string;
          provisions: Provision[];
        }[]
      ).find(
        (b) => b.kind === "budget" && b.bodyOfficeId === council[0]!.office.id,
      )!;
      expect(bill).toBeDefined();
      expect(bill.provisions.length).toBeGreaterThan(0);
      expect(
        Object.fromEntries(bill.provisions.map((p) => [p.line, p.of])),
      ).toEqual(requested);
      expect(bill.provisions.every((p) => p.value === 0)).toBe(true);
      expect(
        budgetsOf(api, city.id).find((b) => b.fiscalYear === fy)?.spendingMinor,
      ).toEqual(requested);
      // A drawn town's fiscal year of daily work took 15 to 85 s alone across
      // sixteen runs (Oct 20) and 122 s inside a 92-file run on a loaded
      // machine, so the limit is twice the old one, for load and not a slow path.
    }, 240_000);

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
      // Every government sets its own employees' pay floor: a council may
      // draft one with no state permission, as may a legislature or Congress.
      const floor = all.find((p) => p.id === "law:public-pay-floor")!;
      expect(floor.authority.allowed).toBe(true);
      const floorBill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: council[0]!.holder!.personId!,
        provisions: [
          provisionFor({
            policyId: floor.id,
            operation: "raise",
            amount: 70_000,
          }),
        ],
      });
      expect(floorBill.status).toBe("drafted");
      expect(floorBill.provisions[0]).toMatchObject({
        series: "public-pay-floor",
        unit: "dollars/year",
      });
      // The paper is the bill: a section added, replaced and struck before
      // the vote rewrites the one record, checked again each time.
      expect(floorBill.provisions[0]).toMatchObject({
        policyId: floor.id,
        operation: "raise",
      });
      const parks = provisionFor({
        policyId: "budget:parks",
        operation: "expand",
        amount: 1_000_000,
      });
      const added = reviseBill(api, floorBill.id, { add: parks });
      expect(added.provisions).toHaveLength(2);
      expect(added.authority).toHaveLength(2);
      const lower = provisionFor({
        policyId: floor.id,
        operation: "raise",
        amount: 60_000,
      });
      const replaced = reviseBill(api, floorBill.id, {
        replace: 0,
        with: lower,
      });
      expect(replaced.provisions[0]!.value).toBe(60_000);
      expect(replaced.provisions[1]).toEqual(parks);
      const struck = reviseBill(api, floorBill.id, { strike: 1 });
      expect(struck.provisions).toEqual([lower]);
      expect(billOf(api, floorBill.id)).toEqual(struck);
      expect(() => reviseBill(api, floorBill.id, { strike: 5 })).toThrow();
      for (const level of ["federal", "state", "city"] as const)
        expect(
          billCatalog(api, level)
            .flatMap((m) => m.topics.flatMap((t) => t.policies))
            .some((p) => p.id === floor.id),
        ).toBe(true);
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
      const { core, api, council } = town(
        states,
        "player",
        withProvisionAndMayor,
      );
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
      expect(first.status).not.toBe("blocked");
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
      (core as unknown as { playerId: string }).playerId =
        mayor!.holder!.personId!;
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
    const { core, api, council } = town(states, "carry", withProvision);
    const seated = new Set(council.map((s) => s.holder?.personId));
    const asker = [...core.people.values()]
      .filter((p) => p.alive && !seated.has(p.id) && p.tier !== "husk")
      .sort(
        (a, b) => b.knownIds.size - a.knownIds.size || a.id.localeCompare(b.id),
      )[0]!;
    const member = council[0]!.holder!.personId!;
    const provision = PLATFORM_QUESTIONS.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    })).find((p) => authorityFor(api, p).allowed)!;

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

  it("the executive brings a bill through the member most inclined to carry it", () => {
    const states = Object.keys(authority).sort();
    const { api, council } = town(states, "propose", withProvision);
    const body = council[0]!.office.id;
    const provision = PLATFORM_QUESTIONS.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    })).find((p) => authorityFor(api, p).allowed)!;

    const { office, term } = executiveOf(api, body);
    const asked = proposeAsExecutive(api, {
      bodyOfficeId: body,
      provisions: [provision],
    });
    // No elected executive (a manager runs the town): nobody to propose.
    if (!office || !term) {
      expect(asked).toBeNull();
      return;
    }
    expect(proposalRight(api, office.kind).mode).toBe("by-request");
    expect(asked!.askerId).toBe(memberKey(term));
    // The sitting executive is known to every member.
    expect(asked!.standing).toBe(campaignParameter("carryStandingWeight"));
    expect(asked!.carried).toBe(asked!.position.total + asked!.standing > 0);
    if (asked!.carried)
      expect(billOf(api, asked!.billId!).sponsorId).toBe(asked!.memberId);
  });
});

describe("a bribe on a bill", () => {
  // A bribe is a payment for a decision: a member who took one on a bill
  // carries it in their position on that bill, part by part, and on no other.
  it("pulls the member who took it toward the payer's side, on that bill only", () => {
    const { core, api, council } = town(
      Object.keys(authority).sort(),
      "bribe",
      withProvision,
    );
    registerModule(core, corruptionModule);
    const provision = PLATFORM_QUESTIONS.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    })).find((p) => authorityFor(api, p).allowed)!;

    const body = council[0]!.office.id;
    const member = council[0]!.holder!.personId!;
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: council[1]!.holder!.personId!,
      provisions: [provision],
    });
    const other = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: council[1]!.holder!.personId!,
      provisions: [provision],
    });
    const before = memberPosition(api, bill.id, member);
    expect(before.bribe).toBe(0);
    // The town's wealthiest weigh it, each by their own reasons, until one
    // offers and the member takes it (or none does, in which case nothing moves).
    const offerers = [...core.people.values()]
      .filter((p) => p.alive && p.tier !== "husk" && p.id !== member)
      .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
      .slice(0, 40);
    let took = false;
    for (const offerer of offerers) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: member,
        stakeMinor: 50_000_000,
        subjectId: bill.id,
      });
      if (record?.taken) {
        took = true;
        break;
      }
    }
    const after = memberPosition(api, bill.id, member);
    expect(after.bribe).toBe(bribePull(api, member, bill.id));
    if (took) {
      expect(after.bribe).toBeLessThan(0);
      expect(after.total).toBeCloseTo(before.total + after.bribe, 9);
    } else expect(after.bribe).toBe(0);
    expect(memberPosition(api, other.id, member).bribe).toBe(0);
  });

  // The three outcomes of a bribe on a bill (pool item gov-u6): refused (no
  // pull, no payment), taken and delivered (the vote goes the payer's way
  // because the bribe tipped it), and taken but not delivered (the member's
  // other reasons outweigh it and they vote as they would have). The vote is
  // always the sign of the position, so each outcome is read from the record.
  it("refused moves no one; a taken bribe tips the vote only as far as the member's other reasons let it", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { core, api, council, key } = town(
        Object.keys(authority).sort(),
        `bribe-three:${attempt}`,
      );
      registerModule(core, corruptionModule);
      const provision =
        PLATFORM_QUESTIONS.map((question): Provision => ({
          kind: "policy-question",
          question,
          value: 1,
        })).find((p) => authorityFor(api, p).allowed) ?? null;
      if (!provision) {
        tried.push(`${key}: no provision the town may enact`);
        continue;
      }
      const body = council[0]!.office.id;
      const offerers = [...core.people.values()]
        .filter((p) => p.alive && p.tier !== "husk")
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        )
        .slice(0, 40);
      const outcomes = { refused: 0, delivered: 0, reneged: 0 };
      for (const seat of council) {
        const member = seat.holder!.personId!;
        const bill = draftBill(api, {
          bodyOfficeId: body,
          sponsorId: council.find((s) => s !== seat)!.holder!.personId!,
          provisions: [provision],
        });
        const before = memberPosition(api, bill.id, member);
        for (const offerer of offerers) {
          if (offerer.id === member) continue;
          const record = considerBribe(api, {
            offererId: offerer.id,
            officialId: member,
            stakeMinor: 50_000_000,
            subjectId: bill.id,
          });
          if (!record?.offered) continue;
          const after = memberPosition(api, bill.id, member);
          if (!record.taken) {
            // Refused: nothing paid, nothing moved.
            expect(after.bribe).toBe(0);
            expect(after.total).toBeCloseTo(before.total, 9);
            outcomes.refused += 1;
            continue;
          }
          expect(after.bribe).toBeLessThan(0);
          const wasYes = before.total > 0;
          const isYes = after.total > 0;
          if (wasYes && !isYes) outcomes.delivered += 1;
          else outcomes.reneged += 1;
          break;
        }
      }
      // Each bribe fell into exactly one outcome; draw again for a town where
      // nobody offered or took one.
      const seen = outcomes.refused + outcomes.delivered + outcomes.reneged;
      if (!seen) {
        tried.push(`${key}: nobody offered a bribe`);
        continue;
      }
      expect(seen, JSON.stringify(outcomes)).toBeGreaterThan(0);
      return;
    }
    throw new Error(`no drawn town had a bribe offered: ${tried.join("; ")}`);
  });
});

describe("a Congress member from elsewhere", () => {
  // Regression (wire-all-modules, Oct 12): reading one member's lean rebuilt
  // the whole chamber, once per member per vote. Since OPUS-OFFICIALS every
  // member is a person: their lean is their own position, read from their
  // official record, and the parties' medians sit on their own sides.
  it("leans by their own position, as the chamber lists them", () => {
    const state = pick(
      [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      "congress-lean:state",
    );
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
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

describe("a member who has died", () => {
  // A seat whose holder is no longer living cannot attend or vote: the vote
  // records them absent, never present (the old rule counted them as there).
  it("is absent from the vote, and the others still vote", () => {
    const { api, council } = town(
      Object.keys(authority).sort(),
      "dead-member",
      withProvision,
    );
    const provision = PLATFORM_QUESTIONS.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    })).find((p) => authorityFor(api, p).allowed)!;

    const body = council[0]!.office.id;
    const dead = council[council.length - 1]!.holder!.personId!;
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: council[0]!.holder!.personId!,
      provisions: [provision],
    });
    // Edge fixture: the holder dies before the sitting.
    api.state.people.get(dead)!.alive = false;
    holdVote(api, bill.id);
    const votes = votesOn(api, bill.id);
    expect(votes.find((v) => v.memberId === dead)?.vote).toBe("absent");
    expect(votes.some((v) => v.vote === "yes" || v.vote === "no")).toBe(true);
  });
});
