/**
 * The officials outside the town as people (OPUS-OFFICIALS, M1-12).
 *
 * At the opening every member of Congress, every governor, every statewide
 * executive and legislator the offices engine seats for the town's state, and
 * each other state legislature's leaders and a representative sample of its
 * members become full people through the core's own fill-in: a name, a birth
 * date, traits, a party, a career, a home state and district, colleagues they
 * know, and their own views (a left-right position, a party wing and a few
 * causes of their own). Seats the offices engine holds get the person's id on
 * the term.
 *
 * A member's position on a bill is the sum of recorded, weighted reasons
 * (`data/officials/officials.json`): their own views, their district, the
 * party's leadership, their wing, ambition and the next election, and press
 * attention; the legislature adds organized interests, the sponsor and any
 * deal. An independent who caucuses with a party feels that caucus's pull; a
 * truly independent member feels none and weighs the reasons they're
 * independent. Nothing is rolled: who each person is was drawn once when the
 * world was made, and every vote follows from it.
 */
import { stateStake } from "../budget-stakes";
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import senateClasses from "../../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import tenure from "../data/offices/tenure.json" with { type: "json" };
import stateResearchJson from "../../../data/research/offices/state-offices.json" with { type: "json" };
import { coreAPI, fillInIdentity, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter, publicOffset } from "../campaign-views";
import { legislativeDistrictResult } from "../legislative-district-results";
import { caseShift } from "./views";
import { partyName, partySide } from "../appointments";
import { drawOfficialIdentity } from "../officials-identity";
import {
  drawOfficial,
  OFFICIALS_DATA,
  ownStance,
  partyKey,
  supportAt,
  uniform,
  type BodyKind,
  type IndependentRecord,
  type SignatureIssue,
} from "../officials-roster";
import { recordPresident } from "../officials-president";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { filingRequirements } from "./elections";
import { VIEWS_DATA, stanceOn } from "./views";

export const OFFICIALS_MODULE_ID = "core2-officials-v1";

export interface OfficialRow {
  /** Their person id. */
  readonly id: string;
  readonly seatId: string;
  /** Their term in the offices engine, where it holds the seat. */
  readonly termId: string | null;
  /** The body they sit in: `<jurisdiction>:<office kind>`. */
  readonly body: string;
  readonly bodyKind: BodyKind;
  readonly officeKind: string;
  readonly stateKey: string;
  readonly district: string | null;
  readonly party: string | null;
  readonly partySource: string;
  readonly ideal: number;
  readonly wing: string;
  readonly signature: readonly SignatureIssue[];
  readonly loyalty: number;
  readonly ambition: number;
  readonly independent: IndependentRecord | null;
  readonly leadership: string | null;
  /** Their district's (or state's) lean, right positive, and where it's read from. */
  readonly districtLean: number;
  readonly leanSource: string;
  /** Their state's lean (the electorate a higher office would need). */
  readonly stateLean: number;
  readonly serviceStart: string;
  readonly nextElectionYear: number | null;
  readonly termYears: number | null;
  /** A sample member of a legislature outside the town's state stands for this many members. */
  readonly standsFor: number;
  /** When someone else took the seat (they're a former official since). */
  readonly ended: string | null;
  /** False for a nominee the confirming bodies passed over: considered, never seated. */
  readonly seated?: false;
}

export const OFFICIALS_MODULE: CoreModule = {
  id: OFFICIALS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      officials: {
        indexes: {
          byBody: { fields: ["body"] },
          bySeat: { fields: ["seatId"] },
        },
      },
      loaded: {},
      /** Who runs for a state or federal seat, and the reasons they weighed. */
      candidates: { indexes: { byContest: { fields: ["contestId"] } } },
    },
  },
  eventKinds: ["took-office", "life.death"],
  onEvent: (api, event) => {
    // An official who dies leaves the seat that day; the pay and the seat's
    // next holder follow from the row's end.
    if (event.kind === "life.death") {
      for (const personId of event.personIds) {
        const row = officialOf(api, personId);
        if (row && row.ended === null)
          table(api, "officials").put({
            ...row,
            ended: api.state.date,
          } as unknown as ModuleRow);
      }
      return;
    }
    const seatId = event.facts?.["seatId"];
    const winner = event.personIds[0];
    if (typeof seatId === "string" && winner) tookOffice(api, winner, seatId);
  },
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICIALS_MODULE_ID).table(name);

const weight = (key: keyof typeof OFFICIALS_DATA.weights) =>
  OFFICIALS_DATA.weights[key].value;

const congressRoster = (
  partyCounts as unknown as {
    congress: Record<string, Record<string, string[]>>;
  }
).congress;
const chamberRoster = (
  partyCounts as unknown as {
    places: Record<
      string,
      Record<string, { members: number; parties: Record<string, number> }>
    >;
  }
).places;
const corpus = calibration as unknown as {
  house: {
    stateUsps: string;
    districtCode: string;
    democraticTwoPartyShare: number | null;
  }[];
  presidentialByState: {
    stateUsps: string;
    democraticTwoPartyShare: number | null;
  }[];
  governors: { stateUsps: string; party: string | null }[];
};
const houseShare = new Map(
  corpus.house.map((h) => [
    `${h.stateUsps}-${h.districtCode}`,
    h.democraticTwoPartyShare,
  ]),
);
const stateShare = new Map(
  corpus.presidentialByState.map((s) => [
    s.stateUsps,
    s.democraticTwoPartyShare,
  ]),
);
const classes = (
  senateClasses as unknown as {
    states: Record<string, { party: string; nextElection: number }[]>;
  }
).states;
const stateResearch = stateResearchJson as unknown as {
  places: Record<string, unknown>;
};
const TENURE = (
  tenure as unknown as { parameters: Record<string, { value: number }> }
).parameters;

const source = (date: string): Source => ({
  tag: "ESTIMATED",
  citation:
    "Fictional officeholder seated in the party that really holds the seat (Open States and congress-legislators rosters, 2026); views drawn from the party's real spread (Voteview, 119th Congress).",
  asOf: date,
  estimatedFrom: "data/officials/officials.json",
});

/** A state's lean, right positive: its 2024 presidential two-party vote. */
function stateLeanOf(stateKey: string): number {
  const share = stateShare.get(stateKey.slice(3));
  return share === null || share === undefined ? 0 : 1 - 2 * share;
}

