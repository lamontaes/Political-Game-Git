/**
 * What a person is to the player, from the records, said once after their
 * name the first time a narration names someone the player has not met
 * (owner, Nov 15, rule 136: "the narrator should give you context. Jose
 * Salgado, who is the ranking chair member or whatever ... this is an
 * engine-wide thing"). One reader for every scene at every level: it returns
 * a kind and its slots, never words; the said-as reader words it from
 * `data/english/said-as.json` `whatTheyAre` (the Words lead's lines).
 *
 * The kinds, first that holds, by what matters in a scene:
 * 1. office: a seat they hold (offices and officials engines) or a post they
 *    were appointed to (the executive engine), said by the office-name
 *    reader (`officeSaid`, `seatSaid`); a presiding officer with a title of
 *    their own ("Speaker") is said by that title.
 * 2. presides: the chair of a body whose presiding seat has no title of its own.
 * 3. seat-holder: the one who held the seat the player is sworn into today,
 *    or who holds the seat the player is running for.
 * 4. staff: an aide of an official (the staff engine).
 * 5. tie: a tie on record with the player: schoolmates, a campaign's people
 *    (`sharedHistory`), or an act on the public record between them
 *    (`actBetween`: a veto, a signing, an appointment).
 * 6. constituent: someone in the town a seat the player holds covers.
 * 7. workplace: where they work, and whether the player works there too.
 * 8. resident: another place they live in. A resident of the player's own
 *    town gets no phrase: the name alone (Words lead, Nov 15).
 *
 * Nothing is returned for someone the player has met (the met record, #9489's
 * `relationFacts`), family, a partner or a housemate: the first name says
 * enough there.
 */
