/**
 * Parties (M2-08): real organizations with members, a leader and rules; each
 * person's tie comes from their views plus loyalty; "no party" and
 * "independent" both exist; nothing assumes two parties.
 *
 * A state's parties are the ones on its 2024 presidential ballot (Clerk of
 * the House) or holding its legislative seats (Open States), each a party
 * organization in the world with the state's nomination rules. A town's
 * adults tie to parties so the town matches real party identification: the
 * share who identify with a party (Gallup 2024) take the party whose side
 * their lean is on, each party's share of identifiers following its share of
 * the state's 2024 vote, firmest leans first; of the rest, those who weigh
 * things carefully call themselves independent and the share who lean nowhere
 * (Pew 2024) have no party. Loyalty keeps a tie once made: ties are set at
 * the opening and stay put while views stay put; changing parties waits on
 * PEOPLE's views engine moving someone's views (until then views don't move).
 */
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import delegates from "../../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import nomination from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import parameters from "../data/campaigns/parameters.json" with { type: "json" };
import { partySide } from "../appointments";
import { partyLean } from "../campaign-stances";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { corePlaceByKey } from "../place-lookup";
import { personLean, PLATFORM_QUESTIONS } from "../campaign-views";
import { viewOn } from "./views";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import { MOVED_AWAY_EVENT } from "./moves";
import { closenessBetween } from "../closeness";
import {
  decisionLean,
  decisionTraitWeight,
  leanedYes,
} from "../trait-decisions";
import type { ModuleCalendarWork } from "../module-calendar";
import { addDays, makeIsoDate } from "../kernel/dates";

export const PARTIES_MODULE_ID = "core2-parties-v1";

export interface PartyRow {
  readonly id: string;
  readonly name: string;
  readonly stateKey: string;
  readonly organizationId: string;
  /** Its share of the state's 2024 vote (or of its legislative seats where no presidential vote). */
  readonly share: number;
  /** -1 for the Democratic family, +1 for the Republican family, 0 for any other. */
  readonly side: number;
  readonly nominationMethod: string | null;
  readonly voterAccess: string | null;
  readonly leaderId: string | null;
  readonly source: string;
}

export interface TieRow {
  readonly id: string;
  readonly personId: string;
  readonly tie: "party" | "independent" | "no-party";
  readonly partyId: string | null;
  readonly since: string;
  readonly lean: number;
  readonly reason: string;
}

export const PARTIES_MODULE: CoreModule = {
  id: PARTIES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      parties: {},
      ties: {
        indexes: {
          byParty: { fields: ["partyId"] },
          byTie: { fields: ["tie"] },
        },
      },
      meetings: { indexes: { byParty: { fields: ["partyId"] } } },
      chairs: { indexes: { byParty: { fields: ["partyId"] } } },
    },
  },
  // A chair who dies or moves away is replaced the same day.
  eventKinds: ["life.death", MOVED_AWAY_EVENT],
  onEvent: (api, event) => {
    for (const party of partiesHere(api))
      if (party.leaderId && event.personIds.includes(party.leaderId))
        chooseChair(
          api,
          party,
          event.kind === "life.death" ? "death" : "moved away",
        );
  },
  onCalendarWork: (api, work) => partyMeeting(api, work),
};

const NOT_PARTIES =
  /write-in|independent|petition|unaffiliated|^none$|no party|nonpartisan|unknown/i;

function value(key: string): number {
  return (parameters as { parameters: Record<string, { value: number }> })
    .parameters[key]!.value;
}