/** A seat's lean and where it's read from. */
function seatLean(
  stateKey: string,
  bodyKind: BodyKind,
  district: string | null,
  party: string | null,
  officeKind = "",
): { lean: number; source: string } {
  const state = stateLeanOf(stateKey);
  const chamber = /^legislature-(upper|lower|unicameral)$/.exec(
    officeKind,
  )?.[1];
  if (bodyKind === "legislature" && district !== null && chamber) {
    const own = legislativeDistrictResult(
      stateKey.slice(3),
      chamber as "upper" | "lower" | "unicameral",
      district,
    );
    if (own)
      return {
        lean:
          (own.republican - own.democratic) / (own.republican + own.democratic),
        source: "2024 state legislative vote in the district (MEDSL)",
      };
  }
  if (bodyKind === "us-house" && district !== null) {
    const code = /^\d+$/.test(district) ? district.padStart(2, "0") : "00";
    const share = houseShare.get(`${stateKey.slice(3)}-${code}`);
    if (share !== null && share !== undefined)
      return { lean: 1 - 2 * share, source: "2024 House vote (Clerk)" };
  }
  if (bodyKind === "us-house" || bodyKind === "legislature")
    // A district without a read result leans to its holder's party by the
    // typical margin (as the world's races read it).
    return {
      lean: Math.max(
        -1,
        Math.min(
          1,
          state +
            2 * partySide(party) * campaignParameter("legislativeSeatMargin"),
        ),
      ),
      source: "state's 2024 presidential vote and the typical seat margin",
    };
  return { lean: state, source: "state's 2024 presidential vote" };
}

interface Spec {
  readonly key: string;
  readonly seatId: string;
  readonly term: TermRow | null;
  readonly body: string;
  readonly bodyKind: BodyKind;
  readonly officeKind: string;
  readonly stateKey: string;
  readonly district: string | null;
  readonly party: string | null;
  /** Where a party the roster doesn't record comes from. */
  readonly partySource?: string;
  readonly serviceStart: string;
  readonly nextElectionYear: number | null;
  readonly termYears: number | null;
  readonly standsFor: number;
  readonly role:
    "sitting-legislator-at-opening" | "executive-officeholder-at-opening";
  readonly legalMinimumAge?: number;
}

/** Congress is one body however the offices engine files its seats. */
const bodyOf = (jurisdiction: string, officeKind: string) =>
  officeKind === "us-senate"
    ? "US:us-senate"
    : officeKind.startsWith("us-house")
      ? "US:us-house"
      : `${jurisdiction}:${officeKind}`;

const bodyKindOf = (officeKind: string): BodyKind =>
  officeKind === "us-senate"
    ? "us-senate"
    : officeKind.startsWith("us-house")
      ? "us-house"
      : officeKind.startsWith("legislature-")
        ? "legislature"
        : "executive";

/**
 * How long a member not in the offices engine has served: the mean service
 * of sitting members of that kind (CRS; NCSL), drawn once from the seed as
 * the offices engine draws careers.
 */
function drawnServiceStart(
  seed: string,
  key: string,
  bodyKind: BodyKind,
  date: string,
): string {
  const mean =
    TENURE[
      bodyKind === "us-senate"
        ? "usSenateTenureYears"
        : bodyKind === "us-house"
          ? "usHouseTenureYears"
          : bodyKind === "legislature"
            ? "stateLegislatorTenureYears"
            : "statewideExecutiveTenureYears"
    ]!.value;
  // An exponential spread of service around the mean: most members are in
  // their first few terms, a few have served decades (capped by their age
  // when they're seated).
  const u = uniform(`${seed}:official:${key}:career`);
  const years = Math.floor(-mean * Math.log(1 - u));
  return `${Number(date.slice(0, 4)) - years}${date.slice(4)}`;
}

function nextEven(date: string): number {
  let year = Number(date.slice(0, 4));
  if (date.slice(5) > "11-08") year += 1;
  return year % 2 ? year + 1 : year;
}

/**
 * The party of a holder the roster doesn't record (a statewide executive, a
 * seat whose roster row is missing): the governor's, for a lieutenant
 * governor elected on the governor's ticket; otherwise the party that carried
 * the state in 2024, as an estimate until the roster is read (stopgap
 * SG-OFFICIALS-unrecorded-party).
 */
function unrecordedParty(
  api: CoreAPI,
  term: TermRow,
  kind: string,
  stateKey: string,
): { party: string | null; partySource?: string } {
  if (term.party) return { party: term.party };
  const executives =
    (
      stateResearch.places[stateKey] as
        | {
            executives?: {
              key: string;
              electedWithGovernorOnTicket?: boolean;
            }[];
          }
        | undefined
    )?.executives ?? [];
  const governor = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        `seat:${stateKey}:governor`,
        "serving",
      ]) as unknown as TermRow[]
  )[0];
  if (
    executives.find((e) => e.key === kind)?.electedWithGovernorOnTicket &&
    governor?.party
  )
    return {
      party: governor.party,
      partySource: "elected on the governor's ticket",
    };
  // stopgapId: SG-OFFICIALS-unrecorded-party
  api.stopgap("SG-OFFICIALS-unrecorded-party");
  return {
    party: stateLeanOf(stateKey) > 0 ? "Republican" : "Democratic",
    partySource: "estimated: the party that carried the state in 2024",
  };
}

