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
import { placeStateKey } from "../place-map";
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import delegates from "../../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import nomination from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import parameters from "../data/campaigns/parameters.json" with { type: "json" };
import { partySide } from "../appointments";
import { worldRoster, worldSwing } from "../electorate-places";
import { centuryParties, centuryStateVote } from "../electorate-century";
import { stanceLean } from "./officials";
import { partyLean } from "../campaign-stances";
import { coreAPI, fillInPerson, registerModule } from "../state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import { corePlaceByKey } from "../place-lookup";
import { personLean } from "../campaign-views";
import { campaignParameter, PLATFORM_QUESTIONS } from "../campaign-data";
import { homeDistanceMiles } from "../home-distance";
import { viewOn } from "./views";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import { MOVED_AWAY_EVENT } from "./moves";
import { closenessBetween } from "../closeness";
import { ACCEPTING_MOVES, REFUSING_MOVES } from "../scene-replies";
import {
  decisionLean,
  decisionTraitWeight,
  leanedYes,
} from "../trait-decisions";
import type { ModuleCalendarWork } from "../module-calendar";
import { addDays, ageInYears, makeIsoDate } from "../kernel/dates";

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
      /** Who took a member under their wing when the party asked them to run (`takeUnderWing`), by the member. */
      mentors: {},
      /** The local committees' next meeting day, kept when it is set (`scheduleMeeting`). */
      schedule: {},
      /**
       * The player's answer to their party's invitation to a meeting, one row per meeting: `asked` until
       * they answer in the scene it stages, then `yes` or `no`. The meeting reads it for the player in
       * place of a lean (`meetTheChair`): nothing decides for the player whether they go. A meeting's
       * row goes at the next meeting.
       */
      playerAttends: {},
    },
  },
  // A chair who dies or moves away is replaced the same day; the player's reply to a meeting's
  // invitation is kept.
  eventKinds: ["life.death", MOVED_AWAY_EVENT, "scene.reply"],
  onEvent: (api, event) => {
    if (event.kind === "scene.reply") {
      answerMeetingInvite(api, event);
      return;
    }
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

/**
 * Ballot lines that are not parties: write-ins, no-party labels, and the
 * count lines some states print beside the candidates (blank, void, over and
 * under votes, scattering, "none of these", all others).
 */
const NOT_PARTIES =
  /write-in|independent|petition|unaffiliated|unenrolled|^none$|no party|nonpartisan|unknown|\bvotes$|^blanks?$|^void$|scattering|none of these|^(all )?others$|miscellaneous/i;

function value(key: string): number {
  return (parameters as { parameters: Record<string, { value: number }> })
    .parameters[key]!.value;
}

/**
 * How far from having no party someone is: how firmly they lean, plus a little
 * for careful thinking. The lowest scores in a town have no party and the rest
 * call themselves independent (a scale, not a cut on either trait).
 */
function noPartyScore(
  lean: number,
  traits: Readonly<Record<string, number>>,
): number {
  return (
    Math.abs(lean) +
    value("noPartyDeliberationWeight") *
      (traits["people-mind-v1:deliberation"] ?? 0)
  );
}

/**
 * In a world whose day one is the century's, a person takes their side's party when their own
 * lean reaches far enough toward where that party stands (`partyIdentityReach` of the way, on the
 * voters' scale), and has no party when they lean nowhere and think least (`noPartyReach`); so
 * how many take a party follows the world's own parties, never a fixed share (History family 9,
 * PR 9c; pins parties.ts:301, :340, :865). Undefined under "today".
 */
function centuryTies(seed: string):
  | {
      readonly identifies: (lean: number) => boolean;
      readonly noPartyCut: number;
    }
  | undefined {
  const parties = centuryParties(seed);
  if (!parties) return undefined;
  const at: Record<number, number> = {};
  for (const party of parties) {
    const now = party.positions.at(-1)?.position;
    if (now !== undefined) at[party.side] = stanceLean(now);
  }
  const reach = value("partyIdentityReach");
  return {
    identifies: (lean) => {
      const position = at[Math.sign(lean)];
      return (
        lean !== 0 &&
        position !== undefined &&
        Math.abs(lean) >= reach * Math.abs(position)
      );
    },
    noPartyCut: value("noPartyReach"),
  };
}

/** The parties of one state, with their shares, from the 2024 ballot or the legislature. */
export function stateParties(
  stateKey: string,
  seed: string,
): readonly { name: string; share: number; source: string }[] {
  const usps = stateKey.slice(3);
  // In a world whose day one is the century's, the parties are the century's, each at its share
  // of the state's last presidential count there (History family 9, PR 9c; CTO line 6935508228).
  const parties = centuryParties(seed);
  const counted = centuryStateVote(seed, stateKey);
  if (parties && counted)
    return parties.map((party) => ({
      name: party.name,
      share:
        party.side > 0 ? counted.republicanShare : 1 - counted.republicanShare,
      source: `The century's count of ${counted.year} in the state (${counted.id})`,
    }));
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
    // This world's 2024: the two major parties' votes moved by its swing.
    const twoParty =
      (president.totalsByParty.democratic ?? 0) +
      (president.totalsByParty.republican ?? 0);
    const moved = worldSwing(seed, usps) * twoParty;
    return president.rawLabels
      .filter((label) => !NOT_PARTIES.test(label))
      .map((label) => {
        const key = label
          .toLowerCase()
          .replace(/[^a-z]+/g, "-")
          .replace(/^-|-$/g, "");
        return {
          name: label,
          share: total
            ? Math.max(
                0,
                (president.totalsByParty[key] ?? 0) + partySide(label) * moved,
              ) / total
            : 0,
          source:
            "Clerk of the House, Statistics of the Presidential and Congressional Election of November 5, 2024 (data/source/electoral-calibration-2024)",
        };
      });
  }
  // Who holds the state's chambers in this world (realistic, not real).
  const chambers = worldRoster(seed).places[stateKey] ?? {};
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
  const stateKey = placeStateKey(api.state.placeMetadata.placeKey ?? "")!;
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
  for (const party of stateParties(stateKey, core.seed)) {
    const id = `party:${stateKey}:${party.name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    const organizationId = `organization:${id}`;
    if (!core.organizations.has(organizationId))
      api.addOrganization({
        id: organizationId,
        placeId: town,
        name: `${party.name} Party`.replace(/Party Party$/, "Party"),
        kind: "political-party",
        // The party's office, a place a member may go (play-join-a-party-has-no-scene-and-no-headquarters).
        classification: "membership:political-party",
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
  const adultAge = api.parameter("votingAge");
  const townLean =
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0;
  // The player's party is the player's to choose (owner, Nov 8: "it says
  // that I'm registered Democrat already"): they open with none.
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (player)
    put(
      api.moduleState(PARTIES_MODULE_ID).table("ties"),
      player,
      "no-party",
      null,
      personLean(core.people, player, townLean),
      core.date,
      "the-player-chooses",
    );
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.id !== core.playerId &&
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >=
          adultAge,
    )
    .map((p) => ({ p, lean: personLean(core.people, p, townLean) }))
    .sort(
      (a, b) =>
        Math.abs(b.lean) - Math.abs(a.lean) || a.p.id.localeCompare(b.p.id),
    );
  const ties = api.moduleState(PARTIES_MODULE_ID).table("ties");
  // A world whose day one is the century's: each adult by their own lean against the parties.
  const century = centuryTies(core.seed);
  if (century)
    for (const entry of adults) {
      const party = century.identifies(entry.lean)
        ? parties.find((p) => p.side === Math.sign(entry.lean))
        : undefined;
      if (party)
        put(
          ties,
          entry.p,
          "party",
          party.id,
          entry.lean,
          core.date,
          "near-party-position",
        );
      else {
        const none =
          noPartyScore(entry.lean, entry.p.traits) <= century.noPartyCut;
        put(
          ties,
          entry.p,
          none ? "no-party" : "independent",
          null,
          entry.lean,
          core.date,
          none ? "leans-nowhere" : "independent-minded",
        );
      }
    }
  // Under "today": the published shares, firmest leans first.
  if (!century) {
    const identifiers = Math.round(
      adults.length * value("partyIdentifierShare"),
    );
    const totalShare = parties.reduce((a, p) => a + p.share, 0) || 1;
    const quota = new Map(
      parties.map((p) => [
        p.id,
        Math.round((identifiers * p.share) / totalShare),
      ]),
    );
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
              (p) =>
                p.side === side && side !== 0 && (quota.get(p.id) ?? 0) > 0,
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
          noPartyScore(a.lean, a.p.traits) - noPartyScore(b.lean, b.p.traits) ||
          a.p.id.localeCompare(b.p.id),
      )
      .forEach((entry, index) =>
        put(
          ties,
          entry.p,
          index < noParty ? "no-party" : "independent",
          null,
          entry.lean,
          core.date,
          index < noParty ? "leans-nowhere" : "independent-minded",
        ),
      );
  }
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
        // Never the player, who leads a party only if its members choose them
        // in play (a player the creator made an adult is one of its members).
        leaderId: members.find((m) => m.id !== core.playerId)?.id ?? null,
      } as unknown as ModuleRow);
    // The party met every month before the world opens: the members who
    // would have come, by the same rule as every meeting since, already know
    // the chair (parties-opening-chair-knows-no-members).
    const leaderId = members.find((m) => m.id !== core.playerId)?.id;
    if (leaderId)
      meetTheChair(
        api,
        leaderId,
        members.filter((m) =>
          core.memberships.has(`${m.id}:${party.organizationId}`),
        ),
      );
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
/** The record a person joining a party writes. */
export const PARTY_JOINED = "party-joined";

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
  const held = partyTie(api, personId);
  put(
    api.moduleState(PARTIES_MODULE_ID).table("ties"),
    person,
    "party",
    party.id,
    own,
    api.state.date,
    `joined; views against the party's positions ${agreement.toFixed(3)}`,
  );
  // Joining is the person's own act, so the party's membership (which its
  // meetings and chair read) holds them too, and a party they left does not.
  const left = held?.partyId
    ? partiesHere(api).find((row) => row.id === held.partyId)
    : undefined;
  if (left && left.id !== party.id) api.leave(personId, left.organizationId);
  api.join(personId, party.organizationId);
  // Joining is an act at a place with a person: the record the director's
  // scene, the journal and Travel read, at the party's office, with the
  // party's leader (its chair) as the one who signs them up.
  // The leader is met the moment the person joins, so one still in the wider
  // population is filled in as a full person.
  if (party.leaderId && !api.state.people.has(party.leaderId))
    fillInPerson(api.state as CoreState, party.leaderId as PersonId);
  const greeter =
    party.leaderId && api.state.people.has(party.leaderId)
      ? party.leaderId
      : null;
  api.emit({
    id: `party-joined:${personId}:${party.id}:${api.state.date}`,
    date: api.state.date,
    kind: PARTY_JOINED,
    personIds: [
      personId,
      ...(greeter && greeter !== personId ? [greeter] : []),
    ],
    placeId: person.placeId,
    source: {
      tag: "SOURCED",
      citation: `${party.name} membership (${party.source})`,
      asOf: api.state.date,
    },
    facts: {
      partyId: party.id,
      party: party.name,
      organizationId: party.organizationId,
      ...(left && left.id !== party.id ? { leftPartyId: left.id } : {}),
    },
  });
  // The player who joins is told when the committee next meets.
  if (personId === (api.state as CoreState).playerId) {
    const next = api
      .moduleState(PARTIES_MODULE_ID)
      .table("schedule")
      .get("next") as unknown as { date: string } | undefined;
    if (next) invitePlayer(api, next.date);
  }
  return { tie: partyTie(api, personId)!, agreement };
}