/** The parties of one state, with their shares, from the 2024 ballot or the legislature. */
export function stateParties(
  stateKey: string,
): readonly { name: string; share: number; source: string }[] {
  const usps = stateKey.slice(3);
  const president = (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        rawLabels: string[];
        totalsByParty: Record<string, number>;
      }[];
    }
  ).presidentialByState.find((r) => r.stateUsps === usps);
  if (president) {
    const total = Object.values(president.totalsByParty).reduce(
      (a, b) => a + b,
      0,
    );
    return president.rawLabels
      .filter((label) => !NOT_PARTIES.test(label))
      .map((label) => {
        const key = label
          .toLowerCase()
          .replace(/[^a-z]+/g, "-")
          .replace(/^-|-$/g, "");
        return {
          name: label,
          share: total ? (president.totalsByParty[key] ?? 0) / total : 0,
          source:
            "Clerk of the House, Statistics of the Presidential and Congressional Election of November 5, 2024 (data/source/electoral-calibration-2024)",
        };
      });
  }
  const chambers =
    (
      partyCounts as unknown as {
        places: Record<
          string,
          Record<string, { parties: Record<string, number> }>
        >;
      }
    ).places[stateKey] ?? {};
  const seats = new Map<string, number>();
  for (const chamber of Object.values(chambers))
    for (const [name, n] of Object.entries(chamber.parties))
      if (!NOT_PARTIES.test(name)) seats.set(name, (seats.get(name) ?? 0) + n);
  const total = [...seats.values()].reduce((a, b) => a + b, 0);
  if (!total) {
    // A territory with no roster: the parties of its 2024 delegate race.
    const race = (
      delegates as unknown as {
        places: Record<
          string,
          { democraticPercent: number; republicanPercent: number }
        >;
      }
    ).places[usps];
    if (!race) return [];
    return [
      ["Democratic", race.democraticPercent],
      ["Republican", race.republicanPercent],
    ].map(([name, percent]) => ({
      name: name as string,
      share: (percent as number) / 100,
      source:
        "2024 U.S. House delegate result (data/research/elections/house-delegates-2024.json)",
    }));
  }
  return [...seats].map(([name, n]) => ({
    name,
    share: total ? n / total : 0,
    source:
      "Open States current legislative roster (public domain): party seat shares",
  }));
}