/** Every seat whose holder becomes a person at the opening. */
function specs(api: CoreAPI, seed: string, townState: string): Spec[] {
  const date = api.state.date;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const out: Spec[] = [];
  const held = new Set<string>();
  for (const term of offices
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[]) {
    held.add(term.seatId);
    if (term.personId) continue;
    const office = offices.table("offices").get(term.officeId) as unknown as {
      kind: string;
      jurisdiction: string;
      termYears: number | null;
      nextElectionYear?: number;
    };
    const seat = offices.table("seats").get(term.seatId) as unknown as {
      district: string | null;
      electionYear?: number;
    };
    const bodyKind = bodyKindOf(office.kind);
    out.push({
      key: term.seatId,
      seatId: term.seatId,
      term,
      body: bodyOf(office.jurisdiction, office.kind),
      bodyKind,
      officeKind: office.kind,
      stateKey: term.identity.homeState.startsWith("US-")
        ? term.identity.homeState
        : townState,
      district: seat?.district ?? null,
      ...unrecordedParty(api, term, office.kind, townState),
      serviceStart: term.serviceStart ?? term.startDate,
      nextElectionYear: seat?.electionYear ?? office.nextElectionYear ?? null,
      termYears: office.termYears,
      standsFor: 1,
      role:
        bodyKind === "executive"
          ? "executive-officeholder-at-opening"
          : "sitting-legislator-at-opening",
    });
  }
  // Congress outside the town's state: every seat in the roster.
  for (const [stateKey, seats] of Object.entries(congressRoster)) {
    const senateYears = [...(classes[stateKey] ?? [])];
    for (const [seat, parties] of Object.entries(seats))
      parties.forEach((party, index) => {
        const senate = seat === "senate";
        const seatId = congressSeatId(stateKey, seat, index);
        if (held.has(seatId) || held.has(atLarge(seatId))) return;
        const bodyKind: BodyKind = senate ? "us-senate" : "us-house";
        const cls = senate
          ? senateYears.splice(
              Math.max(
                0,
                senateYears.findIndex((c) => c.party === party),
              ),
              1,
            )[0]
          : undefined;
        out.push({
          key: seatId,
          seatId,
          term: null,
          body: senate ? "US:us-senate" : "US:us-house",
          bodyKind,
          officeKind: senate ? "us-senate" : "us-house",
          stateKey,
          district: senate ? null : seat,
          party: partyName(party),
          serviceStart: drawnServiceStart(seed, seatId, bodyKind, date),
          nextElectionYear: senate
            ? (cls?.nextElection ?? null)
            : nextEven(date),
          termYears: senate ? 6 : 2,
          standsFor: 1,
          role: "sitting-legislator-at-opening",
          legalMinimumAge: senate ? 30 : 25,
        });
      });
  }
  // Every other governor, in the party that holds the office.
  for (const row of corpus.governors) {
    const stateKey = `US-${row.stateUsps}`;
    const seatId = `seat:${stateKey}:governor`;
    if (held.has(seatId) || stateKey === townState) continue;
    const party = row.party
      ? row.party[0]!.toUpperCase() + row.party.slice(1)
      : null;
    out.push({
      key: seatId,
      seatId,
      term: null,
      body: `${stateKey}:governor`,
      bodyKind: "executive",
      officeKind: "governor",
      stateKey,
      district: null,
      party,
      serviceStart: drawnServiceStart(seed, seatId, "executive", date),
      nextElectionYear: null,
      termYears: 4,
      standsFor: 1,
      role: "executive-officeholder-at-opening",
    });
  }
  // Other states' legislatures: each chamber's leaders and a sample of its
  // members, split among the parties by their real seat counts.
  for (const [stateKey, chambers] of Object.entries(chamberRoster)) {
    if (stateKey === townState) continue;
    for (const [chamber, row] of Object.entries(chambers)) {
      const parties = Object.entries(row.parties)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const total = parties.reduce((n, [, c]) => n + c, 0);
      if (!total) continue;
      const body = `${stateKey}:legislature-${chamber}`;
      const per = OFFICIALS_DATA.stateSample.perChamber;
      // Largest remainders: each party's share of the sample.
      const quota = parties.map(([party, n]) => ({
        party,
        n,
        seats: Math.floor((per * n) / total),
        rest: (per * n) / total - Math.floor((per * n) / total),
      }));
      let left = per - quota.reduce((n, q) => n + q.seats, 0);
      for (const q of [...quota].sort(
        (a, b) => b.rest - a.rest || a.party.localeCompare(b.party),
      )) {
        if (left <= 0) break;
        q.seats += 1;
        left -= 1;
      }
      for (const q of quota)
        for (let i = 0; i < q.seats; i += 1) {
          const seatId = `seat:${stateKey}:${chamber}:sample:${q.party}:${i}`;
          out.push({
            key: seatId,
            seatId,
            term: null,
            body,
            bodyKind: "legislature",
            officeKind: `legislature-${chamber}`,
            stateKey,
            district: null,
            party: partyName(q.party),
            serviceStart: drawnServiceStart(seed, seatId, "legislature", date),
            nextElectionYear: nextEven(date),
            termYears: chamber === "upper" ? 4 : 2,
            standsFor: q.n / q.seats,
            role: "sitting-legislator-at-opening",
            legalMinimumAge: 21,
          });
        }
    }
  }
  return out;
}

const congressSeatId = (stateKey: string, seat: string, index: number) =>
  seat === "senate"
    ? `seat:${stateKey}:us-senate:${index}`
    : `seat:${stateKey}:us-house:${seat.padStart(2, "0")}`;

/** The offices engine names a state's single House seat "at-large". */
export const atLarge = (seatId: string) =>
  seatId.replace(/:us-house:00$/, ":us-house:at-large");

/**
 * Seat every official outside the town as a person. Runs once, after the
 * offices engine has seated the town's own holders.
 */
export function openOfficials(core: CoreState): void {
  if (!core.modules.has(OFFICIALS_MODULE_ID))
    registerModule(core, OFFICIALS_MODULE);
  const api = coreAPI(core);
  if (table(api, "loaded").get("opening")) return;
  const loaded = api
    .moduleState(OFFICES_MODULE_ID)
    .table("loaded")
    .get("town") as unknown as { worldSeed: string; stateKey: string };
  const all = specs(api, loaded.worldSeed, loaded.stateKey);
  seatAll(api, loaded.worldSeed, all, true);
  // The sitting President's own record: home state, office before, the 2024
  // election and the states the campaign reached.
  for (const row of officialsIn(api, "US:president"))
    recordPresident(core, {
      seed: loaded.worldSeed,
      personId: row.id,
      party: row.party,
      townState: loaded.stateKey,
      date: api.state.date,
    });
  table(api, "loaded").put({ id: "opening", officials: all.length });
}

/** What the Constitution asks of the holder of a federal office, from the office kind (0 for any other). */
function constitutionalAge(officeKind: string): number {
  if (officeKind === "us-senate") return 30;
  if (officeKind.startsWith("us-house")) return 25;
  return officeKind === "president" || officeKind === "vice-president" ? 35 : 0;
}

