/**
 * A veto said at the next talk (Words lead, desk ruling 5, Nov 15 2026): the
 * sponsor of a bill the player vetoed brings it up once, at the pair's next
 * talk, with the reason the player gave (`OfficeActRow.reason`) and whether
 * the veto stood or the body overrode it. What is said is the conversation
 * bank's `veto-say` pieces (opener by how it ended, the reason, a tail in
 * the opener's bearing); the player's replies are `veto-reply` answers and
 * the sponsor's answer back is `veto-reply-back`.
 *
 * The veto itself already moved the tie both ways (`decideDesk`, the
 * whip-answer step). A reply moves it through the same writer: owning that
 * it hurt gives back a share of the veto's step, by how readily the sponsor
 * smooths things over (their conflict trait, as an owned broken promise
 * does); standing by it or leaving is a second quarrel, by how much they
 * hold on to one.
 *
 * The conversation engine asks `vetoSubject` for the subject between the
 * two and calls `answerVeto` with the player's reply; nothing else here
 * writes a line.
 */
import { billNameOf, billTitleSaid } from "../english/bill-names";
import type { Fact } from "../english/conversation-words";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  overridePending,
  votesOn,
} from "../core2/modules/legislature";
import {
  OFFICE_DAY_MODULE_ID,
  vetoCloseness,
  type OfficeActRow,
} from "../core2/modules/office-day";
import { meetingsOn } from "../core2/modules/elections";
import { causeGroupName, stanceGroupAmong } from "../english/group-names";
import { lawChain } from "../core2/modules/laws";
import { placeNameSaid } from "../core2/place-lookup";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { P } from "../core2/parameters";
import { temperedHours } from "../core2/closeness";
import type { Director } from "./ledger";

/** The conversation subject a veto is said as. */
export const VETO_SUBJECT = "veto";
/** The player's replies to it (veto-reply answers in the bank). */
export const VETO_REPLIES = ["holds", "gives", "leave"] as const;
export type VetoReply = (typeof VETO_REPLIES)[number];

const CONFLICT = "people-mind-v1:conflict";

/** A veto one person may bring up to another: the conversation subject's shape. */
export interface VetoSubject {
  /** `veto:<act id>`: heard once, never brought up again. */
  id: string;
  kind: typeof VETO_SUBJECT;
  aboutId: string;
  /** stood or overridden. */
  stage: "stood" | "overridden";
  facts: Record<string, Fact>;
  weight?: number;
}

/**
 * The newest veto the listener made of a bill the speaker sponsored that is
 * settled (it stood, or the body overrode it) and that the listener has not
 * heard about from them yet; null when there is none. A veto whose override
 * vote still waits is not said until it is taken.
 */
export function vetoSubject(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speakerId: PersonId,
  listenerId: PersonId,
  heard: (subjectId: string) => boolean,
): VetoSubject | null {
  if (
    !core.modules.has(OFFICE_DAY_MODULE_ID) ||
    !core.modules.has(LEGISLATURE_MODULE_ID)
  )
    return null;
  const api = coreAPI(core as CoreState);
  const acts = (
    api
      .moduleState(OFFICE_DAY_MODULE_ID)
      .table("acts")
      .query("byPerson", [listenerId]) as unknown as OfficeActRow[]
  )
    .filter((row) => row.kind === "veto" && row.how === "did")
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  for (const act of acts) {
    const id = `${VETO_SUBJECT}:${act.id}`;
    if (heard(id)) continue;
    const bill = billOf(api, act.recordId);
    if (!bill || bill.sponsorId !== speakerId) continue;
    if (bill.status !== "vetoed" && bill.status !== "overridden") continue;
    if (overridePending(api, bill.id)) continue;
    const record = `executive-action:${bill.id}`;
    const cites = [act.id, bill.id, record];
    const facts: Record<string, Fact> = {
      [`veto-${bill.status === "overridden" ? "overridden" : "stood"}`]: {
        text: "yes",
        sourceRecordIds: cites,
      },
      [`reason-${act.reason ?? "none"}`]: {
        text: "yes",
        sourceRecordIds: [act.id, ...(act.reasonRecordIds ?? [])],
      },
    };
    const name = billNameOf(bill);
    if (!name) continue;
    facts.bill = {
      text: billTitleSaid(name.title),
      sourceRecordIds: [bill.id],
    };
    if (act.reason === "opposed-groups") {
      const group = opposingGroup(
        core,
        placeNameSaid(lawChain(api).townPlaceId as never),
        meetingsOn(api, bill.id),
        new Set(
          votesOn(api, bill.id)
            .filter((row) => row.vote === "no")
            .map((row) => row.memberId),
        ),
      );
      // Every group residents form is said by its name; a veto for a group
      // with no name to say (none in play) has no line to say it with.
      if (!group) continue;
      facts.group = { text: group.said, sourceRecordIds: [group.id] };
    }
    const weight = momentWeight(director, listenerId, record, act.date);
    return {
      id,
      kind: VETO_SUBJECT,
      aboutId: bill.id,
      stage: bill.status === "overridden" ? "overridden" : "stood",
      facts,
      ...(weight !== undefined ? { weight } : {}),
    };
  }
  return null;
}