import rulesFile from "./data/conversation-rules.json" with { type: "json" };
import { officeSaid } from "./cause-facts";
import { relationFacts } from "./relation-facts";
import { organizationName } from "./words";
import { sharedHistory } from "../core2/shared-history";
import { coreAPI } from "../core2/state";
import { officialOf } from "../core2/modules/officials";
import {
  OFFICES_MODULE_ID,
  servingTermsOf,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { EXECUTIVE_MODULE_ID } from "../core2/modules/executive";
import { STAFF_MODULE_ID } from "../core2/modules/staff";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { officeWords } from "../english/said-as";
import { jobSaid } from "../english/journal-words";
import { spoken } from "./words";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { Fact } from "../english/bank-line";
import type { CoreState, PersonId } from "../core2/types";

export type WhatKind =
  | "office"
  | "presides"
  | "seat-holder"
  | "staff"
  | "tie"
  | "constituent"
  | "workplace"
  | "resident";

/** What a person is to the player: the kind, its stage and its slots, from the records. */
export interface WhatTheyAre {
  readonly kind: WhatKind;
  /** office: "alone" | "member"; seat-holder: "outgoing" | "holding"; tie: "schoolmate" | "campaign" | "act-<what>-mine" | "act-<what>-theirs"; constituent: "district" | "place"; workplace: "apart" | "with-you". */
  readonly stage: string;
  readonly facts: Readonly<Record<string, Fact>>;
}

const KNOWN_BY_ACT = (
  rulesFile as unknown as {
    knownByAct: {
      kinds: Record<
        string,
        { what: string; doer: string; said?: Record<string, string> }
      >;
      stage: string;
    };
  }
).knownByAct;

/**
 * The newest record of an act made apart that names both people (a veto or
 * signing of one's bill by the other, an appointment), and what it was;
 * null when none (conversation-rules.json knownByAct). `byA` is whether `a`
 * did it.
 */
export function actBetween(
  core: Readonly<CoreState>,
  a: PersonId,
  b: PersonId,
): { id: string; what: string; byA: boolean } | null {
  const ofA = core.logByPerson.get(a);
  const ofB = core.logByPerson.get(b);
  if (!ofA || !ofB) return null;
  const [few, many] = ofA.size <= ofB.size ? [ofA, ofB] : [ofB, ofA];
  let best: { id: string; what: string; byA: boolean; date: string } | null =
    null;
  for (const id of few) {
    if (!many.has(id)) continue;
    const record = core.durableLog.get(id);
    const rule = record && KNOWN_BY_ACT.kinds[record.kind];
    if (!record || !rule) continue;
    const what = rule.said
      ? rule.said[String(record.facts?.[rule.what] ?? "")]
      : rule.what;
    if (!what) continue;
    if (best && record.date <= best.date) continue;
    best = {
      id,
      what,
      byA: record.facts?.[rule.doer] === a,
      date: record.date,
    };
  }
  return best && { id: best.id, what: best.what, byA: best.byA };
}

const fact = (text: string, ...ids: string[]): Fact => ({
  text,
  sourceRecordIds: ids,
});

/** The appointment a record names (`appointed:<row>:<date>`): its post's title and who holds it now. */
function appointmentOf(
  core: Readonly<CoreState>,
  recordId: string,
): { title: string | null; holderId: string } | null {
  if (!core.modules.has(EXECUTIVE_MODULE_ID)) return null;
  const rowId = recordId.replace(/^appointed:/, "").replace(/:[^:]*$/, "");
  const row = coreAPI(core as CoreState)
    .moduleState(EXECUTIVE_MODULE_ID)
    .table("appointments")
    .get(rowId) as unknown as { title?: string; holderId: string } | undefined;
  return row
    ? { title: row.title ? jobSaid(row.title) : null, holderId: row.holderId }
    : null;
}

/** The office a person holds now, as the office-name reader says it. */
function officeOf(
  core: Readonly<CoreState>,
  personId: PersonId,
): WhatTheyAre | null {
  const api = coreAPI(core as CoreState);
  const official = core.modules.has("officials")
    ? officialOf(api, personId)
    : undefined;
  if (official && official.ended === null && official.seated !== false) {
    const titled =
      official.leadership === "presiding" &&
      officeWords(`${official.officeKind}:presiding`);
    const term = official.termId
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(official.termId) as unknown as TermRow | undefined)
      : undefined;
    const office = term ? officeSaid(core, { officeId: term.officeId }) : null;
    if (official.leadership === "presiding" && !titled && office)
      return {
        kind: "presides",
        stage: "chair",
        facts: { body: fact(office.text, ...office.ids, official.id) },
      };
    if (titled)
      return {
        kind: "office",
        stage: "alone",
        facts: {
          office: fact(titled.again.replace(/^the\s+/, ""), official.id),
        },
      };
    if (office)
      return {
        kind: "office",
        stage: officeSeats(core, term!.officeId) > 1 ? "member" : "alone",
        facts: {
          [officeSeats(core, term!.officeId) > 1 ? "body" : "office"]: fact(
            office.text,
            ...office.ids,
            official.id,
          ),
        },
      };
    const words = officeWords(official.officeKind);
    if (words)
      return {
        kind: "office",
        stage: "alone",
        facts: {
          office: fact(words.again.replace(/^the\s+/, ""), official.id),
        },
      };
  }
  // A seat held with no officials row (a town's council): its serving term.
  if (core.modules.has(OFFICES_MODULE_ID))
    for (const term of servingTermsOf(api, personId)) {
      const office = officeSaid(core, { officeId: term.officeId });
      if (!office) continue;
      const member = officeSeats(core, term.officeId) > 1;
      return {
        kind: "office",
        stage: member ? "member" : "alone",
        facts: {
          [member ? "body" : "office"]: fact(
            office.text,
            ...office.ids,
            term.id,
          ),
        },
      };
    }
  // An appointed post: the town clerk, a department head, a cabinet secretary.
  if (core.modules.has(EXECUTIVE_MODULE_ID)) {
    for (const id of core.logByPerson.get(personId) ?? []) {
      const record = core.durableLog.get(id);
      if (record?.kind !== "official-appointed") continue;
      if (record.personIds[0] !== personId) continue;
      // Still in the post: the post's row names them, and the post's job is theirs.
      const post = appointmentOf(core, id);
      const jobId = (record as unknown as { jobId?: string }).jobId;
      const person = core.people.get(personId);
      if (
        post?.title &&
        post.holderId === personId &&
        (!jobId || person?.jobId === jobId)
      )
        return {
          kind: "office",
          stage: "alone",
          facts: { office: fact(post.title, id) },
        };
    }
  }
  return null;
}