/** What a state asks of a candidate for its legislature or its statewide offices (the filing rules' age). */
function stateAge(
  spec: Pick<Spec, "bodyKind" | "officeKind" | "stateKey">,
): number {
  if (!spec.stateKey.startsWith("US-")) return 0;
  if (spec.bodyKind === "legislature")
    return filingRequirements(spec.stateKey, "stateLegislative").minimumAge;
  return [
    "governor",
    "lieutenant-governor",
    "attorney-general",
    "secretary-of-state",
    "treasurer",
    "auditor",
  ].includes(spec.officeKind)
    ? filingRequirements(spec.stateKey, "statewideExecutive").minimumAge
    : 0;
}

function seatAll(
  api: CoreAPI,
  seed: string,
  drafted: readonly Spec[],
  opening: boolean,
): void {
  // Who each holder is, and no one first served younger than the minimum
  // age (the offices engine's careers already keep to it).
  const identities = new Map(
    drafted.map((s) => [
      s.key,
      s.term?.identity ?? officialIdentity(api, seed, s),
    ]),
  );
  const minimum = TENURE["minimumAgeAtFirstTerm"]!.value;
  const all = drafted.map((s): Spec => {
    // The day they turn the age (a February 29 birthday counts on March 1),
    // held to a seat's holder from the offices engine too: its career start
    // is a date it drew without their birthday.
    const born = identities.get(s.key)!.birthDate;
    const year =
      Number(born.slice(0, 4)) +
      Math.max(
        minimum,
        s.legalMinimumAge ?? constitutionalAge(s.officeKind),
        stateAge(s),
      );
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const earliest = `${year}-${born.slice(5) === "02-29" && !leap ? "03-01" : born.slice(5)}`;
    return s.serviceStart < earliest ? { ...s, serviceStart: earliest } : s;
  });
  // How far each seat leans its party's way against the party's other seats
  // of that kind, for the district's pull on the member's own position.
  const leans = new Map(
    all.map((s) => [
      s.key,
      seatLean(s.stateKey, s.bodyKind, s.district, s.party, s.officeKind),
    ]),
  );
  const groups = new Map<string, number[]>();
  const groupOf = (s: Spec) => `${s.bodyKind}|${partyKey(s.party)}`;
  const signed = (s: Spec) =>
    leans.get(s.key)!.lean * (partySide(s.party) || 1);
  for (const s of all) {
    const list = groups.get(groupOf(s)) ?? [];
    list.push(signed(s));
    groups.set(groupOf(s), list);
  }
  const stats = new Map(
    [...groups].map(([key, xs]) => {
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(
        xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, xs.length),
      );
      return [key, { mean, sd: sd || 1 }];
    }),
  );
  // A member seated later (a race's winner, an appointee) leads nothing yet.
  const roles = opening ? leaders(all) : new Map<string, string>();
  for (const spec of all) {
    const lean = leans.get(spec.key)!;
    const group = stats.get(groupOf(spec))!;
    // The roster's caucus belongs to the opening's holder only.
    const roster = opening
      ? OFFICIALS_DATA.independents.caucus[spec.seatId]
      : undefined;
    const drawn = drawOfficial({
      seed,
      key: spec.key,
      body: spec.bodyKind,
      party: spec.party,
      districtZ:
        partyKey(spec.party) === "other"
          ? 0
          : (signed(spec) - group.mean) / group.sd,
      districtLean: lean.lean,
      leader: roles.has(spec.key),
      ...(roster ? { caucus: roster } : {}),
    });
    const identity = identities.get(spec.key)!;
    const personId = spec.term
      ? `official:${spec.term.id}`
      : `official:${spec.key}`;
    fillInIdentity(api.state as CoreState, {
      id: personId,
      givenName: identity.givenName,
      familyName: identity.familyName,
      birthDate: identity.birthDate,
      placeId: spec.stateKey,
      gender: identity.gender,
      ...(spec.party ? { party: spec.party } : {}),
      seatKey: spec.seatId,
      // A vice president, even one nominated to a vacancy, must be eligible to be president.
      ...(spec.officeKind === "vice-president"
        ? { eligibleForPresidency: true }
        : {}),
      traits: drawn.traits,
      tier: OFFICIALS_DATA.tier,
      source: source(api.state.date),
    });
    if (spec.term)
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .put({ ...spec.term, personId } as unknown as ModuleRow);
    const row: OfficialRow = {
      id: personId,
      seatId: spec.seatId,
      termId: spec.term?.id ?? null,
      body: spec.body,
      bodyKind: spec.bodyKind,
      officeKind: spec.officeKind,
      stateKey: spec.stateKey,
      district: spec.district,
      party: spec.party,
      partySource: spec.partySource ?? "roster",
      ideal: drawn.ideal,
      wing: drawn.wing,
      signature: drawn.signature,
      loyalty: drawn.loyalty,
      ambition: drawn.ambition,
      independent: drawn.independent,
      leadership: roles.get(spec.key) ?? null,
      districtLean: lean.lean,
      leanSource: lean.source,
      stateLean: stateLeanOf(spec.stateKey),
      serviceStart: spec.serviceStart,
      nextElectionYear: spec.nextElectionYear,
      termYears: spec.termYears,
      standsFor: spec.standsFor,
      ended: null,
    };
    table(api, "officials").put(row as unknown as ModuleRow);
  }
  colleagues(
    api,
    new Set(
      all.map((s) => (s.term ? `official:${s.term.id}` : `official:${s.key}`)),
    ),
  );
}

function officialIdentity(api: CoreAPI, seed: string, spec: Spec) {
  const drawn = drawOfficialIdentity({
    worldSeed: seed,
    seatKey: spec.key,
    stateUsps: spec.stateKey.slice(3),
    role: spec.role,
    referenceDate: api.state.date,
    ...(spec.legalMinimumAge ? { legalMinimumAge: spec.legalMinimumAge } : {}),
  });
  return {
    givenName: drawn.givenName,
    familyName: drawn.familyName,
    gender: drawn.gender,
    birthDate: drawn.birthDate,
  };
}

function groupBy<T>(items: readonly T[], key: (item: T) => string) {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const list = out.get(key(item));
    if (list) list.push(item);
    else out.set(key(item), [item]);
  }
  return out;
}