/** The record of a party inviting the player to its next meeting (a scene stages from it). */
export const PARTY_MEETING_INVITED = "party-meeting-invited";

interface PlayerAttendsRow {
  readonly id: string;
  readonly partyId: string;
  readonly date: string;
  readonly answer: "asked" | "yes" | "no";
}

/**
 * The player's party invites them to its next meeting, through its chair: one invitation a meeting,
 * when they join and when the meeting before it sets the day. A scene puts it to them, and their reply
 * is kept (`answerMeetingInvite`); a player with no party here is not invited.
 */
function invitePlayer(api: CoreAPI, date: string): void {
  const core = api.state as CoreState;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (!player?.alive) return;
  const partyId = partyTie(api, player.id)?.partyId;
  const party = partyId
    ? partiesHere(api).find((p) => p.id === partyId)
    : undefined;
  if (!party || !partyMemberIds(api, party.id).includes(player.id)) return;
  const attends = api.moduleState(PARTIES_MODULE_ID).table("playerAttends");
  const id = `${party.id}:${date}`;
  if (attends.get(id)) return;
  attends.put({
    id,
    partyId: party.id,
    date,
    answer: "asked",
  } satisfies PlayerAttendsRow as unknown as ModuleRow);
  const chairId =
    party.leaderId &&
    party.leaderId !== player.id &&
    core.people.has(party.leaderId)
      ? party.leaderId
      : null;
  api.emit({
    id: `${PARTY_MEETING_INVITED}:${id}:${player.id}`,
    date: core.date,
    kind: PARTY_MEETING_INVITED,
    personIds: chairId
      ? [chairId as PersonId, player.id as PersonId]
      : [player.id as PersonId],
    placeId: player.placeId,
    source: {
      tag: "ESTIMATED",
      citation: "Local party committees meet on a regular schedule",
      asOf: core.date,
      estimatedFrom: "partyMeetingDays",
    },
    facts: {
      inviteId: id,
      partyId: party.id,
      party: party.name,
      meetingDate: date,
      askedId: player.id,
      ...(chairId ? { chairId } : {}),
    },
  });
}