function officeSeats(core: Readonly<CoreState>, officeId: string): number {
  const office = coreAPI(core as CoreState)
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as unknown as { seats?: number } | undefined;
  return office?.seats ?? 1;
}

/** The seat the player is sworn into today or runs for, and the other's hold on it. */
function seatHolder(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): WhatTheyAre | null {
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  const api = coreAPI(core as CoreState);
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  // The seat handed over at the swearing-in: the term that ended the day the
  // player's began (swearing-in.ts outgoingHolder), said only around that day.
  const yesterday = addDays(makeIsoDate(core.date), -1);
  for (const own of servingTermsOf(api, playerId)) {
    if (own.startDate < yesterday || own.startDate > core.date) continue;
    const before = (
      terms.query("bySeatStatus", [own.seatId, "ended"]) as unknown as TermRow[]
    ).find((t) => t.personId === otherId && t.endDate === own.startDate);
    if (before) return { kind: "seat-holder", stage: "outgoing", facts: {} };
  }
  if (!core.modules.has(ELECTIONS_MODULE_ID)) return null;
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  for (const filing of elections
    .table("filings")
    .query("byPerson", [playerId]) as unknown as {
    contestId: string;
    status: string;
  }[]) {
    if (filing.status === "withdrawn") continue;
    const contest = elections
      .table("contests")
      .get(filing.contestId) as unknown as
      { seatId: string; electionDate: string } | undefined;
    if (!contest || contest.electionDate < core.date) continue;
    const holder = (
      terms.query("bySeatStatus", [
        contest.seatId,
        "serving",
      ]) as unknown as TermRow[]
    )[0];
    if (holder?.personId === otherId)
      return { kind: "seat-holder", stage: "holding", facts: {} };
  }
  return null;
}

/** An aide of an official, by the staff engine's rows. */
function staffOf(
  core: Readonly<CoreState>,
  otherId: PersonId,
): WhatTheyAre | null {
  if (!core.modules.has(STAFF_MODULE_ID)) return null;
  const rows = coreAPI(core as CoreState)
    .moduleState(STAFF_MODULE_ID)
    .table("staff")
    .rows() as unknown as {
    id: string;
    personId: string;
    officialId: string;
    jobId?: string;
  }[];
  const other = core.people.get(otherId);
  for (const row of rows) {
    if (row.personId !== otherId) continue;
    if (row.jobId !== undefined && other?.jobId !== row.jobId) continue;
    const official = core.people.get(row.officialId as PersonId);
    if (!official) continue;
    const words = officeWords(
      officialOf(coreAPI(core as CoreState), row.officialId)?.officeKind,
    );
    const name = words
      ? `${words.before} ${official.givenName} ${official.familyName}`
      : `${official.givenName} ${official.familyName}`;
    return {
      kind: "staff",
      stage: "aide",
      facts: { official: fact(name, row.id, row.officialId) },
    };
  }
  return null;
}