/**
 * How much the veto weighs as a talk's topic: the impact of the listener's
 * own moment of it (the executive-action record), read from the newest
 * moments back to the day of the veto; absent when their book holds none.
 */
function momentWeight(
  director: Director | undefined,
  personId: PersonId,
  causeId: string,
  since: string,
): number | undefined {
  const moments = director?.ledger.people.get(personId)?.moments ?? [];
  for (let at = moments.length - P.one; at >= P.zero; at -= P.one) {
    const moment = moments[at]!;
    if (moment.date < since) break;
    if (moment.causeId === causeId) return moment.impact;
  }
  return undefined;
}

/** The veto a raised subject says (its id is the speaker's, ">", then `veto:<act id>`); null for any other subject. */
export function vetoOfRaised(subject: {
  id: string;
  kind: string;
}): { actId: string } | null {
  if (subject.kind !== VETO_SUBJECT) return null;
  const own = subject.id.slice(subject.id.indexOf(">") + P.one);
  return own.startsWith(`${VETO_SUBJECT}:`)
    ? { actId: own.slice(VETO_SUBJECT.length + P.one) }
    : null;
}

/** A trait's value from -2 to 2 as a share from 0 to 1 (0.5 when unknown). */
const share = (traits: Readonly<Record<string, number>>, key: string) =>
  Math.min(
    P.one,
    Math.max(P.zero, ((traits[key] ?? P.zero) + P.two) / (P.two * P.two)),
  );

/**
 * The player's reply to a veto brought up, written as a `veto.answer` record
 * and read at once: owning that it hurt (`gives`) gives back a share of the
 * step the veto took off the tie, as the tie writer counted it, both ways,
 * by how readily the sponsor smooths things over (one minus their conflict
 * trait as a share), so it never wins back more than the veto took. Standing
 * by it (`holds`) or leaving is the talk going badly: a second quarrel of the
 * veto's step by how much the sponsor holds on (their conflict trait as a
 * share), so the tie's latest change says how the talk went. Where the
 * veto took nothing (the two had no tie to cool) the apology gives nothing.
 * Returns the record's id, or
 * null when the act or the reply is not one.
 */