/** The player's reply in the meeting invitation's scene: a yes puts them in the room that day; a no keeps them home. */
function answerMeetingInvite(
  api: CoreAPI,
  event: Readonly<{ facts?: Readonly<Record<string, unknown>> }>,
): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "party-meeting-invite") return;
  const cause = api.state.durableLog.get(String(facts.causeId ?? "") as never);
  if (cause?.kind !== PARTY_MEETING_INVITED) return;
  const attends = api.moduleState(PARTIES_MODULE_ID).table("playerAttends");
  const held = attends.get(String(cause.facts?.inviteId ?? "")) as unknown as
    PlayerAttendsRow | undefined;
  if (!held) return;
  const move = String(facts.move);
  const yes = ACCEPTING_MOVES.has(move);
  if (!yes && !REFUSING_MOVES.has(move)) return;
  attends.put({ ...held, answer: yes ? "yes" : "no" } as unknown as ModuleRow);
}

/** Whether the player said yes to their party's meeting on this day. */
function playerSaidYes(api: CoreAPI, playerId: string, date: string): boolean {
  const partyId = partyTie(api, playerId)?.partyId;
  if (!partyId) return false;
  const held = api
    .moduleState(PARTIES_MODULE_ID)
    .table("playerAttends")
    .get(`${partyId}:${date}`) as unknown as PlayerAttendsRow | undefined;
  return held?.answer === "yes";
}

