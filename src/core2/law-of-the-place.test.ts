/**
 * The law of the place decides when a winner takes office, which seats are
 * on the ballot, whether an office has a party primary, when a vacancy's
 * special election is held, and that no seat is left without a holder. Every
 * expectation is computed here from the data tables, never from a name;
 * the place is drawn from all 56 and named in the output.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import termStarts from "./data/elections/term-starts.json" with { type: "json" };
import officeRules from "./data/elections/office-election-rules.json" with { type: "json" };
import specialLaw from "./data/elections/special-election-law.json" with { type: "json" };
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import {
  OFFICES_MODULE_ID,
  openOffices,
  townSeats,
  vacateSeat,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, resultOf } from "./modules/voting";
import {
  electionInYear,
  officeFamily,
  specialElectionDate,
} from "./elections-calendar";
import { federalOffices, stateOffices } from "./offices-state";
import { placeStateKeys } from "./places";
import { lifePlaceByKey } from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`law-of-the-place:${Date.now()}`).digest("hex");
// LAW_PLACE_KEY replays a named place (a failure's place); otherwise one of
// the 56 is drawn from the seed.
const drawn = process.env.LAW_PLACE_KEY
  ? (() => {
      const place = lifePlaceByKey(process.env.LAW_PLACE_KEY!);
      return {
        seed,
        key: process.env.LAW_PLACE_KEY!,
        name: place?.displayName ?? process.env.LAW_PLACE_KEY!,
        state: place?.stateJurisdictionKey ?? "",
      };
    })()
  : drawPlace(seed, "law-of-the-place");
const where = `seed ${seed}, ${drawn.state} place ${drawn.key} (${drawn.name})`;

// ---- the rules, read from the data tables the way a person would ----

interface Rule {
  kind: string;
  month: number;
  day?: number;
  weekday?: number;
  nth?: number;
  anchorWeekday?: number;
  anchorNth?: number;
}
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
function nth(year: number, month: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return iso(year, month, 1 + ((weekday - first + 7) % 7) + 7 * (n - 1));
}
function after(date: string, weekday: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((weekday - d.getUTCDay() + 6) % 7) + 1);
  return d.toISOString().slice(0, 10);
}
function dayOf(rule: Rule, year: number): string {
  if (rule.kind === "fixed") return iso(year, rule.month, rule.day!);
  if (rule.kind === "nth-weekday")
    return nth(year, rule.month, rule.weekday!, rule.nth!);
  if (rule.kind === "weekday-after")
    return after(
      nth(year, rule.month, rule.anchorWeekday!, rule.anchorNth!),
      rule.weekday!,
    );
  return after(iso(year, rule.month, rule.day!), rule.weekday!);
}
interface OfficeLike {
  kind: string;
  level: string;
  jurisdiction: string;
  termStarts?: string;
}
function expectedStart(
  office: OfficeLike,
  stateKey: string,
  election: string,
  family: string,
): string {
  const rule: Rule = office.termStarts
    ? {
        kind: "fixed",
        month: Number(office.termStarts.slice(0, 2)),
        day: Number(office.termStarts.slice(3, 5)),
      }
    : (((termStarts.states as Record<string, Record<string, { rule: Rule }>>)[
        stateKey
      ]?.[office.kind]?.rule ??
        (termStarts.states as Record<string, Record<string, { rule: Rule }>>)[
          stateKey
        ]?.[family]?.rule ??
        termStarts.default.rule) as Rule);
  const year = Number(election.slice(0, 4));
  const same = dayOf(rule, year);
  return same > election ? same : dayOf(rule, year + 1);
}

describe(`the law of the place: ${where}`, () => {
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: drawn.key,
      startedAt: START,
      minimumPeople: 200,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  const api = coreAPI(core);
  const contests = () =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
  const terms = () =>
    api.moduleState(OFFICES_MODULE_ID).table("terms") as unknown as {
      query: (i: string, k: unknown[]) => TermRow[];
      rows: () => TermRow[];
      get: (id: string) => TermRow | undefined;
    };

  it("(b) the town's House seat and legislature seats whose terms end are contests in their year", () => {
    const missing: string[] = [];
    for (const { office, seat, holder } of townSeats(api)) {
      if (!office.elected || office.kind === "vice-president") continue;
      if (!holder?.endDate || holder.endDate > "2027-12-31") continue;
      const federalOrLegislature =
        office.kind.startsWith("us-house") ||
        office.kind.startsWith("legislature-");
      if (!federalOrLegislature) continue;
      const own = contests().find(
        (c) => c.seatId === seat.id && c.electionDate < holder.endDate!,
      );
      if (!own)
        missing.push(`${office.kind} ${seat.id} ends ${holder.endDate}`);
    }
    expect(missing, where).toEqual([]);
    // The town is represented in Congress, and the legislature's seats cover it.
    const kinds = new Set(townSeats(api).map((s) => s.office.kind));
    expect(
      [...kinds].some((k) => k.startsWith("us-house")),
      `${where}: no House seat covers the town`,
    ).toBe(true);
  });

  it("(c) a nonpartisan office has no party primary and a spring office is elected in the spring, in every place", () => {
    const rules = (
      officeRules as unknown as {
        states: Record<
          string,
          Record<string, { general?: Rule; nonpartisanPrimary?: unknown }>
        >;
      }
    ).states;
    let nonpartisan = 0;
    let spring = 0;
    for (const stateKey of [...placeStateKeys()].sort()) {
      const offices = [
        ...stateOffices(stateKey, "", START),
        ...federalOffices(stateKey, "", START),
      ];
      for (const entry of offices) {
        const office = entry.office;
        const own = rules[stateKey]?.[office.kind];
        if (office.partisan !== false && !own?.general) continue;
        // Re-read through the contest builder's calendar for the seat.
        const dates = electionDatesFor(office, stateKey);
        if (!dates) continue;
        nonpartisan += 1;
        expect(
          dates.primaryDate,
          `${stateKey} ${office.title} is nonpartisan and holds no party primary`,
        ).toBeNull();
        if (own?.general) {
          spring += 1;
          const year = Number(dates.electionDate.slice(0, 4));
          expect(dates.electionDate, `${stateKey} ${office.title}`).toBe(
            dayOf(own.general, year),
          );
          expect(
            dates.electionDate.slice(5, 7) < "07",
            `${stateKey} ${office.title} is elected in the spring`,
          ).toBe(true);
        }
      }
    }
    expect(nonpartisan, "some nonpartisan offices exist").toBeGreaterThan(5);
    expect(spring, "a spring office exists").toBeGreaterThan(0);
  });

  it("(e) a seat whose election has no winner is held over by the law, never left empty", () => {
    const entry = townSeats(api).find(
      (s) =>
        s.holder &&
        s.office.elected &&
        s.office.kind !== "president" &&
        s.office.termYears &&
        contests().some((c) => c.seatId === s.seat.id && !c.special),
    );
    expect(entry, where).toBeTruthy();
    const contest = contests().find(
      (c) => c.seatId === entry!.seat.id && !c.special,
    )!;
    api.emit({
      id: `test-no-winner:${contest.id}`,
      date: api.state.date,
      kind: "election-result",
      personIds: [],
      placeId: entry!.holder!.personId
        ? (api.state.people.get(entry!.holder!.personId!)?.placeId ?? "unknown")
        : "unknown",
      source: { tag: "SOURCED", citation: "test", asOf: api.state.date },
      publicRecord: true,
      facts: { contestId: contest.id, office: contest.title, winnerId: "" },
    });
    const held = terms()
      .query("bySeatStatus", [entry!.seat.id, "serving"])
      .find((t) => t.heldOver);
    expect(held, `${where}: ${entry!.office.title} held over`).toBeTruthy();
    expect(held!.endDate! > api.state.date, where).toBe(true);
    expect(held!.heldOver!.citation.length).toBeGreaterThan(10);
  });

  it("(d) a legislator's death schedules the special election on the statute's date, and it is held", () => {
    const target = townSeats(api).find(
      (s) =>
        s.holder &&
        s.holder.endDate &&
        s.holder.endDate > api.state.date &&
        s.office.elected &&
        /special/.test(s.office.vacancyRule.method) &&
        (s.office.kind.startsWith("legislature-") ||
          s.office.kind.startsWith("us-house")),
    );
    if (!target) return; // this place's legislature fills vacancies by appointment
    const vacancy = vacateSeat(api, target.seat.id, "death")!;
    expect(vacancy.status, where).toBe("awaiting-election");
    const stateKey = target.office.jurisdiction.startsWith("US-")
      ? target.office.jurisdiction
      : drawn.state;
    const law = specialElectionDate({
      office: target.office,
      stateKey,
      vacancyDate: vacancy.since,
    });
    expect(vacancy.electionDate, where).toBe(law.electionDate);
    // A weekday rule in the statute's data is met on that weekday.
    const row = (
      specialLaw.states as Record<
        string,
        Record<string, { kind: string; weekday?: number }>
      >
    )[stateKey]?.[officeFamily(target.office)];
    if (row?.kind === "weekday-after-days")
      expect(
        new Date(`${vacancy.electionDate}T00:00:00Z`).getUTCDay(),
        where,
      ).toBe(row.weekday);
    const special = contests().find((c) => c.special?.vacancyId === vacancy.id);
    expect(special, `${where}: no special contest`).toBeTruthy();
    expect(special!.electionDate, where).toBe(law.electionDate);
    advanceCore(
      core,
      new Date(Date.parse(`${law.electionDate}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10) as never,
    );
    expect(resultOf(api, special!.id), `${where}: special held`).toBeTruthy();
    const holder = terms().query("bySeatStatus", [target.seat.id, "serving"]);
    expect(holder.length, where).toBe(1);
  }, 900_000);
  it("(a) every winner's term starts on the day the place's law sets, (e) no seat is left without a holder", () => {
    advanceCore(core, "2027-02-01" as never);
    const checked: string[] = [];
    for (const result of (
      api.moduleState("core2-voting-v1").table("results") as unknown as {
        rows: () => { contestId: string; winnerId: string | null }[];
      }
    ).rows()) {
      if (!result.winnerId) continue;
      const contest = contests().find((c) => c.id === result.contestId);
      if (!contest || contest.special) continue;
      if (contest.level !== "federal" && contest.level !== "state") continue;
      const office = townSeats(api).find(
        (s) => s.seat.id === contest.seatId,
      )!.office;
      const stateKey = office.jurisdiction.startsWith("US-")
        ? office.jurisdiction
        : drawn.state;
      const want = expectedStart(
        office,
        stateKey,
        contest.electionDate,
        officeFamily(office),
      );
      if (want > "2027-02-01") continue;
      const seated = terms()
        .query("bySeatStatus", [contest.seatId, "serving"])
        .find((t) => t.reached.startsWith("elected"));
      expect(seated, `${where}: ${office.title} took office`).toBeTruthy();
      expect(seated!.startDate, `${where}: ${office.title} (${stateKey})`).toBe(
        want,
      );
      checked.push(`${office.kind}:${seated!.startDate}`);
    }
    // Every seat covering the town has a holder (a vacancy awaiting its
    // special election has its interim or stand-in).
    const empty = townSeats(api)
      .filter((s) => !s.holder)
      .map((s) => s.seat.id);
    const unfilled = empty.filter((id) => {
      const vacancy = (
        api.moduleState(OFFICES_MODULE_ID).table("vacancies") as unknown as {
          rows: () => VacancyRow[];
        }
      )
        .rows()
        .find((v) => v.seatId === id && v.status !== "filled");
      return !vacancy;
    });
    expect(unfilled, where).toEqual([]);
    expect(
      checked.length,
      `${where}: some state or federal winners took office`,
    ).toBeGreaterThan(0);
  }, 900_000);
});

function electionDatesFor(
  office: Parameters<typeof electionInYear>[0]["office"],
  stateKey: string,
) {
  for (let year = 2026; year <= 2032; year += 1) {
    const found = electionInYear({
      office,
      stateKey,
      placeGeoid: "",
      year,
      onDate: `${year - 1}-07-01`,
    });
    if (found) return found;
  }
  return null;
}