/** Register the module, the state's parties and every adult's tie. */
export function openParties(core: CoreState): void {
  if (!core.modules.has(PARTIES_MODULE_ID))
    registerModule(core, PARTIES_MODULE);
  const api = coreAPI(core);
  const place = corePlaceByKey(api.state.placeMetadata.placeKey ?? "");
  const stateKey = place!.stateJurisdictionKey!;
  api.moduleState(PARTIES_MODULE_ID).table("parties"); // tables exist even where elections are nonpartisan
  const rules = (
    nomination as unknown as {
      places: Record<
        string,
        { method?: string | null; voterAccess?: string | null }
      >;
    }
  ).places[stateKey];
  const town = place!.context.jurisdiction.id;
  const parties: PartyRow[] = [];
  for (const party of stateParties(stateKey)) {
    const id = `party:${stateKey}:${party.name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    const organizationId = `organization:${id}`;
    if (!core.organizations.has(organizationId))
      api.addOrganization({
        id: organizationId,
        placeId: town,
        name: `${party.name} Party`.replace(/Party Party$/, "Party"),
        kind: "political-party",
        liquidMinor: 0,
        source: { tag: "SOURCED", citation: party.source, asOf: core.date },
      });
    parties.push({
      id,
      name: party.name,
      stateKey,
      organizationId,
      share: party.share,
      side: partySide(party.name),
      nominationMethod: rules?.method ?? null,
      voterAccess: rules?.voterAccess ?? null,
      leaderId: null,
      source: party.source,
    });
  }
  // Every adult's tie, firmest leans first.
  const townLean =
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .map((p) => ({ p, lean: personLean(core.people, p, townLean) }))
    .sort(
      (a, b) =>
        Math.abs(b.lean) - Math.abs(a.lean) || a.p.id.localeCompare(b.p.id),
    );
  const identifiers = Math.round(adults.length * value("partyIdentifierShare"));
  const totalShare = parties.reduce((a, p) => a + p.share, 0) || 1;
  const quota = new Map(
    parties.map((p) => [
      p.id,
      Math.round((identifiers * p.share) / totalShare),
    ]),
  );
  const ties = api.moduleState(PARTIES_MODULE_ID).table("ties");
  const minor = parties
    .filter((p) => p.side === 0)
    .sort((a, b) => b.share - a.share);
  let assigned = 0;
  const rest: typeof adults = [];
  for (const entry of adults) {
    const side = Math.sign(entry.lean);
    const party =
      assigned < identifiers
        ? (parties.find(
            (p) => p.side === side && side !== 0 && (quota.get(p.id) ?? 0) > 0,
          ) ?? minor.find((p) => (quota.get(p.id) ?? 0) > 0))
        : undefined;
    if (!party) {
      rest.push(entry);
      continue;
    }
    quota.set(party.id, quota.get(party.id)! - 1);
    assigned += 1;
    put(
      ties,
      entry.p,
      "party",
      party.id,
      entry.lean,
      core.date,
      party.side === side ? "lean-matches-party" : "minor-party",
    );
  }
  // Of the rest: those who lean nowhere have no party; careful thinkers call themselves independent.
  const noParty = Math.round(adults.length * value("noPartyShare"));
  rest
    .sort(
      (a, b) =>
        Math.abs(a.lean) - Math.abs(b.lean) || a.p.id.localeCompare(b.p.id),
    )
    .forEach((entry, index) =>
      put(
        ties,
        entry.p,
        index < noParty &&
          (entry.p.traits["people-mind-v1:deliberation"] ?? 0) <= 0
          ? "no-party"
          : "independent",
        null,
        entry.lean,
        core.date,
        index < noParty ? "leans-nowhere" : "independent-minded",
      ),
    );
  // Each party's leader: the member whose traits lean most toward taking part.
  for (const party of parties) {
    const members = (ties.query("byParty", [party.id]) as unknown as TieRow[])
      .map((t) => core.people.get(t.personId)!)
      .map((member) => ({
        member,
        pull: decisionLean(core, member, "parties.join", "join", "stay-out"),
      }))
      .sort((a, b) => b.pull - a.pull || a.member.id.localeCompare(b.member.id))
      .map((row) => row.member);
    for (const member of members)
      if (
        leanedYes(
          core,
          member,
          "parties.join",
          "join",
          "stay-out",
          value("partiesJoinBase"),
        )
      )
        api.join(member.id, party.organizationId);
    api
      .moduleState(PARTIES_MODULE_ID)
      .table("parties")
      .put({
        ...party,
        leaderId: members[0]?.id ?? null,
      } as unknown as ModuleRow);
  }
  scheduleMeeting(api, core.date);
}

function put(
  ties: ReturnType<ReturnType<CoreAPI["moduleState"]>["table"]>,
  person: Readonly<PersonState>,
  tie: TieRow["tie"],
  partyId: string | null,
  lean: number,
  date: string,
  reason: string,
) {
  ties.put({
    id: person.id,
    personId: person.id,
    tie,
    partyId,
    since: date,
    lean,
    reason,
  } as unknown as ModuleRow);
}

/** A person's own lean, as the campaign day reads it (right positive). */
function ownLeanOf(api: CoreAPI, person: Readonly<PersonState>): number {
  return personLean(
    api.state.people,
    person,
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0,
  );
}

/** How the lean sits against the party's positions: 1 the same, -1 opposite. */
function agreementWith(
  api: CoreAPI,
  own: number,
  party: Readonly<PartyRow>,
): number {
  const theirs = partyLean(api, party.name)?.lean ?? party.side;
  return 1 - Math.abs(own - theirs);
}

/**
 * How a person's views sit against the party they belong to today, -1 to 1,
 * or null when they belong to none. Read from their views now, so it moves
 * as their views and the party's positions move.
 */
export function partyAgreement(api: CoreAPI, personId: string): number | null {
  const person = api.state.people.get(personId);
  const tie = partyTie(api, personId);
  const party = tie?.partyId
    ? partiesHere(api).find((row) => row.id === tie.partyId)
    : undefined;
  return person && party
    ? agreementWith(api, ownLeanOf(api, person), party)
    : null;
}

/**
 * Join a party (the player's act, or anyone's): American parties take any
 * voter who registers with them, so the tie is made, and the record keeps how
 * the person's own views sit against the party's positions (their lean
 * against the party's, -1 to 1: 1 the same, -1 opposite), which their
 * loyalty and the party's other members read. Filing under the party's
 * label reads this membership (`checkEligibility`).
 */
export function joinParty(
  api: CoreAPI,
  personId: string,
  partyId: string,
): { readonly tie: TieRow; readonly agreement: number } {
  const person = api.state.people.get(personId);
  if (!person) throw new Error(`No such person: ${personId}`);
  const party = partiesHere(api).find((p) => p.id === partyId);
  if (!party) throw new Error(`No party ${partyId} here`);
  const own = ownLeanOf(api, person);
  const agreement = agreementWith(api, own, party);
  put(
    api.moduleState(PARTIES_MODULE_ID).table("ties"),
    person,
    "party",
    party.id,
    own,
    api.state.date,
    `joined; views against the party's positions ${agreement.toFixed(3)}`,
  );
  return { tie: partyTie(api, personId)!, agreement };
}