export function partyTie(api: CoreAPI, personId: string): TieRow | null {
  return (
    (api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .get(personId) as unknown as TieRow | undefined) ?? null
  );
}

/**
 * The people a party's membership holds: tied to it and members of its
 * organization (joining as an act writes both; the yearly weighing writes the
 * membership only for those it settles to join). Its meetings and its chair
 * read this roster.
 */
export function partyMemberIds(api: CoreAPI, partyId: string): string[] {
  const party = partiesHere(api).find((row) => row.id === partyId);
  if (!party) return [];
  return (
    api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .query("byParty", [partyId]) as unknown as TieRow[]
  )
    .filter((t) =>
      (api.state as CoreState).memberships.has(
        `${t.personId}:${party.organizationId}`,
      ),
    )
    .map((t) => t.personId);
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
  ageInYears(p.birthDate, date);

/**
 * Who comes to a party meeting: the chair and each member whose case for
 * going outweighs the evening's cost (`attendCase`, then temperament). Each
 * one who comes spends the evening in the room with the chair, a contact tie
 * between them. Returns the ids in the room, the chair first.
 */
function meetTheChair(
  api: CoreAPI,
  leaderId: PersonId,
  members: readonly Readonly<PersonState>[],
): PersonId[] {
  const core = api.state as CoreState;
  const attendeeIds = members
    .filter(
      (m) =>
        m.id === leaderId ||
        // The player comes only by their own yes to the invitation, never by a lean.
        (m.id === core.playerId
          ? playerSaidYes(api, m.id, core.date)
          : leanedYes(
              core,
              m,
              "parties.attend",
              "attend",
              "stay-home",
              attendCase(core, m),
            )),
    )
    .map((m) => m.id);
  for (const id of attendeeIds)
    if (id !== leaderId)
      api.relationship(
        leaderId,
        id,
        "contact",
        value("partyMeetingContactHours"),
      );
  return attendeeIds;
}

/** The party's next local committee meeting. */
function scheduleMeeting(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), value("partyMeetingDays"));
  api
    .moduleState(PARTIES_MODULE_ID)
    .table("schedule")
    .put({ id: "next", date } as unknown as ModuleRow);
  invitePlayer(api, date);
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
 * A member's case for going to a party meeting, before temperament: the
 * reason every member has to go, less the hours their work already takes of a working
 * week (free time) and less how far from the meeting their home is (the
 * household's distance from the middle of town against a distance that costs
 * a trip the most). Both slide: a retiree across town and a worker next door
 * are each in between.
 */