/** A tie on record between the two: school, a campaign, or an act made apart. */
function tieOf(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): WhatTheyAre | null {
  const history = sharedHistory(core, playerId, otherId);
  const school = history.find((row) => row.kind === "schoolmate");
  if (school) {
    const org = core.organizations.get(school.recordId as never);
    if (org)
      return {
        kind: "tie",
        stage: "schoolmate",
        facts: { school: fact(organizationName(org), school.recordId) },
      };
  }
  const campaign = history.find((row) => row.kind === "campaign");
  if (campaign) {
    const filing = core.modules.has(ELECTIONS_MODULE_ID)
      ? (coreAPI(core as CoreState)
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .get(campaign.recordId) as unknown as
          { contestId?: string; personId?: string } | undefined)
      : undefined;
    const office = filing?.contestId
      ? officeSaid(core, { contestId: filing.contestId })
      : null;
    // The player's own campaign: "your campaign" (a line for theirs is not written yet).
    if (office && filing?.personId === playerId)
      return {
        kind: "tie",
        stage: "campaign",
        facts: {
          campaign_office: fact(office.text, campaign.recordId, ...office.ids),
        },
      };
  }
  const act = actBetween(core, playerId, otherId);
  if (act) {
    const facts: Record<string, Fact> = {};
    if (act.what === "appointed") {
      const title = appointmentOf(core, act.id)?.title;
      if (title) facts.office = fact(title, act.id);
    }
    const untitled = act.what === "appointed" && !facts.office;
    return {
      kind: "tie",
      stage: `act-${act.what}-${act.byA ? "mine" : "theirs"}${untitled ? "-untitled" : ""}`,
      facts,
    };
  }
  return null;
}

/** Someone in the town a seat the player holds covers. */
function constituentOf(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): WhatTheyAre | null {
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  const other = core.people.get(otherId);
  const api = coreAPI(core as CoreState);
  const own = new Set(servingTermsOf(api, playerId).map((t) => t.seatId));
  if (!own.size || !other) return null;
  for (const { seat } of townSeats(api)) {
    if (!own.has(seat.id)) continue;
    // The covered town is the played one: its residents are the seat's.
    const player = core.people.get(playerId);
    if (other.placeId !== player?.placeId) return null;
    const place = corePlaceByJurisdictionId(other.placeId as never);
    if (seat.district)
      return { kind: "constituent", stage: "district", facts: {} };
    return place
      ? {
          kind: "constituent",
          stage: "place",
          facts: { place: fact(spoken(place), other.placeId) },
        }
      : null;
  }
  return null;
}

/** Where they work, and whether the player works there too. */
function workplaceOf(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): WhatTheyAre | null {
  const other = core.people.get(otherId);
  const job = other?.jobId ? core.jobs.get(other.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  // A government's payroll is not a workplace people share (pool item
  // people-shared-employer-is-not-a-workplace): it is said by office, or not at all.
  if (!job || !org || org.governmentFacts?.governmentKey) return null;
  const player = core.people.get(playerId);
  const mine = player?.jobId ? core.jobs.get(player.jobId) : undefined;
  return {
    kind: "workplace",
    stage: mine?.organizationId === org.id ? "with-you" : "apart",
    facts: { employer: fact(organizationName(org), job.id, org.id) },
  };
}

/**
 * What `otherId` is to the player, the first that holds; null for someone the
 * player has met, family, a partner, a housemate, or a resident of the
 * player's own town with nothing else on record.
 */
export function whatTheyAre(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): WhatTheyAre | null {
  if (playerId === otherId) return null;
  const player = core.people.get(playerId);
  const other = core.people.get(otherId);
  if (!player || !other) return null;
  const met = relationFacts(core, otherId, playerId);
  if (met.kin || met.partners || met.kinSource || met.metBefore) return null;
  const read =
    officeOf(core, otherId) ??
    seatHolder(core, playerId, otherId) ??
    staffOf(core, otherId) ??
    tieOf(core, playerId, otherId) ??
    constituentOf(core, playerId, otherId) ??
    workplaceOf(core, playerId, otherId);
  if (read) return read;
  if (other.placeId === player.placeId) return null;
  const place = corePlaceByJurisdictionId(other.placeId as never);
  return place
    ? {
        kind: "resident",
        stage: "elsewhere",
        facts: { place: fact(spoken(place), other.placeId) },
      }
    : null;
}