export function partyTie(api: CoreAPI, personId: string): TieRow | null {
  return (
    (api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .get(personId) as unknown as TieRow | undefined) ?? null
  );
}

export function partiesHere(api: CoreAPI): readonly PartyRow[] {
  return api
    .moduleState(PARTIES_MODULE_ID)
    .table("parties")
    .rows() as unknown as PartyRow[];
}

export interface PartyMeetingRow {
  readonly id: string;
  readonly partyId: string;
  readonly date: string;
  readonly leaderId: string | null;
  readonly attendeeIds: readonly string[];
  /** Adults newly tied to the party since the last meeting (come of age, moved in, or views moved). */
  readonly recruitedIds: readonly string[];
  /** Members whose views moved off the party's side. */
  readonly leftIds: readonly string[];
}

const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

/** The party's next local committee meeting. */
function scheduleMeeting(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), value("partyMeetingDays"));
  api.moduleCalendar(PARTIES_MODULE_ID).schedule({
    key: `party-meeting:${date}`,
    date,
    kind: "party-meeting",
    source: {
      tag: "ESTIMATED",
      citation: "Local party committees meet on a regular schedule",
      asOf: api.state.date,
      estimatedFrom: "partyMeetingDays",
    },
    sourceRecordIds: [`party-meeting:${api.state.placeMetadata.placeKey}`],
  });
}

/** A party's choice of a new chair, kept as its record. */
export interface ChairRow {
  readonly id: string;
  readonly partyId: string;
  readonly date: string;
  readonly cause: string;
  readonly previousId: string | null;
  readonly chosenId: string;
  /** Each member's vote, by the colleague they backed. */
  readonly votes: Readonly<Record<string, string>>;
}

/**
 * The party's members in town choose a new chair, each backing the colleague
 * they rate highest: how close they are to them, how near their views sit,
 * and the colleague's own pull to lead (outgoing and dutiful, the rule an
 * opening chair is read by). Nothing is drawn; the most votes win, a tie
 * going to the stronger pull. The record and a news event follow the same
 * day; returns null where the party has no member left in town.
 */