export function attendCase(
  core: CoreState,
  member: Readonly<PersonState>,
): number {
  const weeklyWork = [...(core.work.commitmentsByPerson.get(member.id) ?? [])]
    .map((id) => core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  const workShare = Math.min(
    1,
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes"),
  );
  const miles = homeDistanceMiles(core, member.householdId);
  const farShare = miles / (miles + value("partyMeetingHalfDistanceMiles"));
  return (
    value("partyMeetingAttendEase") -
    value("partyMeetingFreeTimeWeight") * workShare -
    value("partyMeetingDistanceWeight") * farShare
  );
}

/**
 * The opening's rule for who takes which tie, read from the town's adults: a
 * lean as firm as the town's party identifiers' takes the party on its side,
 * the least committed have no party, the rest call themselves independent.
 * The monthly meeting ties the adults it finds untied by it, and a person who
 * files for a partisan seat before the meeting has met them takes their tie
 * by the same rule (`tieBeforeFiling`).
 */
interface TieRule {
  readonly town: string;
  readonly adults: readonly { p: PersonState; lean: number }[];
  readonly partyFor: (lean: number) => PartyRow | undefined;
  readonly noPartyCut: number;
  readonly townLean: number;
}
const tieRules = new WeakMap<
  object,
  { date: string; rule: TieRule | undefined }
>();
function townTieRule(api: CoreAPI): TieRule | undefined {
  const held = tieRules.get(api.state);
  if (held && held.date === api.state.date) return held.rule;
  const rule = buildTieRule(api);
  tieRules.set(api.state, { date: api.state.date, rule });
  return rule;
}
function buildTieRule(api: CoreAPI): TieRule | undefined {
  const parties = partiesHere(api);
  if (!parties.length) return undefined;
  const core = api.state as CoreState;
  const date = core.date;
  const town = corePlaceByKey(core.placeMetadata.placeKey ?? "")?.context
    .jurisdiction.id;
  if (!town) return undefined;
  const townLean =
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0;
  const adultAge = api.parameter("votingAge");
  const adults = [...(core.peopleByPlace.get(town) ?? [])]
    .map((id) => core.people.get(id))
    .filter(
      (p): p is PersonState => !!p && p.alive && ageOn(p, date) >= adultAge,
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({ p, lean: personLean(core.people, p, townLean) }));
  if (!adults.length) return undefined;
  const bySide = (side: number) =>
    [...parties]
      .filter((p) => p.side === side)
      .sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))[0];
  // A world whose day one is the century's: the opening's own rule, by each lean against the parties.
  const century = centuryTies(core.seed);
  if (century)
    return {
      town,
      adults,
      partyFor: (lean: number) =>
        century.identifies(lean) ? bySide(Math.sign(lean)) : undefined,
      noPartyCut: century.noPartyCut,
      townLean,
    };
  const firm = adults.map((a) => Math.abs(a.lean)).sort((a, b) => b - a);
  const identifierCut =
    firm[
      Math.max(0, Math.round(firm.length * value("partyIdentifierShare")) - 1)
    ]!;
  const scores = adults
    .map((a) => noPartyScore(a.lean, a.p.traits))
    .sort((a, b) => b - a);
  const noPartyCut =
    scores[
      Math.max(
        0,
        scores.length - Math.round(scores.length * value("noPartyShare")),
      )
    ] ?? 0;
  const partyFor = (lean: number) =>
    Math.abs(lean) >= identifierCut && lean !== 0
      ? (bySide(Math.sign(lean)) ?? bySide(0))
      : undefined;
  return { town, adults, partyFor, noPartyCut, townLean };
}

