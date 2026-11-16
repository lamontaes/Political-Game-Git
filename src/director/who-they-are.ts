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
 *    reader (`officeSaid`); a presiding officer with a title of their own
 *    ("Speaker") is said by that title.
 * 2. staff: an aide of an official (the staff engine).
 * 3. constituent: someone in the town a seat the player holds covers.
 * Someone none of these holds for is named alone. Only kinds a scene the
 * player reached by their own presses has said are read (lead and Words lead,
 * Nov 16); the others' lines wait in the Words lead's lines.md, and pool item
 * director-narrator-says-who-a-person-is lists them.
 *
 * Nothing is returned for someone the player has met (the met record, #9489's
 * `relationFacts`), family, a partner or a housemate: the first name says
 * enough there.
 */
import { officeSaid } from "./cause-facts";
import { relationFacts } from "./relation-facts";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { officialOf } from "../core2/modules/officials";
import {
  OFFICES_MODULE_ID,
  servingTermsOf,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { EXECUTIVE_MODULE_ID } from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import { STAFF_MODULE_ID } from "../core2/modules/staff";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { officeWords, sceneSaysWhat, whatSaid } from "../english/said-as";
import { jobSaid } from "../english/journal-words";
import { spoken } from "./words";
import type { Fact } from "../english/bank-line";
import type { CoreState, PersonId } from "../core2/types";

export type WhatKind = "office" | "staff" | "tie" | "constituent" | "workplace";

/** What a person is to the player: the kind, its stage and its slots, from the records. */
export interface WhatTheyAre {
  readonly kind: WhatKind;
  /** office: "alone" | "member"; staff: "aide"; constituent: "district" | "place". */
  readonly stage: string;
  readonly facts: Readonly<Record<string, Fact>>;
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
        stage: officeSeats(core, term!.officeId) > P.one ? "member" : "alone",
        facts: {
          [officeSeats(core, term!.officeId) > P.one ? "body" : "office"]: fact(
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
      const member = officeSeats(core, term.officeId) > P.one;
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
      if (record.personIds[P.zero] !== personId) continue;
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
  return office?.seats ?? P.one;
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
  // The seats that cover the played town: everyone living in it is their holders' constituent,
  // wherever the holder lives.
  const town = lawChain(api).townPlaceId;
  if (other.placeId !== town) return null;
  for (const { seat } of townSeats(api)) {
    if (!own.has(seat.id)) continue;
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

/**
 * What `otherId` is to the player, the first kind that holds;
 * null for someone the player has met, family, a partner, a housemate, or
 * someone none of the kinds holds for (named alone).
 */
export function whatTheyAre(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
): WhatTheyAre | null {
  if (playerId === otherId) return null;
  if (!core.people.get(playerId) || !core.people.get(otherId)) return null;
  const met = relationFacts(core, otherId, playerId);
  if (met.kin || met.partners || met.kinSource || met.metBefore) return null;
  const reads = [
    () => officeOf(core, otherId),
    () => staffOf(core, otherId),
    () => constituentOf(core, playerId, otherId),
  ];
  for (const read of reads) {
    const what = read();
    if (what) return what;
  }
  return null;
}

/**
 * Why a scene names `otherId` the way it does, for dev mode's trace (owner, Nov 16: what a
 * session traces by script, dev mode shows in the game): the phrase said after the first full
 * name and the kind, stage and records it came from; or why they are named alone: family or
 * household, the met record (which arm, from `relationFacts`, and its record), the scene type's
 * own line saying who they are (said-as.json sceneSaysIt), or nothing on record. The same reads
 * the narration makes, so the trace cannot drift from what is said.
 */
export function whyNamed(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
  typeKey?: string,
): {
  readonly said: string | null;
  readonly kind: string | null;
  readonly stage: string | null;
  readonly recordIds: readonly string[];
  readonly alone:
    "family" | "met" | "scene-says-it" | "nothing-on-record" | null;
  readonly metBy: string | null;
  readonly metSource: { readonly id: string; readonly date: string } | null;
} {
  const met = relationFacts(core, otherId, playerId);
  const base = {
    metBy: met.metBy,
    metSource: met.metSource,
  };
  if (met.kin || met.partners || met.kinSource)
    return {
      said: null,
      kind: null,
      stage: null,
      recordIds: met.kinSource ? [met.kinSource] : [],
      alone: "family",
      ...base,
    };
  if (met.metBefore)
    return {
      said: null,
      kind: null,
      stage: null,
      recordIds: met.metSource ? [met.metSource.id] : [],
      alone: "met",
      ...base,
    };
  const what = whatTheyAre(core, playerId, otherId);
  const recordIds = Object.values(what?.facts ?? {}).flatMap(
    (f) => f.sourceRecordIds,
  );
  if (sceneSaysWhat(typeKey))
    return {
      said: null,
      kind: what?.kind ?? null,
      stage: what?.stage ?? null,
      recordIds,
      alone: "scene-says-it",
      ...base,
    };
  const said = what ? whatSaid(what) : null;
  return {
    said,
    kind: what?.kind ?? null,
    stage: what?.stage ?? null,
    recordIds,
    alone: said ? null : "nothing-on-record",
    ...base,
  };
}