/**
 * Each chamber's leaders: the presiding officer and floor leader from the
 * majority, the minority's floor leader, each their party's most senior
 * members (sample members of legislatures outside the town's state aren't
 * leaders; those chambers' leaders are their senior members too).
 */
function leaders(all: readonly Spec[]): Map<string, string> {
  const roles = new Map<string, string>();
  const bodies = groupBy(
    all.filter((s) => s.bodyKind !== "executive"),
    (s) => s.body,
  );
  for (const members of bodies.values()) {
    const seats = new Map<number, number>();
    for (const m of members)
      seats.set(
        partySide(m.party),
        (seats.get(partySide(m.party)) ?? 0) + m.standsFor,
      );
    const [majority, minority] = [...seats]
      .filter(([side]) => side !== 0)
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([side]) => side);
    const senior = (side: number | undefined) =>
      members
        .filter((m) => side !== undefined && partySide(m.party) === side)
        .sort(
          (a, b) =>
            a.serviceStart.localeCompare(b.serviceStart) ||
            a.key.localeCompare(b.key),
        );
    const [presiding, floor] = senior(majority);
    if (presiding) roles.set(presiding.key, "presiding");
    if (floor) roles.set(floor.key, "majority-leader");
    const [lead] = senior(minority);
    if (lead) roles.set(lead.key, "minority-leader");
  }
  return roles;
}

/**
 * Officials who serve together know each other: a state's delegation to
 * Congress and its governor, and each chamber's members with their party's
 * leader. Their time together is their shared years of service.
 */
function colleagues(api: CoreAPI, added: ReadonlySet<string>): void {
  const rows = table(api, "officials").rows() as unknown as OfficialRow[];
  const hours = OFFICIALS_DATA.colleagues.hoursPerSharedYear.value;
  const cap = OFFICIALS_DATA.colleagues.maxYears.value;
  const year = Number(api.state.date.slice(0, 4));
  const tie = (a: OfficialRow, b: OfficialRow, cause: string) => {
    if (a.id === b.id || (!added.has(a.id) && !added.has(b.id))) return;
    const since = Math.max(
      Number(a.serviceStart.slice(0, 4)),
      Number(b.serviceStart.slice(0, 4)),
    );
    const shared = Math.min(cap, Math.max(1, year - since));
    api.relationship(a.id, b.id, "coworker", shared * hours, undefined, {
      cause,
      sourceId: a.seatId,
    });
  };
  const delegations = groupBy(
    rows.filter(
      (row) =>
        row.bodyKind === "us-house" ||
        row.bodyKind === "us-senate" ||
        row.officeKind === "governor",
    ),
    (row) => row.stateKey,
  );
  for (const members of delegations.values())
    for (let i = 0; i < members.length; i += 1)
      for (let j = i + 1; j < members.length; j += 1)
        tie(
          members[i]!,
          members[j]!,
          "served together in the state's delegation",
        );
  const byBody = groupBy(rows, (row) => row.body);
  for (const members of byBody.values()) {
    const leadersBySide = new Map(
      members
        .filter((m) => m.leadership)
        .map((m) => [partySide(m.party), m] as const),
    );
    for (const m of members) {
      const leader = leadersBySide.get(partySide(m.party));
      if (leader && leader.id !== m.id && leader.stateKey !== m.stateKey)
        tie(m, leader, "served in the chamber under their party's leader");
    }
  }
}

/** The official record of a person, if they're a state or federal official. */
export function officialOf(
  api: CoreAPI,
  personId: string,
): OfficialRow | undefined {
  if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return undefined;
  return table(api, "officials").get(personId) as unknown as
    OfficialRow | undefined;
}

/** Every official serving in a body (`<jurisdiction>:<office kind>`). */
export function officialsIn(
  api: CoreAPI,
  body: string,
): readonly OfficialRow[] {
  if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return [];
  return (
    table(api, "officials").query("byBody", [body]) as unknown as OfficialRow[]
  ).filter((row) => row.ended === null);
}

/** Who holds a seat now, if the officials engine seated them. */
export function currentOfficial(
  api: CoreAPI,
  seatId: string,
): OfficialRow | undefined {
  if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return undefined;
  return (
    table(api, "officials").query("bySeat", [
      seatId,
    ]) as unknown as OfficialRow[]
  ).find((row) => row.ended === null);
}

export function allOfficials(api: CoreAPI): readonly OfficialRow[] {
  if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return [];
  return table(api, "officials").rows() as unknown as OfficialRow[];
}

/** An official's own lean (their left-right position on the game's scale). */
export function officialLean(row: OfficialRow): number {
  return Math.max(
    -1,
    Math.min(1, row.ideal * OFFICIALS_DATA.ideology.leanScale.value),
  );
}

/**
 * The holder of a seat the offices engine holds, as a person: one seated
 * after the opening (a race's winner, an appointee to a vacancy) becomes a
 * person the first time their seat is read. A town resident or a holder
 * already filled in is returned as they are.
 */
export function holderOf(api: CoreAPI, term: TermRow): TermRow {
  if (
    term.personId ||
    term.status !== "serving" ||
    !api.state.modules.has(OFFICIALS_MODULE_ID)
  )
    return term;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const office = offices.table("offices").get(term.officeId) as unknown as {
    kind: string;
    jurisdiction: string;
    termYears: number | null;
  };
  const seat = offices.table("seats").get(term.seatId) as unknown as
    { district: string | null } | undefined;
  const town = offices.table("loaded").get("town") as unknown as {
    stateKey: string;
  };
  const stateKey = office.jurisdiction.startsWith("US-")
    ? office.jurisdiction
    : town.stateKey;
  const row = seatOfficial(api, {
    key: `${term.seatId}:${term.startDate}`,
    seatId: term.seatId,
    term,
    body: bodyOf(office.jurisdiction, office.kind),
    officeKind: office.kind,
    stateKey,
    district: seat?.district ?? null,
    ...unrecordedParty(api, term, office.kind, stateKey),
    termYears: office.termYears,
  });
  return { ...term, personId: row.id };
}

/**
 * Make the holder of a seat a person when they weren't one yet: a winner of a
 * race elsewhere, an appointee to a vacancy. The same seat and seed always
 * give the same person.
 */