/**
 * One person takes their tie by the opening's rule: the party on their side
 * (and may join its organization), no party or independent.
 */
function tiePerson(
  api: CoreAPI,
  p: PersonState,
  lean: number,
  rule: TieRule,
  reason: string,
): void {
  const ties = api.moduleState(PARTIES_MODULE_ID).table("ties");
  const date = api.state.date;
  const party = rule.partyFor(lean);
  if (!party) {
    put(
      ties,
      p,
      noPartyScore(lean, p.traits) <= rule.noPartyCut
        ? "no-party"
        : "independent",
      null,
      lean,
      date,
      reason,
    );
    return;
  }
  put(ties, p, "party", party.id, lean, date, reason);
  if (
    leanedYes(
      api.state as CoreState,
      p,
      "parties.join",
      "join",
      "stay-out",
      value("partiesJoinBase"),
    )
  )
    api.join(p.id, party.organizationId);
}

/**
 * A resident of the town who files for a partisan seat before the monthly
 * meeting has met them has no tie yet, and would file under no label though
 * their views sit on a party's side. They take their tie by the meeting's own
 * rule first, so the label they file under is the party their views name.
 */
export function tieBeforeFiling(api: CoreAPI, personId: string): void {
  if (partyTie(api, personId)) return;
  const rule = townTieRule(api);
  const person = api.state.people.get(personId as PersonId);
  if (
    !rule ||
    !person?.alive ||
    person.placeId !== rule.town ||
    ageOn(person, api.state.date) < api.parameter("votingAge")
  )
    return;
  tiePerson(
    api,
    person,
    personLean(api.state.people, person, rule.townLean),
    rule,
    "newly-tied",
  );
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
  // The player's answers to meetings already held are spent: only the coming meetings' stay.
  const attends = api.moduleState(PARTIES_MODULE_ID).table("playerAttends");
  for (const row of attends.rows() as unknown as { id: string; date: string }[])
    if (row.date < api.state.date) attends.remove(row.id);
  scheduleMeeting(api, api.state.date);
  const rule = townTieRule(api);
  if (!rule) return;
  const { adults, partyFor, townLean } = rule;
  const parties = partiesHere(api);
  const core = api.state as CoreState;
  const date = core.date;
  const town = rule.town;
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
    tiePerson(api, p, lean, rule, tie ? "views-moved" : "newly-tied");
    if (party)
      recruited.set(party.id, [...(recruited.get(party.id) ?? []), p.id]);
  }
  const here = new Set(adults.map((a) => a.p.id));
  for (const party of parties) {
    const members = partyMemberIds(api, party.id)
      .filter((id) => here.has(id))
      .map((id) => core.people.get(id)!);
    if (!members.length) continue;
    // A chair who left the party is replaced by the members' own choice.
    const leaderId =
      party.leaderId && members.some((m) => m.id === party.leaderId)
        ? party.leaderId
        : chooseChair(api, party, "left the party")!.chosenId;
    const attendeeIds = meetTheChair(api, leaderId, members);
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
        occasion: {
          recordId: `party-meeting:${party.id}:${date}`,
          kind: "party-meeting",
        },
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
