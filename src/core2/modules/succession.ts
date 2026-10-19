/**
 * Who succeeds to the presidency, and who fills the vice presidency, by the
 * law (`data/research/offices/presidential-succession.json`): the vice
 * president becomes president (amend. XXV, sec. 1); with none able, the
 * Speaker of the House, then the president pro tempore of the Senate, each
 * resigning their post and seat, then the cabinet secretaries in the order of
 * 3 U.S.C. 19(d)(1), act as president. Each must be 35 or older. A vacant vice
 * presidency is filled by the president's nominee, confirmed by a majority of
 * both houses (amend. XXV, sec. 2).
 *
 * The federal cabinet is the president's: at the opening the president
 * nominates for each post among three people who exist for it and the Senate
 * confirms, the way a governor's cabinet is chosen (`executive.ts`); each
 * secretary is a full person from the records. When the presidency falls
 * vacant the line is read the same day; the successor holds the seat as a
 * full person, and the record and a news event follow.
 */
import succession from "../../../data/research/offices/presidential-succession.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { nominateAndConfirm, partySide } from "../appointments";
import { boardAppointer } from "../board-appointer";
import { registerBoardAppointer } from "../central-bank-appointments";
import { campaignParameter } from "../campaign-views";
import { NATIVITY_FACT } from "../nativity";
import {
  OFFICES_MODULE_ID,
  registerSuccessorProvider,
  vacateSeat,
  type TermRow,
} from "./offices";
import {
  OFFICIALS_MODULE_ID,
  holderOf,
  officialLean,
  officialOf,
  seatOfficial,
} from "./officials";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  members,
} from "./legislature";
import { LEADERSHIP_MODULE_ID, leaderOf } from "./leadership";

export const SUCCESSION_MODULE_ID = "core2-succession-v1";

interface LineEntry {
  readonly key: string;
  readonly title: string;
  readonly kind: "office" | "chamber-post" | "cabinet";
  readonly chamber?: string;
  readonly resignsSeat?: boolean;
  readonly acting: boolean;
  readonly citation: string;
}
const LAW = succession as unknown as {
  minimumAge: { value: number };
  minimumResidencyYears: { value: number };
  line: readonly LineEntry[];
  vicePresidentVacancy: { citation: string };
  cabinetConfirmation: { citation: string };
};
const PRESIDENT_SEAT = "seat:US:president";
const VICE_PRESIDENT_SEAT = "seat:US:vice-president";

/** A cabinet post and the secretary who holds it. */
export interface CabinetRow {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly holderId: string;
  readonly party: string | null;
  readonly confirmation: unknown;
  readonly since: string;
}

/** The record of one succession to the presidency or the vice presidency. */
export interface SuccessionRow {
  readonly id: string;
  readonly date: string;
  readonly seatId: string;
  readonly previousId: string | null;
  readonly successorId: string;
  /** The place in the line that succeeded, and those passed over, with why. */
  readonly position: string;
  readonly passedOver: readonly { key: string; why: string }[];
  readonly acting: boolean;
  readonly citation: string;
}

export const SUCCESSION_MODULE: CoreModule = {
  id: SUCCESSION_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { cabinet: {}, successions: {} },
  },
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(SUCCESSION_MODULE_ID).table(name);

function servingTerm(api: CoreAPI, seatId: string): TermRow | null {
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [seatId, "serving"])[0] as unknown as
    TermRow | undefined;
  return term ? holderOf(api, term) : null;
}

/** Why someone in the line can't serve today, or null when they can. */
function cannotServe(api: CoreAPI, personId: string | null): string | null {
  if (!personId) return "no one holds it";
  const person = api.state.people.get(personId);
  if (!person) return "no one holds it";
  if (!person.alive) return "not living";
  if (
    ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date)) <
    LAW.minimumAge.value
  )
    return `under ${LAW.minimumAge.value}`;
  // Natural-born and fourteen years a resident (U.S. Const. art. II, sec. 1,
  // cl. 5), read from the person's own birth record.
  const birth = (person.pastFacts ?? []).find((f) => f.kind === NATIVITY_FACT);
  if (birth?.facts?.nativity !== "native")
    return birth
      ? `not a natural-born citizen (${birth.id})`
      : "no birth record to show a natural-born citizen";
  const since = birth.facts.residentSince;
  if (
    !since ||
    ageOnDate(makeIsoDate(since), makeIsoDate(api.state.date)) <
      LAW.minimumResidencyYears.value
  )
    return `under ${LAW.minimumResidencyYears.value} years a resident (${birth.id})`;
  return null;
}

/** The party sides of a chamber's members, for a confirmation vote. */
const sides = (api: CoreAPI, chamber: string) =>
  members(api, chamber).map((t) => partySide(t.party));

/**
 * The president's choice among three people who exist for a post, confirmed
 * by the bodies the law names (each by majority): the same reasons a
 * governor's cabinet is chosen by. The chosen one is a full person; returns
 * their official record, or null where no nominee was confirmed.
 */