export function chooseChair(
  api: CoreAPI,
  party: PartyRow,
  cause: string,
): ChairRow | null {
  const core = api.state as CoreState;
  const date = core.date;
  const town = corePlaceByKey(core.placeMetadata.placeKey ?? "")?.context
    .jurisdiction.id;
  const members = (
    api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .query("byParty", [party.id]) as unknown as TieRow[]
  )
    .map((t) => core.people.get(t.personId))
    .filter(
      (p): p is PersonState =>
        !!p &&
        p.alive &&
        p.id !== party.leaderId &&
        p.placeId === town &&
        core.memberships.has(`${p.id}:${party.organizationId}`),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!members.length) return null;
  const townLean =
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0;
  const lean = new Map(
    members.map((m) => [m.id, personLean(core.people, m, townLean)]),
  );
  const pulls = new Map(
    members.map((m) => [
      m.id,
      decisionTraitWeight(core, "parties.attend") *
        decisionLean(core, m, "parties.attend", "attend", "stay-home"),
    ]),
  );
  const pull = (p: Readonly<PersonState>) => pulls.get(p.id) ?? 0;
  const votes: Record<string, string> = {};
  const tally = new Map<string, number>();
  for (const voter of members) {
    let best: { id: string; score: number } | null = null;
    for (const colleague of members) {
      const score =
        value("chairVoteRelationshipWeight") *
          (colleague.id === voter.id
            ? 0
            : closenessBetween(core, voter.id, colleague.id)) +
        value("chairVoteAgreementWeight") *
          (1 - Math.abs(lean.get(voter.id)! - lean.get(colleague.id)!) / 2) +
        value("chairVotePullWeight") * pull(colleague);
      if (
        !best ||
        score > best.score ||
        (score === best.score && colleague.id < best.id)
      )
        best = { id: colleague.id, score };
    }
    votes[voter.id] = best!.id;
    tally.set(best!.id, (tally.get(best!.id) ?? 0) + 1);
  }
  const chosen = [...tally].sort(
    (a, b) =>
      b[1] - a[1] ||
      pull(core.people.get(b[0])!) - pull(core.people.get(a[0])!) ||
      a[0].localeCompare(b[0]),
  )[0]![0];
  const row: ChairRow = {
    id: `party-chair:${party.id}:${date}`,
    partyId: party.id,
    date,
    cause,
    previousId: party.leaderId,
    chosenId: chosen,
    votes,
  };
  api
    .moduleState(PARTIES_MODULE_ID)
    .table("chairs")
    .put(row as unknown as ModuleRow);
  api
    .moduleState(PARTIES_MODULE_ID)
    .table("parties")
    .put({ ...party, leaderId: chosen } as unknown as ModuleRow);
  api.emit({
    id: row.id,
    date,
    kind: "party-chair-chosen",
    personIds: [chosen, ...(party.leaderId ? [party.leaderId] : [])].filter(
      (id) => core.people.has(id),
    ),
    placeId: core.people.get(chosen)!.placeId,
    source: {
      tag: "SOURCED",
      citation: `${party.name} members' vote for chair (${cause})`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: {
      partyId: party.id,
      cause,
      previousId: party.leaderId ?? "",
      chosenId: chosen,
      votesFor: String(tally.get(chosen)),
      voters: String(members.length),
    },
  });
  return row;
}

/**
 * The parties' monthly meeting in town. Adults with no tie yet (come of age,
 * moved in, met for the first time) take one by the opening's rule: a lean
 * as firm as the town's party identifiers' takes the party on its side, the
 * least committed have no party, the rest call themselves independent.
 * Members whose views have crossed to the other side leave (loyalty holds a
 * tie while views stay on its side). Those newly tied decide whether to join
 * the organization; a leader who died, moved or left is replaced; the
 * members inclined to show up meet the leader.
 */
function partyMeeting(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "party-meeting") return;
  scheduleMeeting(api, api.state.date);
  const parties = partiesHere(api);
  if (!parties.length) return;
  const core = api.state as CoreState;
  const date = core.date;
  const town = corePlaceByKey(core.placeMetadata.placeKey ?? "")?.context
    .jurisdiction.id;
  if (!town) return;
  const townLean =
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0;
  const adults = [...(core.peopleByPlace.get(town) ?? [])]
    .map((id) => core.people.get(id))
    .filter((p): p is PersonState => !!p && p.alive && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({ p, lean: personLean(core.people, p, townLean) }));
  if (!adults.length) return;
  const firm = adults.map((a) => Math.abs(a.lean)).sort((a, b) => b - a);
  const identifierCut =
    firm[
      Math.max(0, Math.round(firm.length * value("partyIdentifierShare")) - 1)
    ]!;
  const noPartyCut =
    firm[
      Math.max(0, firm.length - Math.round(firm.length * value("noPartyShare")))
    ] ?? 0;
  const bySide = (side: number) =>
    [...parties]
      .filter((p) => p.side === side)
      .sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))[0];
  const partyFor = (lean: number) =>
    Math.abs(lean) >= identifierCut && lean !== 0
      ? (bySide(Math.sign(lean)) ?? bySide(0))
      : undefined;
  const ties = api.moduleState(PARTIES_MODULE_ID).table("ties");
  const recruited = new Map<string, string[]>();
  const left = new Map<string, string[]>();
  const playerId = core.playerId;
  for (const { p, lean } of adults) {
    // The player ties themselves (their own choice), never the meeting.
    if (p.id === playerId) continue;
    const tie = partyTie(api, p.id);
    const held = tie?.partyId
      ? parties.find((row) => row.id === tie.partyId)
      : undefined;
    // Loyalty: a tie stays while the person's views stay on its side.
    if (tie && !(held && held.side !== 0 && Math.sign(lean) === -held.side))
      continue;
    const party = partyFor(lean);
    if (held) left.set(held.id, [...(left.get(held.id) ?? []), p.id]);
    if (party) {
      put(
        ties,
        p,
        "party",
        party.id,
        lean,
        date,
        tie ? "views-moved" : "newly-tied",
      );
      recruited.set(party.id, [...(recruited.get(party.id) ?? []), p.id]);
      if (
        leanedYes(
          core,
          p,
          "parties.join",
          "join",
          "stay-out",
          value("partiesJoinBase"),
        )
      )
        api.join(p.id, party.organizationId);
    } else
      put(
        ties,
        p,
        Math.abs(lean) <= noPartyCut &&
          (p.traits["people-mind-v1:deliberation"] ?? 0) <= 0
          ? "no-party"
          : "independent",
        null,
        lean,
        date,
        tie ? "views-moved" : "newly-tied",
      );
  }
  const here = new Set(adults.map((a) => a.p.id));
  for (const party of parties) {
    const members = (ties.query("byParty", [party.id]) as unknown as TieRow[])
      .filter(
        (t) =>
          here.has(t.personId) &&
          core.memberships.has(`${t.personId}:${party.organizationId}`),
      )
      .map((t) => core.people.get(t.personId)!);
    if (!members.length) continue;
    // A chair who left the party is replaced by the members' own choice.
    const leaderId =
      party.leaderId && members.some((m) => m.id === party.leaderId)
        ? party.leaderId
        : chooseChair(api, party, "left the party")!.chosenId;
    const attendeeIds = members
      .filter(
        (m) =>
          m.id === leaderId ||
          leanedYes(
            core,
            m,
            "parties.attend",
            "attend",
            "stay-home",
            -value("partyMeetingAttendBar"),
          ),
      )
      .map((m) => m.id);
    for (const id of attendeeIds)
      if (id !== leaderId) api.relationship(leaderId, id, "contact", 0.1);
    // The leader addresses the room on what they feel most strongly about.
    const audienceIds = attendeeIds.filter((id) => id !== leaderId);
    const leader = core.people.get(leaderId)!;
    const leaderLean = personLean(core.people, leader, townLean);
    const topic = [...PLATFORM_QUESTIONS]
      .map((question) => ({
        question,
        want: viewOn(api, leaderId, question, leaderLean),
      }))
      .filter((row) => row.want !== 0)
      .sort(
        (a, b) =>
          Math.abs(b.want) - Math.abs(a.want) ||
          a.question.localeCompare(b.question),
      )[0];
    if (topic && audienceIds.length && core.modules.has(SPEECH_MODULE_ID))
      deliverSpeech(api, {
        id: `speech:party-meeting:${party.id}:${date}`,
        speakerId: leaderId,
        placeId: town,
        topic: topic.question,
        desiredChange: topic.want > 0 ? "enact" : "repeal",
        audienceIds,
      });
    api
      .moduleState(PARTIES_MODULE_ID)
      .table("meetings")
      .put({
        id: `party-meeting:${party.id}:${date}`,
        partyId: party.id,
        date,
        leaderId,
        attendeeIds,
        recruitedIds: recruited.get(party.id) ?? [],
        leftIds: left.get(party.id) ?? [],
      } satisfies PartyMeetingRow as unknown as ModuleRow);
  }
}

export function partyMeetings(
  api: CoreAPI,
  partyId: string,
): readonly PartyMeetingRow[] {
  return api
    .moduleState(PARTIES_MODULE_ID)
    .table("meetings")
    .query("byParty", [partyId]) as unknown as PartyMeetingRow[];
}