export function seatOfficial(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly seatId: string;
    readonly term: TermRow | null;
    readonly body: string;
    readonly officeKind: string;
    readonly stateKey: string;
    readonly district: string | null;
    readonly party: string | null;
    readonly partySource?: string;
    readonly termYears: number | null;
  },
): OfficialRow {
  const personId = input.term
    ? `official:${input.term.id}`
    : `official:${input.key}`;
  const held = officialOf(api, personId);
  if (held) return held;
  // The seat's former holder is a former official from today.
  for (const row of table(api, "officials").query("bySeat", [
    input.seatId,
  ]) as unknown as OfficialRow[])
    if (row.ended === null)
      table(api, "officials").put({
        ...row,
        ended: api.state.date,
      } as unknown as ModuleRow);
  const loaded = api
    .moduleState(OFFICES_MODULE_ID)
    .table("loaded")
    .get("town") as unknown as { worldSeed: string };
  const bodyKind = bodyKindOf(input.officeKind);
  seatAll(
    api,
    loaded.worldSeed,
    [
      {
        ...input,
        bodyKind,
        serviceStart: input.term?.startDate ?? api.state.date,
        nextElectionYear: input.termYears
          ? Number(api.state.date.slice(0, 4)) + input.termYears
          : null,
        standsFor: 1,
        role:
          bodyKind === "executive"
            ? "executive-officeholder-at-opening"
            : "sitting-legislator-at-opening",
        ...(bodyKind === "executive"
          ? {}
          : {
              legalMinimumAge:
                bodyKind === "us-senate"
                  ? 30
                  : bodyKind === "us-house"
                    ? 25
                    : 21,
            }),
      },
    ],
    false,
  );
  return officialOf(api, personId)!;
}

/** The parts of an official's position on a bill that are theirs alone. */
export interface OfficialParts {
  readonly views: number;
  readonly constituents: number;
  readonly party: number;
  readonly wing: number;
  readonly ambition: number;
  readonly press: number;
  /** For a member of Congress, what the bill's budget lines send their state (part of `constituents`). */
  readonly stateStake: number;
}

interface BodyRead {
  /** Each party's leader's own stance sign, by party side. */
  readonly leader: Map<number, number>;
  /** How much each party as a whole cares, signed: its members' mean own stance. */
  readonly care: Map<number, number>;
  /** Each wing's mean own stance, by `side|wing`. */
  readonly wings: Map<string, number>;
}

let readDate = "";
const reads = new Map<string, BodyRead>();

type Stances = readonly { question: string; position: number }[];

const stanceOf = (row: OfficialRow, stances: Stances) =>
  stances.reduce(
    (sum, s) =>
      sum + ownStance(row.ideal, row.signature, s.question) * s.position,
    0,
  );

/** What a body's parties and wings make of a bill (read once per bill a day). */
function bodyRead(api: CoreAPI, body: string, stances: Stances): BodyRead {
  if (readDate !== api.state.date) {
    reads.clear();
    readDate = api.state.date;
  }
  const key = `${body}|${JSON.stringify(stances)}`;
  const held = reads.get(key);
  if (held) return held;
  const members = officialsIn(api, body);
  const sums = new Map<string, { sum: number; n: number }>();
  const add = (k: string, value: number, n: number) => {
    const s = sums.get(k) ?? { sum: 0, n: 0 };
    sums.set(k, { sum: s.sum + value * n, n: s.n + n });
  };
  const leader = new Map<number, number>();
  for (const m of members) {
    const side = partySide(m.party);
    const own = stanceOf(m, stances);
    add(`party|${side}`, own, m.standsFor);
    add(`${side}|${m.wing}`, own, m.standsFor);
    if (
      m.leadership === "majority-leader" ||
      m.leadership === "minority-leader"
    )
      leader.set(side, Math.sign(own));
  }
  const mean = (k: string) => {
    const s = sums.get(k);
    return s && s.n ? s.sum / s.n : 0;
  };
  const read: BodyRead = {
    leader,
    care: new Map([-1, 1].map((side) => [side, mean(`party|${side}`)])),
    wings: new Map(
      [...sums.keys()]
        .filter((k) => !k.startsWith("party|"))
        .map((k) => [k, mean(k)]),
    ),
  };
  reads.set(key, read);
  return read;
}

/**
 * An official's own reasons on a bill's questions: their views, their
 * district, their party's leadership (or their caucus's, for an independent
 * who keeps one), their wing, their ambition and the next election, and the
 * press. Each part is recorded on their vote.
 */