function nominate(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly officeKind: string;
    readonly chambers: readonly string[];
  },
) {
  const president = servingTerm(api, PRESIDENT_SEAT);
  if (!president?.personId) return null;
  const side = partySide(president.party);
  const party = president.party ?? null;
  const stateKey = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("loaded")
      .get("town") as unknown as {
      stateKey: string;
    }
  ).stateKey;
  const pool = [0, 1, 2].map((n) =>
    seatOfficial(api, {
      key: `${input.key}:${n}`,
      seatId: `seat:${input.key}:${n}`,
      term: null,
      body: `US:${input.officeKind}`,
      officeKind: input.officeKind,
      stateKey,
      district: null,
      party,
      termYears: null,
    }),
  );
  const tolerance = campaignParameter("confirmationTolerance");
  // The president's ranking, by the reasons a governor's cabinet is chosen by.
  const ranking = nominateAndConfirm({
    seatKey: input.key,
    appointerSide: side,
    candidates: pool.map((row, n) => ({
      id: row.id,
      lean: officialLean(row),
      qualification:
        campaignParameter("cabinetQualificationBase") +
        campaignParameter("cabinetQualificationStep") * (pool.length - 1 - n),
      known: n === 0,
    })),
    confirmingBody: null,
  }).reasons;
  // Each member confirms a nominee within their tolerance of their own side;
  // the first nominee a majority of every body confirms takes the post.
  const vote = (chamber: string, lean: number) => {
    const all = sides(api, chamber);
    const yes = all.filter((own) => Math.abs(lean - own) <= tolerance).length;
    return { body: chamber, yes, no: all.length - yes };
  };
  let chosenId: string | null = null;
  let confirmation: ReturnType<typeof vote>[] = [];
  for (const choice of ranking) {
    const lean = officialLean(pool.find((r) => r.id === choice.candidateId)!);
    const votes = input.chambers.map((c) => vote(c, lean));
    if (votes.every((v) => v.yes > v.no)) {
      chosenId = choice.candidateId;
      confirmation = votes;
      break;
    }
  }
  if (!chosenId) return null;
  // Those not chosen were never seated.
  for (const row of pool)
    if (row.id !== chosenId)
      api
        .moduleState(OFFICIALS_MODULE_ID)
        .table("officials")
        .put({
          ...row,
          ended: api.state.date,
          seated: false,
        } as unknown as ModuleRow);
  return {
    row: officialOf(api, chosenId)!,
    reasons: ranking,
    confirmation,
  };
}

/** The president names a cabinet and the Senate confirms it. */
function appointCabinet(api: CoreAPI): void {
  if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return;
  const posts = LAW.line.filter((e) => e.kind === "cabinet");
  for (const [order, post] of posts.entries()) {
    if (table(api, "cabinet").get(post.key)) continue;
    const chosen = nominate(api, {
      key: `cabinet:US:${post.key}`,
      officeKind: "cabinet-secretary",
      chambers: [FEDERAL_SENATE],
    });
    if (!chosen) continue;
    table(api, "cabinet").put({
      id: post.key,
      title: post.title,
      order,
      holderId: chosen.row.id,
      party: chosen.row.party,
      confirmation: chosen.confirmation,
      since: api.state.date,
    } satisfies CabinetRow as unknown as ModuleRow);
  }
}

/** The holder of a place in the line today, and their seat in Congress if any. */
function holderIn(
  api: CoreAPI,
  entry: LineEntry,
): { personId: string | null; party: string | null; seat: TermRow | null } {
  if (entry.kind === "office") {
    const term = servingTerm(api, `seat:US:${entry.key}`);
    return {
      personId: term?.personId ?? null,
      party: term?.party ?? null,
      seat: null,
    };
  }
  if (entry.kind === "chamber-post") {
    if (!api.state.modules.has(LEADERSHIP_MODULE_ID))
      return { personId: null, party: null, seat: null };
    const holder = leaderOf(api, entry.chamber!, entry.key);
    const seat =
      members(api, entry.chamber!).find((t) => memberKey(t) === holder) ?? null;
    return {
      personId: seat?.personId ?? holder,
      party: seat?.party ?? null,
      seat,
    };
  }
  const row = table(api, "cabinet").get(entry.key) as unknown as
    CabinetRow | undefined;
  return {
    personId: row?.holderId ?? null,
    party: row?.party ?? null,
    seat: null,
  };
}

/** Which vacancy of a seat today this is, from 0: each its own record and field. */
const vacancyNumber = (api: CoreAPI, seatId: string) =>
  successions(api).filter(
    (r) => r.seatId === seatId && r.date === api.state.date,
  ).length;

