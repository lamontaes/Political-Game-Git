/**
 * People bring it up (M4-05). A person mentions a change they learned of and
 * who they believe caused it, and that belief follows only what they heard:
 * a blame someone told them (which can be wrong), the record they saw (the
 * business its closure names), or, with neither, someone they know holds a
 * public role, when their temperament runs to blaming authority. Telling it
 * passes the change and the blame on, so the next person's belief follows
 * this one's words.
 */
import { P } from "../core2/parameters";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { VIEWS_MODULE_ID } from "../core2/modules/views";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { POLICY_VALUES, valueSupport } from "../core2/views-values";
import { decisionLean } from "../core2/trait-decisions";
import type { CoreState, PersonId, PersonState, Source } from "../core2/types";
import bringJson from "./data/bring-it-up.json" with { type: "json" };
import { withParts } from "./parts";
import { renderLine, type Variant } from "./render";
import { markWordsStopgap } from "./stopgaps";
import { possessive, properName } from "./words";

interface BringData {
  version: string;
  stopgapId: string;
  toldEvent: string;
  heardKey: string;
  blameKey: string;
  changes: readonly {
    eventKind: string;
    /** For a change seen on an organization's own record. */
    institutionFact?: { prefix: string; suffix: string };
    line: Variant[];
  }[];
  blame: Readonly<Record<Attribution["how"], Variant[]>>;
  /** Whether the speaker is for or against a law, from their own values. */
  reaction: Readonly<Record<"for" | "against", Variant[]>>;
  lawKind: string;
  newsKey: string;
  policyPrefix: string;
}
export const BRING_IT_UP_DATA = bringJson as unknown as BringData;

export interface KnownChange {
  eventId: string;
  /** The change row it matched (its event kind); heard changes keep the first. */
  kind: string;
  institutionId: string;
  learnedAt: string;
  /** "seen" from the record itself, or "heard" from someone. */
  route: "seen" | "heard";
}

export interface Attribution {
  eventId: string;
  how: "told" | "record" | "assumed" | "unknown";
  blamedId?: string;
  /** The record the belief came from: a told event, the change, a public role. */
  sourceId?: string;
}

/** The changes a person learned of, newest first. */
export function changesKnownTo(
  core: Readonly<CoreState>,
  personId: PersonId,
  data: BringData = BRING_IT_UP_DATA,
): KnownChange[] {
  const known = core.knowledgeByPerson.get(personId);
  if (!known) return [];
  const out = new Map<string, KnownChange>();
  for (const fact of known.values()) {
    for (const change of data.changes) {
      if (!change.institutionFact) continue;
      const { prefix, suffix } = change.institutionFact;
      if (
        fact.key.startsWith(prefix) &&
        fact.key.endsWith(suffix) &&
        fact.access === "perceived"
      )
        out.set(fact.sourceId, {
          eventId: fact.sourceId,
          kind: change.eventKind,
          institutionId: fact.key.slice(
            prefix.length,
            fact.key.length - suffix.length,
          ),
          learnedAt: fact.learnedAt,
          route: "seen",
        });
    }
    // A law that took effect, from its news story: the record names the
    // bill that enacted it, and the bill its sponsor.
    if (
      fact.key.startsWith(`${data.newsKey}:`) &&
      fact.value === data.lawKind
    ) {
      const eventId = fact.key.slice(data.newsKey.length + P.one);
      const sponsor = lawSponsor(core, eventId);
      if (sponsor && !out.has(eventId))
        out.set(eventId, {
          eventId,
          kind: data.lawKind,
          institutionId: sponsor,
          learnedAt: fact.learnedAt,
          route: "seen",
        });
    }
    if (fact.key.startsWith(`${data.heardKey}:`)) {
      const eventId = fact.key.slice(data.heardKey.length + P.one);
      // What kind of change it was, from its record where the log keeps it.
      const logged = core.durableLog.get(eventId)?.kind;
      const kind = data.changes.some((row) => row.eventKind === logged)
        ? logged!
        : data.changes[P.zero]!.eventKind;
      if (!out.has(eventId))
        out.set(eventId, {
          eventId,
          kind,
          institutionId: fact.value,
          learnedAt: fact.learnedAt,
          route: "heard",
        });
    }
  }
  return [...out.values()].sort(
    (a, b) =>
      b.learnedAt.localeCompare(a.learnedAt) ||
      a.eventId.localeCompare(b.eventId),
  );
}