export function officialParts(
  api: CoreAPI,
  row: OfficialRow,
  stances: Stances,
): OfficialParts {
  const own = stanceOf(row, stances);
  const independent = row.independent;
  const truly = independent !== null && independent.caucus === null;
  // A truly independent member weighs the questions behind their reason more.
  const reasonPull = truly
    ? stances
        .filter((s) => independent.reasonQuestions.includes(s.question))
        .reduce(
          (sum, s) =>
            sum +
            weight("independentReason") *
              ownStance(row.ideal, row.signature, s.question) *
              s.position,
          0,
        )
    : 0;
  // What has been said to them since the opening moves them, as a case made
  // to a town member does (the views engine).
  const moved = stances.reduce(
    (sum, s) => sum + caseShift(api, row.id, s.question) * s.position,
    0,
  );
  const views = weight("views") * (own + moved) + reasonPull;
  const district = stances.reduce(
    (sum, s) => sum + supportAt(row.districtLean, s.question) * s.position,
    0,
  );
  const state = stances.reduce(
    (sum, s) => sum + supportAt(row.stateLean, s.question) * s.position,
    0,
  );
  // A member of Congress also weighs what a budget line sends their state
  // against the national average, on a doubling scale: twice the average
  // pulls a full point toward more, half a full point toward less (a sliding
  // scale, no threshold; an outlier like a capital's headquarters spending
  // counts no more than twice).
  const stake =
    row.bodyKind === "us-house" || row.bodyKind === "us-senate"
      ? stances.reduce(
          (sum, s) =>
            sum +
            Math.max(
              -1,
              Math.min(1, Math.log2(stateStake(row.stateKey, s.question))),
            ) *
              s.position,
          0,
        )
      : 0;
  const stakePart = weight("stateStake") * stake;
  const constituents = weight("district") * district + stakePart;
  let party = 0;
  let wing = 0;
  if (row.bodyKind !== "executive") {
    const read = bodyRead(api, row.body, stances);
    const side = independent
      ? partySide(independent.caucus)
      : partySide(row.party);
    if (side !== 0) {
      // The leader says which way; how much the party cares says how hard.
      const lead = read.leader.get(side) ?? Math.sign(read.care.get(side) ?? 0);
      // A state chamber's members feel it at a calibrated fraction of Congress's.
      // stopgapId: SG-LAWS-state-party-loyalty-target
      const pull =
        (independent ? weight("caucus") : weight("party")) *
        (row.bodyKind === "legislature" ? weight("statePartyLoyalty") : 1);
      party = pull * row.loyalty * lead * Math.abs(read.care.get(side) ?? 0);
    }
    wing =
      weight("wing") *
      (read.wings.get(`${partySide(row.party)}|${row.wing}`) ?? 0);
  }
  // The nearer the next election, the more an ambitious member answers to
  // home; one who might run statewide answers to the state as well.
  const year = Number(api.state.date.slice(0, 4));
  const near =
    row.nextElectionYear && row.termYears
      ? Math.max(
          0,
          Math.min(1, 1 - (row.nextElectionYear - year) / row.termYears),
        )
      : 0;
  const higher =
    row.bodyKind === "us-house" || row.bodyKind === "legislature" ? state : 0;
  const ambition =
    weight("ambition") * row.ambition * (near * district + higher);
  const visibility =
    OFFICIALS_DATA.visibility[
      row.bodyKind === "legislature"
        ? "legislature"
        : row.bodyKind === "executive"
          ? row.officeKind === "governor" || row.officeKind === "president"
            ? "governor"
            : "statewide"
          : row.officeKind
    ] ?? 0;
  const press =
    weight("press") *
    visibility *
    stances.reduce((sum, s) => sum + publicOffset(s.question) * s.position, 0);
  return {
    views,
    constituents,
    party,
    wing,
    ambition,
    press,
    stateStake: stakePart,
  };
}

/** A would-be candidate's reasons for running, as recorded. */
export interface CandidateRow {
  /** `<contest id>|<party>`. */
  readonly id: string;
  /** Who runs. */
  readonly personId: string;
  readonly contestId: string;
  readonly year: number;
  readonly seatId: string;
  readonly party: string;
  /** The seat they hold now, or null for a newcomer. */
  readonly fromSeatId: string | null;
  readonly ambition: number;
  readonly fit: number;
  readonly noRecord: number;
  readonly total: number;
  /** How many others weighed it and stayed out. */
  readonly weighed: number;
  /** A newcomer's own views, kept for the day they take office. */
  readonly drawn: {
    readonly ideal: number;
    readonly wing: string;
    readonly signature: readonly SignatureIssue[];
    readonly loyalty: number;
    readonly ambition: number;
  } | null;
}

const candidacy = OFFICIALS_DATA.candidacy;

/** The seat's office, body and lean, from the offices engine. */
function seatFacts(api: CoreAPI, seatId: string) {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const seat = offices.table("seats").get(seatId) as unknown as
    { officeId: string; district: string | null } | undefined;
  if (!seat) return null;
  const office = offices.table("offices").get(seat.officeId) as unknown as {
    kind: string;
    jurisdiction: string;
    termYears: number | null;
  };
  const town = offices.table("loaded").get("town") as unknown as {
    stateKey: string;
    worldSeed: string;
  };
  const stateKey = office.jurisdiction.startsWith("US-")
    ? office.jurisdiction
    : town.stateKey;
  return {
    seat,
    office,
    stateKey,
    seed: town.worldSeed,
    body: bodyOf(office.jurisdiction, office.kind),
    bodyKind: bodyKindOf(office.kind),
  };
}

/**
 * Who runs for a state or federal seat for a party with no filed candidate:
 * the officeholder one step down the ladder in that state, or a newcomer,
 * whoever has the strongest reason (their ambition, how near their views sit
 * to the seat's electorate, what running costs them). They are full people;
 * a newcomer is filled in the day they file. Null where the officials engine
 * isn't installed or the office isn't one officials run for (the presidency).
 */