/** Record a succession and tell the press. */
function record(api: CoreAPI, row: SuccessionRow, title: string): void {
  table(api, "successions").put(row as unknown as ModuleRow);
  api.emit({
    id: row.id,
    date: row.date,
    kind: "succession",
    personIds: [
      row.successorId,
      ...(row.previousId ? [row.previousId] : []),
    ].filter((id) => api.state.people.has(id)),
    placeId: api.state.people.get(row.successorId)!.placeId,
    source: { tag: "SOURCED", citation: row.citation, asOf: row.date },
    publicRecord: true,
    news: true,
    facts: {
      // National news on every town's wire.
      level: "federal",
      seatId: row.seatId,
      position: row.position,
      title,
      acting: String(row.acting),
      passedOver: row.passedOver.map((p) => `${p.key}: ${p.why}`).join("; "),
    },
  });
}

/** The line of succession to the presidency, read the day it falls vacant. */
function presidentialSuccessor(
  api: CoreAPI,
  input: { readonly seatId: string; readonly previous: TermRow },
) {
  const passedOver: { key: string; why: string }[] = [];
  for (const entry of LAW.line) {
    const holder = holderIn(api, entry);
    const why =
      holder.personId === input.previous.personId
        ? "is the one who left"
        : cannotServe(api, holder.personId);
    if (why) {
      passedOver.push({ key: entry.key, why });
      continue;
    }
    const personId = holder.personId!;
    const date = api.state.date;
    record(
      api,
      {
        id: `succession:${input.seatId}:${date}:${vacancyNumber(api, input.seatId)}`,
        date,
        seatId: input.seatId,
        previousId: input.previous.personId,
        successorId: personId,
        position: entry.key,
        passedOver,
        acting: entry.acting,
        citation: entry.citation,
      },
      entry.title,
    );
    return {
      personId,
      party: holder.party,
      reached: `${entry.acting ? "acting as President" : "succeeded to the presidency"} as ${entry.title} (${entry.citation})`,
      then: () => {
        // The vice president's office, or a member's seat in Congress, is
        // left by the one who rose.
        if (entry.kind === "office")
          vacateSeat(api, VICE_PRESIDENT_SEAT, "succeeded to the presidency");
        else if (entry.resignsSeat && holder.seat?.seatId) {
          // Resigned as a member: a seat the offices engine holds falls
          // vacant by its own rule; a member elsewhere ends their service.
          if (
            !vacateSeat(api, holder.seat.seatId, "resigned to act as President")
          ) {
            const row = officialOf(api, personId);
            if (row)
              api
                .moduleState(OFFICIALS_MODULE_ID)
                .table("officials")
                .put({ ...row, ended: date } as unknown as ModuleRow);
          }
        } else if (entry.kind === "cabinet")
          table(api, "cabinet").remove(entry.key);
      },
    };
  }
  return null;
}

/** A vacant vice presidency: the president's nominee, confirmed by both houses. */
function vicePresidentialSuccessor(
  api: CoreAPI,
  input: { readonly seatId: string; readonly previous: TermRow },
) {
  const date = api.state.date;
  // A fresh field of nominees for each vacancy (the one who left is not
  // nominated back).
  const chosen = nominate(api, {
    key: `vice-president:${date}:${vacancyNumber(api, input.seatId)}`,
    officeKind: "vice-president",
    chambers: [FEDERAL_HOUSE, FEDERAL_SENATE],
  });
  if (!chosen) return null;
  record(
    api,
    {
      id: `succession:${input.seatId}:${date}:${vacancyNumber(api, input.seatId)}`,
      date,
      seatId: input.seatId,
      previousId: input.previous.personId,
      successorId: chosen.row.id,
      position: "nominated and confirmed",
      passedOver: [],
      acting: false,
      citation: LAW.vicePresidentVacancy.citation,
    },
    "Vice President",
  );
  return {
    personId: chosen.row.id,
    party: chosen.row.party,
    reached: `nominated by the President, confirmed by both houses (${LAW.vicePresidentVacancy.citation})`,
  };
}

/** Register the module, read the line for the federal executive, name the cabinet. */
export function openSuccession(core: CoreState): void {
  if (!core.modules.has(SUCCESSION_MODULE_ID))
    registerModule(core, SUCCESSION_MODULE);
  registerSuccessorProvider("president", presidentialSuccessor);
  registerSuccessorProvider("vice-president", vicePresidentialSuccessor);
  // The central bank's governors are named by this president and confirmed
  // by this Senate, once the government is open.
  registerBoardAppointer(boardAppointer);
  appointCabinet(coreAPI(core));
}

/** The federal cabinet in the order of the line. */
export function cabinet(api: CoreAPI): readonly CabinetRow[] {
  return (table(api, "cabinet").rows() as unknown as CabinetRow[])
    .slice()
    .sort((a, b) => a.order - b.order);
}

/** Every succession recorded. */
export function successions(api: CoreAPI): readonly SuccessionRow[] {
  return table(api, "successions").rows() as unknown as SuccessionRow[];
}