/** The sponsor of the bill that enacted a law, from the law's own record. */
function lawSponsor(
  core: Readonly<CoreState>,
  eventId: string,
): PersonId | null {
  const lawId = core.durableLog.get(eventId)?.facts?.lawId;
  if (!lawId || !core.modules.has(LAWS_MODULE_ID)) return null;
  const api = coreAPI(core as CoreState);
  const law = api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as
    { terms?: { enactedBy?: string } } | undefined;
  const number = law?.terms?.enactedBy;
  if (!number || !core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const bill = (
    api.moduleState(LEGISLATURE_MODULE_ID).table("bills").rows() as unknown as {
      number: string;
      sponsorId: string;
    }[]
  ).find((row) => row.number === number);
  return bill?.sponsorId && core.people.has(bill.sponsorId)
    ? bill.sponsorId
    : null;
}

/** The policy a law's series names, if it is one of the authored ones. */
function lawPolicy(
  core: Readonly<CoreState>,
  eventId: string,
  data: BringData,
): string | null {
  const series = String(core.durableLog.get(eventId)?.facts?.series ?? "");
  const key = series.startsWith(data.policyPrefix)
    ? series.slice(data.policyPrefix.length)
    : series;
  return POLICY_VALUES.policies[key] ? key : null;
}

/** Whether a person's traits lean toward blaming an official over withholding blame. */
export function leansToBlame(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
): boolean {
  return (
    decisionLean(
      core,
      person,
      "bring-it-up.blame",
      "blame-official",
      "withhold-blame",
    ) > P.zero
  );
}

/** Who a person believes caused a change, from what they heard. */
export function believedCause(
  core: Readonly<CoreState>,
  personId: PersonId,
  change: KnownChange,
  data: BringData = BRING_IT_UP_DATA,
): Attribution {
  const known = core.knowledgeByPerson.get(personId);
  const told = known?.get(`${data.blameKey}:${change.eventId}`);
  if (told)
    return {
      eventId: change.eventId,
      how: "told",
      blamedId: told.value,
      sourceId: told.sourceId,
    };
  if (change.route === "seen")
    return {
      eventId: change.eventId,
      how: "record",
      blamedId: change.institutionId,
      sourceId: change.eventId,
    };
  // Heard only that it happened: someone whose traits lean more toward
  // blaming authority than withholding blame puts it on the public figure
  // they know of (every trait, through the shared trait table).
  const person = core.people.get(personId);
  if (person && leansToBlame(core, person)) {
    const official = [...(known?.values() ?? [])]
      .filter(
        (fact) =>
          fact.key.endsWith(":public-role") && fact.key.startsWith("person:"),
      )
      .sort(
        (a, b) =>
          b.learnedAt.localeCompare(a.learnedAt) || a.key.localeCompare(b.key),
      )[P.zero];
    if (official)
      return {
        eventId: change.eventId,
        how: "assumed",
        blamedId: official.key.slice(
          "person:".length,
          official.key.length - ":public-role".length,
        ),
        sourceId: official.sourceId,
      };
  }
  return { eventId: change.eventId, how: "unknown" };
}

function nameOf(core: Readonly<CoreState>, id: string): string | null {
  const org = core.organizations.get(id);
  if (org) return properName(org.name);
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : null;
}

export interface BroughtUp {
  lines: { text: string; sourceRecordIds: readonly string[] }[];
  change: KnownChange;
  attribution: Attribution;
  toldEventId: string;
}

/** The speaker brings up the newest change they know of, and tells the listener. */
export function bringItUp(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  data: BringData = BRING_IT_UP_DATA,
): BroughtUp | null {
  const change = changesKnownTo(core, speakerId, data)[P.zero];
  // A law is named by its policy; anything else by the institution.
  const policy =
    change?.kind === data.lawKind
      ? lawPolicy(core, change.eventId, data)
      : null;
  const subject = !change
    ? null
    : change.kind === data.lawKind
      ? policy
        ? POLICY_VALUES.policies[policy]!.name
        : null
      : nameOf(core, change.institutionId);
  if (!change || !subject) return null;
  markWordsStopgap(data.stopgapId);
  const attribution = believedCause(core, speakerId, change, data);
  const words = data.changes.find((row) => row.eventKind === change.kind)!;
  const say = (
    part: string,
    field: string,
    variants: Variant[],
    facts: Record<string, { text: string; sourceRecordIds: readonly string[] }>,
  ) =>
    renderLine({
      seed: core.seed,
      surface: "dialogue",
      holderId: speakerId,
      bankKey: `bring-it-up:${part}`,
      version: data.version,
      variants: variants.flatMap((variant) =>
        withParts("bring-it-up", part.split(":")[P.zero]!, field, variant),
      ),
      facts,
      momentKey: `${speakerId}:${listenerId}:${change.eventId}:${core.date}:${part}`,
      fallbackSourceId: change.eventId,
    });
  const lines = [];
  const first = say("change", change.kind, words.line, {
    subject: {
      text: subject,
      sourceRecordIds: [change.eventId, change.institutionId],
    },
  });
  if (first) lines.push(first);
  // Whether they are for it or against it: their own values.
  const support =
    policy && core.modules.has(VIEWS_MODULE_ID)
      ? valueSupport(coreAPI(core), speakerId, policy)
      : null;
  if (support !== null && support !== P.zero) {
    const side = support > P.zero ? "for" : "against";
    const reaction = say(`reaction:${side}`, side, data.reaction[side], {});
    if (reaction) lines.push(reaction);
  }
  const who = attribution.blamedId ? nameOf(core, attribution.blamedId) : null;
  const second = say(
    `blame:${attribution.how}`,
    who ? attribution.how : "unknown",
    data.blame[who ? attribution.how : "unknown"],
    who
      ? {
          who: {
            text: who,
            sourceRecordIds: [attribution.sourceId ?? change.eventId],
          },
          whose: {
            text: possessive(who),
            sourceRecordIds: [attribution.sourceId ?? change.eventId],
          },
        }
      : {},
  );
  if (second) lines.push(second);
  // What was said reaches the listener: the change, and the blame if any.
  const speaker = core.people.get(speakerId)!;
  const source: Source = {
    tag: "SOURCED",
    citation:
      "Recorded conversation: a person brought up a change and who they believe caused it.",
    asOf: core.date,
  };
  const toldEventId = `${data.toldEvent}:${speakerId}:${listenerId}:${change.eventId}:${core.date}`;
  applyCoreEvent(core, {
    id: toldEventId,
    date: core.date,
    kind: data.toldEvent,
    personIds: [listenerId],
    placeId: speaker.placeId,
    facts: {
      [`${data.heardKey}:${change.eventId}`]: change.institutionId,
      ...(attribution.blamedId
        ? { [`${data.blameKey}:${change.eventId}`]: attribution.blamedId }
        : {}),
    },
    source,
  });
  return { lines, change, attribution, toldEventId };
}