export function officialCandidate(
  api: CoreAPI,
  contest: {
    readonly id: string;
    readonly seatId: string;
    readonly electionDate: string;
  },
  party: string,
): string | null {
  if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return null;
  const side = partySide(party);
  if (side === 0) return null;
  const filed = (
    table(api, "candidates").query("byContest", [
      contest.id,
    ]) as unknown as CandidateRow[]
  ).find((c) => partySide(c.party) === side);
  if (filed) return filed.personId;
  const facts = seatFacts(api, contest.seatId);
  if (!facts || facts.office.kind === "president") return null;
  const year = Number(contest.electionDate.slice(0, 4));
  const ladderKey =
    facts.bodyKind === "executive"
      ? facts.office.kind === "governor"
        ? "governor"
        : "executive"
      : facts.bodyKind;
  const pool = new Set(candidacy.ladder[ladderKey] ?? []);
  const seatLeanNow = seatLean(
    facts.stateKey,
    facts.bodyKind,
    facts.seat.district,
    party,
    facts.office.kind,
  ).lean;
  // Anyone already running somewhere this year runs only there.
  const running = new Set(
    (table(api, "candidates").rows() as unknown as CandidateRow[])
      .filter((c) => c.year === year)
      .map((c) => c.personId),
  );
  const holder = currentOfficial(api, contest.seatId)?.id;
  const reasons = (ambition: number, lean: number, officeholder: boolean) => {
    const fit = -candidacy.fit.value * Math.abs(lean - seatLeanNow);
    const noRecord = officeholder ? 0 : -candidacy.noRecord.value;
    return { ambition, fit, noRecord, total: ambition + fit + noRecord };
  };
  const weighed = (
    table(api, "officials").rows() as unknown as OfficialRow[]
  ).filter(
    (row) =>
      row.ended === null &&
      row.stateKey === facts.stateKey &&
      // The state's own officeholders: not the federal executive.
      !row.seatId.startsWith("seat:US:") &&
      pool.has(row.bodyKind) &&
      row.seatId !== contest.seatId &&
      row.id !== holder &&
      !running.has(row.id) &&
      // Someone on the ballot for their own seat that year stays there.
      row.nextElectionYear !== year &&
      partySide(row.independent?.caucus ?? row.party) === side &&
      (row.bodyKind !== "executive" ||
        (row.officeKind !== "governor" && row.officeKind !== "president")) &&
      api.state.people.get(row.id)?.alive !== false,
  );
  // The newcomer: someone with no office who could run, drawn once from the
  // world's seed for this contest and party.
  const newcomerId = `official:candidate:${contest.id}:${partyKey(party)}`;
  const drawn = drawOfficial({
    seed: facts.seed,
    key: newcomerId,
    body: facts.bodyKind,
    party,
    districtZ: 0,
    districtLean: seatLeanNow,
    leader: false,
  });
  let best: {
    id: string;
    row: OfficialRow | null;
    parts: ReturnType<typeof reasons>;
  } = {
    id: newcomerId,
    row: null,
    parts: reasons(
      drawn.ambition,
      Math.max(
        -1,
        Math.min(1, drawn.ideal * OFFICIALS_DATA.ideology.leanScale.value),
      ),
      false,
    ),
  };
  for (const row of weighed) {
    const parts = reasons(row.ambition, officialLean(row), true);
    if (
      parts.total > best.parts.total ||
      (parts.total === best.parts.total && row.id < best.id)
    )
      best = { id: row.id, row, parts };
  }
  if (!best.row) {
    const identity = drawOfficialIdentity({
      worldSeed: facts.seed,
      seatKey: newcomerId,
      stateUsps: facts.stateKey.slice(3),
      role: "state-executive-challenger",
      referenceDate: api.state.date,
    });
    fillInIdentity(api.state as CoreState, {
      id: newcomerId,
      givenName: identity.givenName,
      familyName: identity.familyName,
      birthDate: identity.birthDate,
      placeId: facts.stateKey,
      gender: identity.gender,
      party,
      seatKey: contest.seatId,
      traits: drawn.traits,
      tier: OFFICIALS_DATA.tier,
      source: source(api.state.date),
    });
  }
  const row: CandidateRow = {
    id: `${contest.id}|${partyKey(party)}`,
    personId: best.id,
    contestId: contest.id,
    year,
    seatId: contest.seatId,
    party,
    fromSeatId: best.row?.seatId ?? null,
    ...best.parts,
    weighed: weighed.length,
    drawn: best.row
      ? null
      : {
          ideal: drawn.ideal,
          wing: drawn.wing,
          signature: drawn.signature,
          loyalty: drawn.loyalty,
          ambition: drawn.ambition,
        },
  };
  table(api, "candidates").put(row as unknown as ModuleRow);
  return best.id;
}

/**
 * A state or federal official, or a newcomer who ran, takes a seat: their
 * record follows them to the new body, and a seat they held below is
 * vacated the way its office's rule says.
 */
function tookOffice(api: CoreAPI, personId: string, seatId: string): void {
  const facts = seatFacts(api, seatId);
  if (!facts) return;
  const term = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
  ).find((t) => t.personId === personId);
  if (!term) return;
  const held = officialOf(api, personId);
  const nextElectionYear = facts.office.termYears
    ? Number(api.state.date.slice(0, 4)) + facts.office.termYears
    : null;
  if (held && held.seatId === seatId) {
    table(api, "officials").put({
      ...held,
      termId: term.id,
      nextElectionYear,
      ended: null,
    } as unknown as ModuleRow);
    return;
  }
  const ran = (
    table(api, "candidates").rows() as unknown as CandidateRow[]
  ).find((c) => c.personId === personId && c.seatId === seatId);
  const base =
    held ?? (ran?.drawn ? { ...ran.drawn, independent: null } : null);
  if (!base) return;
  const party = term.party ?? held?.party ?? ran?.party ?? null;
  const lean = seatLean(
    facts.stateKey,
    facts.bodyKind,
    facts.seat.district,
    party,
    facts.office.kind,
  );
  const row: OfficialRow = {
    id: personId,
    seatId,
    termId: term.id,
    body: facts.body,
    bodyKind: facts.bodyKind,
    officeKind: facts.office.kind,
    stateKey: facts.stateKey,
    district: facts.seat.district,
    party,
    partySource: "elected",
    ideal: base.ideal,
    wing: base.wing,
    signature: base.signature,
    loyalty: base.loyalty,
    ambition: base.ambition,
    independent: base.independent,
    leadership: null,
    districtLean: lean.lean,
    leanSource: lean.source,
    stateLean: stateLeanOf(facts.stateKey),
    serviceStart: api.state.date,
    nextElectionYear,
    termYears: facts.office.termYears,
    standsFor: 1,
    ended: null,
  };
  table(api, "officials").put(row as unknown as ModuleRow);
}

/**
 * How strongly a member of an executive's own party is pulled to sustain
 * their veto: the party weight times their loyalty (a resident member with
 * no official record feels the party weight alone).
 */
export function executivePull(api: CoreAPI, memberId: string): number {
  const row = officialOf(api, memberId);
  return OFFICIALS_DATA.weights.executiveParty.value * (row?.loyalty ?? 1);
}

/**
 * An official's own stance on a question (their position and, on their own
 * causes, their tilt), on the scale members vote by; null for anyone else.
 */
export function officialStance(
  api: CoreAPI,
  memberId: string,
  question: string,
): number | null {
  const row = officialOf(api, memberId);
  if (!row) return null;
  // Their opening position, moved by what they have heard since, as any
  // resident's view is (views.ts `viewOn`): a case made to them, a story
  // they read, a vote they took.
  const opening = ownStance(row.ideal, row.signature, question);
  const moved =
    VIEWS_DATA.parameters.stanceViewWeight!.value *
    stanceOn(api, memberId, question);
  return Math.max(-1, Math.min(1, opening + moved));
}

/**
 * Whether a person's own votes are news in the town: anyone but an official
 * whose seat doesn't cover it (a member of Congress or a legislator from
 * elsewhere, whose roll call's own story carries the count).
 */
export function votesAreTownNews(api: CoreAPI, personId: string): boolean {
  const row = officialOf(api, personId);
  if (!row) return true;
  const seat = api
    .moduleState(OFFICES_MODULE_ID)
    .table("seats")
    .get(row.seatId) as unknown as { coversTown?: boolean } | undefined;
  return seat?.coversTown === true;
}