export function answerVeto(
  core: CoreState,
  actId: string,
  answererId: PersonId,
  sponsorId: PersonId,
  reply: string,
): string | null {
  if (!(VETO_REPLIES as readonly string[]).includes(reply)) return null;
  const api = coreAPI(core);
  const act = api.moduleState(OFFICE_DAY_MODULE_ID).table("acts").get(actId) as
    OfficeActRow | undefined;
  if (!act || act.personId !== answererId || act.kind !== "veto") return null;
  const id = `veto.answer:${actId}`;
  applyCoreEvent(core, {
    id,
    date: core.date,
    kind: "veto.answer",
    personIds: [answererId, sponsorId],
    placeId: core.people.get(answererId)!.placeId,
    facts: { answer: reply, actId, billId: act.recordId },
    source: {
      tag: "SOURCED",
      citation: "Recorded talk: the reply the player chose to a veto raised.",
      asOf: core.date,
    },
  });
  const sponsor = core.people.get(sponsorId);
  const answerer = core.people.get(answererId);
  const holdsOn = share(sponsor?.traits ?? {}, CONFLICT);
  // Standing by it, or walking off, is the talk going badly: a second
  // quarrel through the same writer, the veto's own step by how much the
  // sponsor holds on to a quarrel, written last so the tie's latest change
  // is what the talk came to.
  if (reply !== "gives") {
    const quarrel = -vetoCloseness() * holdsOn;
    if (!(quarrel < P.zero)) return id;
    const why = { cause: `veto-answer:${reply}`, sourceId: id };
    api.relationship(sponsorId, answererId, "contact", quarrel, undefined, why);
    api.relationship(answererId, sponsorId, "contact", quarrel, undefined, why);
    return id;
  }
  // Nothing to give back where the veto took nothing (no tie to cool).
  if (!act.cooled) return id;
  // What the veto took, as the tie writer counted it (temperament weighs a
  // quarrel and time together differently), and the hours that give back
  // the sponsor's share of it: never more than the veto took.
  const taken = -temperedHours(core, sponsor, answerer, -vetoCloseness());
  const perHour = temperedHours(core, sponsor, answerer, P.one);
  const step =
    perHour > P.zero ? (taken * (P.one - holdsOn)) / perHour : P.zero;
  if (!(step > P.zero)) return id;
  const why = { cause: "veto-answer:gives", sourceId: id };
  api.relationship(sponsorId, answererId, "contact", step, undefined, why);
  api.relationship(answererId, sponsorId, "contact", step, undefined, why);
  return id;
}

/**
 * The group that pressed the members who voted no hardest (the most
 * meetings with them, then the largest case), as people say its name, or
 * null when none met them or its record has no name to say. Shared by the
 * desk visit (`deskFacts`) and the veto said at the next talk.
 */
export function opposingGroup(
  core: Readonly<CoreState>,
  town: string | null,
  meetings: readonly {
    groupId: string;
    memberId: string;
    side?: number;
    annualCostMinor: number;
  }[],
  noVoters: ReadonlySet<string>,
): { id: string; said: string } | null {
  const tally = new Map<string, { met: number; cost: number }>();
  for (const row of meetings) {
    if ((row.side ?? -P.one) >= P.zero || !noVoters.has(row.memberId)) continue;
    const seen = tally.get(row.groupId) ?? { met: P.zero, cost: P.zero };
    tally.set(row.groupId, {
      met: seen.met + P.one,
      cost: Math.max(seen.cost, row.annualCostMinor),
    });
  }
  const ranked = [...tally]
    .map(([groupId, seen]) => ({ groupId, ...seen }))
    .sort(
      (a, b) =>
        b.met - a.met || b.cost - a.cost || a.groupId.localeCompare(b.groupId),
    );
  for (const { groupId } of ranked) {
    const org = core.organizations.get(`organization:${groupId}` as never) as
      | {
          id: string;
          name: string;
          kind?: string;
          topic?: string;
          placeId?: string;
        }
      | undefined;
    if (!org) continue;
    // A group residents formed over the bill's question is named as the
    // printed words name it (`stanceGroupAmong`), the town's own groups
    // first; it is said by its name, as a sign would carry it.
    const said =
      org.kind === "cause-group" && org.topic
        ? causeGroupName(org.id, org.topic)
        : org.kind === "interest-group"
          ? (stanceGroupAmong(
              core.organizations as never,
              org.id,
              org.placeId === lawChain(coreAPI(core as CoreState)).townPlaceId
                ? town
                : null,
            )?.name ?? null)
          : /[:_]/.test(org.name)
            ? null
            : `the ${org.name.charAt(P.zero).toLowerCase()}${org.name.slice(P.one)}`;
    if (said) return { id: org.id, said };
  }
  return null;
}
