/**
 * Public meetings (BOARD "next" item 2): public comment at council and county
 * meetings, testimony at legislative hearings, town halls and debates.
 *
 * - **Public comment and testimony.** Anyone may sign up to speak on a bill
 *   before its vote (`signUpToSpeak`): at a town or county meeting it's public
 *   comment, in a legislature it's testimony at the bill's hearing. At a local
 *   meeting the residents who feel most strongly about the bill's question,
 *   and have the temperament to stand up, speak too. Every member hears the
 *   room: its balance, by how many spoke, is one of their recorded reasons.
 * - **Town halls.** An official or candidate holds one (`holdTownHall`): the
 *   town's most civic-minded adults come, each asks about the question they
 *   feel most strongly about, and the host answers. Those in the room decide
 *   for themselves; a candidate's answers are promises on the record.
 * - **Debates.** Two weeks before a general election, the town's widest-reaching
 *   outlet hosts each race with two or more candidates. Every candidate
 *   answers the moderator's questions, and the outlet's audience hears them
 *   all. A race the player runs in waits for the player's answers
 *   (`answerDebate`).
 */
import rows from "../data/meetings/parameters.json" with { type: "json" };
import { coreAPI, fillInPerson, registerModule } from "../state";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  decisionLean,
  decisionTraitWeight,
  leanedYesWithTerm,
  reportOutcome,
} from "../trait-decisions";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { lawChain } from "./laws";
import { residentsRuntime } from "./residents";
import { isDemoted } from "../counted-groups";
import { countedResidents } from "../electorate";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  makeStatements,
  touchImpression,
  type CauseRow,
} from "./campaigns";
import {
  billOf,
  billReach,
  LEGISLATURE_MODULE_ID,
  members,
  provisionStance,
  registerLegislatureHooks,
  type BillRow,
} from "./legislature";
import {
  ACCEPTING_MOVES,
  candidateAnswers,
  followersOf,
  interviewQuestions,
  outletsHere,
  platformAnswers,
  REFUSING_MOVES,
  type InterviewAnswer,
} from "./press";
import { closenessBetween } from "../closeness";
import { personLean, questionAxis, type Stance } from "../campaign-views";
import { agreementWith, viewOn } from "./views";
import { POLICY_QUESTIONS } from "../policy-answers";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";

export const MEETINGS_MODULE_ID = "core2-meetings-v1";

interface ParameterRow {
  readonly value: number;
}
const PARAMETERS = (
  rows as unknown as { parameters: Record<string, ParameterRow> }
).parameters;
export function meetingParameter(key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown meetings parameter: ${key}`);
  return row.value;
}

/** One person's say on a bill, at a meeting's public comment or a hearing. */
export interface RemarkRow {
  readonly id: string;
  readonly billId: string;
  readonly personId: string;
  readonly kind: "public-comment" | "testimony";
  readonly question: string;
  /** For (+1) or against (-1) the bill. */
  readonly position: number;
  /** Signed up ahead (the player, anyone who asks) or stood up at the meeting. */
  readonly signedUp: boolean;
  readonly date: string;
}

export interface TownHallRow {
  readonly id: string;
  readonly hostId: string;
  readonly filingId: string | null;
  readonly date: string;
  readonly attendeeIds: readonly string[];
  readonly questions: readonly { askedBy: string; question: string }[];
  readonly answers: readonly InterviewAnswer[];
  /** Each attendee's cause row (`campaigns` causes): how the room moved their view of the host. */
  readonly causeIds: readonly string[];
  readonly moved: number;
  /** Why the host called it, where they weighed it (not the player's own choice): the cause and the parts of the decision. */
  readonly calledFor?: {
    readonly cause: "bill" | "race";
    readonly recordId: string;
    readonly reasons: Readonly<Record<string, number>>;
  };
}

export interface DebateRow {
  readonly id: string;
  readonly contestId: string;
  readonly outletId: string | null;
  readonly date: string;
  readonly status: "invited" | "held";
  readonly questions: readonly string[];
  readonly answers: Readonly<Record<string, readonly InterviewAnswer[]>>;
  readonly audience: number;
}

export const MEETINGS_MODULE: CoreModule = {
  id: MEETINGS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      remarks: { indexes: { byBill: { fields: ["billId"] } } },
      townHalls: { indexes: { byHost: { fields: ["hostId"] } } },
      debates: { indexes: { byContest: { fields: ["contestId"] } } },
    },
  },
  onCalendarWork: (api, work) => debateWeek(api, work),
  // The player answers a debate's invitation in the scene it stages.
  eventKinds: ["scene.reply"],
  onEvent: (api, event) => answerDebateInvitation(api, event),
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(MEETINGS_MODULE_ID).table(name);
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);
/**
 * What a resident's feeling (`base`) comes to as a drive to stand up: the
 * feeling times one plus every trait's lean toward taking part in a public
 * meeting over staying away, at the decision's weight (extraversion and
 * attending meetings, Mondak et al. 2010).
 */
function driveOf(
  base: number,
  p: Readonly<Pick<PersonState, "id" | "traits">>,
  core: Pick<CoreState, "data">,
): { drive: number; lean: number } {
  const lean = decisionLean(
    core,
    p,
    "meetings.take-part",
    "take-part",
    "stay-away",
  );
  return {
    drive: base * (1 + decisionTraitWeight(core, "meetings.take-part") * lean),
    lean,
  };
}

/**
 * The meeting's time takes the `room` most driven of `rows`. The audit's
 * probe (off in play) sees, for each of them, whether they took part, and
 * whether they would have with temperament left out (the room filled by
 * feeling alone), so the matrix shows who took part by thirds of lean. A room
 * that holds everyone driven turns no one away, so temperament decides
 * nothing there and the probe sees none of it.
 */
function takePart<
  T extends {
    p: Readonly<Pick<PersonState, "id" | "traits">>;
    base: number;
    drive: number;
    lean: number;
  },
>(rows: readonly T[], room: number): readonly T[] {
  const chosen = rows.slice(0, room);
  const taken = new Set(chosen.map((row) => row.p.id));
  let flat: Set<string> | undefined;
  const takenFlat = () =>
    (flat ??= new Set(
      [...rows]
        .sort((a, b) => b.base - a.base || a.p.id.localeCompare(b.p.id))
        .slice(0, room)
        .map((row) => row.p.id),
    ));
  if (rows.length > room)
    for (const row of rows)
      reportOutcome(
        "meetings.take-part",
        row.p.id,
        row.lean,
        "probability",
        (withTerm) => ((withTerm ? taken : takenFlat()).has(row.p.id) ? 1 : 0),
      );
  return chosen;
}

export function openMeetings(core: CoreState): void {
  registerLegislatureHooks({
    beforeVote: { name: "public-comment", run: publicComment },
    positionTerm: roomTerm,
  });
  if (core.modules.has(MEETINGS_MODULE_ID)) return;
  registerModule(core, MEETINGS_MODULE);
  scheduleWeek(coreAPI(core), core.date);
}

function scheduleWeek(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), 7);
  api.moduleCalendar(MEETINGS_MODULE_ID).schedule({
    key: `debate-week:${date}`,
    date,
    kind: "debate-week",
    source: {
      tag: "ESTIMATED",
      citation: "Local outlets schedule the race's debates",
      asOf: api.state.date,
      estimatedFrom: "debateDaysBefore",
    },
    sourceRecordIds: [`debate-week:${lawChain(api).townPlaceId}`],
  });
}

function townAdults(api: CoreAPI): PersonState[] {
  const adultAge = api.parameter("votingAge");
  const date = api.state.date;
  return [...(api.state.peopleByPlace.get(lawChain(api).townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter(
      (p): p is PersonState =>
        p !== undefined && p.alive && ageOn(p, date) >= adultAge,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The question a bill speaks to and which way it points, from its first provision that has one. */
function billQuestion(
  api: CoreAPI,
  bill: BillRow,
): { question: string; position: number } | null {
  const level = local(bill) ? "city" : "state";
  for (const p of bill.provisions) {
    const stance = provisionStance(api, p, level);
    if (stance) return stance;
  }
  return null;
}

const local = (bill: BillRow) =>
  !bill.bodyOfficeId.includes(":legislature-") &&
  !bill.bodyOfficeId.includes(":us-");

/** The question a town or county bill speaks to, or nothing for a bill of a legislature (it has testimony, not public comment). */
export function localBillStance(
  api: CoreAPI,
  bill: BillRow,
): { question: string; position: number } | null {
  return local(bill) ? billQuestion(api, bill) : null;
}

/**
 * Sign up to speak on a bill before its vote: public comment at a town or
 * county meeting, testimony at a legislature's hearing. Recorded as said on
 * the day; every member hears it.
 */
export function signUpToSpeak(
  api: CoreAPI,
  input: {
    readonly billId: string;
    readonly personId: string;
    /** For (+1) or against (-1). */
    readonly position: number;
  },
): RemarkRow {
  const bill = billOf(api, input.billId);
  if (bill.status !== "drafted")
    throw new Error(`The vote on ${bill.number} has been held.`);
  const stance = billQuestion(api, bill);
  const row: RemarkRow = {
    id: `remark:${bill.id}:${input.personId}`,
    billId: bill.id,
    personId: input.personId,
    kind: local(bill) ? "public-comment" : "testimony",
    question: stance?.question ?? "",
    position: Math.sign(input.position),
    signedUp: true,
    date: api.state.date,
  };
  table(api, "remarks").put(row as unknown as ModuleRow);
  return row;
}

export function remarksOn(api: CoreAPI, billId: string): readonly RemarkRow[] {
  if (!api.state.modules.has(MEETINGS_MODULE_ID)) return [];
  return (
    table(api, "remarks").query("byBill", [billId]) as unknown as RemarkRow[]
  )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Whether a resident is only a counted record: never filled in, or filled in
 * once and returned to the counts, which keeps a retained full record on the
 * counted tier (`isDemoted`). Such a resident stands up at public comment by
 * the same rule as a named one, and is filled in before speaking.
 */
export function countedRecordOnly(core: CoreState, personId: string): boolean {
  const kept = core.people.get(personId);
  return !kept || isDemoted(kept);
}

/**
 * How hard a bill's question drives a resident to stand up at its public
 * comment: how strongly they feel it times their civic temperament.
 */
export function standUpDrive(
  api: CoreAPI,
  p: Readonly<Pick<PersonState, "id" | "traits">>,
  stance: { readonly question: string; readonly position: number },
): { view: number; base: number; drive: number; lean: number } {
  const view =
    viewOn(api, p.id, stance.question, personLean(api.state.people, p, 0)) *
    stance.position;
  const base = Math.abs(view);
  return { view, base, ...driveOf(base, p, api.state) };
}

/**
 * The residents who would stand up at a bill's public comment, most driven
 * first: how strongly they feel about its question, times their civic
 * temperament, the meeting's time (publicCommentSpeakers) decides how many speak.
 */
export function commentSpeakers(
  api: CoreAPI,
  bill: BillRow,
  stance: { readonly question: string; readonly position: number },
  /** Who has already had their say on the bill (the default: its remarks on record). */
  already: ReadonlySet<string> = new Set(
    remarksOn(api, bill.id).map((r) => r.personId),
  ),
): readonly {
  p: Readonly<Pick<PersonState, "id" | "traits">>;
  view: number;
  base: number;
  drive: number;
  lean: number;
}[] {
  // The body's own members vote on the bill; public comment is the public's.
  const adultAge = api.parameter("votingAge");
  const seated = new Set(
    members(api, bill.bodyOfficeId).flatMap((t) =>
      t.personId ? [t.personId] : [],
    ),
  );
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  // The town's adults still in the wider population stand up by the same
  // rule, read from their counted record (one model, two tiers).
  const counted = countedResidents(core).filter(
    (v) =>
      v.placeId === town &&
      countedRecordOnly(core, v.id) &&
      ageOn(v, api.state.date) >= adultAge,
  );
  return [...townAdults(api), ...counted]
    .filter(
      (p) => !already.has(p.id) && !seated.has(p.id) && p.id !== core.playerId,
    )
    .map((p) => ({ p, ...standUpDrive(api, p, stance) }))
    .filter((s) => s.view !== 0)
    .sort((a, b) => b.drive - a.drive || a.p.id.localeCompare(b.p.id));
}

/**
 * At a town or county meeting, before the vote: the residents who feel most
 * strongly about the bill's question, by their civic temperament, stand up
 * and say so; the room is a public record.
 */
function publicComment(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(MEETINGS_MODULE_ID)) return;
  const bill = billOf(api, billId);
  const stance = billQuestion(api, bill);
  if (!stance || !local(bill)) return;
  const core = api.state as CoreState;
  const speakers = takePart(
    commentSpeakers(api, bill, stance),
    meetingParameter("publicCommentSpeakers"),
  );
  for (const s of speakers) {
    // A speaker on the public record is a named person.
    if (countedRecordOnly(core, s.p.id)) fillInPerson(core, s.p.id);
    table(api, "remarks").put({
      id: `remark:${bill.id}:${s.p.id}`,
      billId: bill.id,
      personId: s.p.id,
      kind: "public-comment",
      question: stance.question,
      position: Math.sign(s.view),
      signedUp: false,
      date: api.state.date,
    } as unknown as ModuleRow);
  }
  const said = remarksOn(api, billId);
  if (!said.length) return;
  // Each comment is a speech to the room: the members and the others who
  // spoke hear it (the speech engine moves them and lets them retell it).
  if (api.state.modules.has(SPEECH_MODULE_ID)) {
    const room = [
      ...members(api, bill.bodyOfficeId).flatMap((t) =>
        t.personId ? [t.personId] : [],
      ),
      ...said.map((r) => r.personId),
    ].filter((id) => api.state.people.get(id)?.alive);
    // Everyone who spoke is heard: those who signed up (the player among
    // them) and those moved to stand up.
    for (const r of said)
      if (api.state.people.get(r.personId)?.alive)
        deliverSpeech(api, {
          id: `speech:remark:${bill.id}:${r.personId}`,
          speakerId: r.personId,
          placeId: lawChain(api).townPlaceId,
          topic: stance.question,
          desiredChange: r.position * stance.position > 0 ? "enact" : "repeal",
          audienceIds: [...new Set(room)]
            .filter((id) => id !== r.personId)
            .sort(),
        });
  }
  api.emit({
    id: `public-comment:${bill.id}`,
    date: api.state.date,
    kind: "public-comment",
    personIds: said
      .map((r) => r.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Public comment on ${bill.number}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: false,
    facts: {
      billId: bill.id,
      level: billReach(api, bill).level,
      for: String(said.filter((r) => r.position > 0).length),
      against: String(said.filter((r) => r.position < 0).length),
    },
  });
}

/**
 * What the room said, as one of a member's reasons: the balance of those for
 * and against, counting in full once enough have spoken.
 */
function roomTerm(api: CoreAPI, bill: BillRow): number {
  const said = remarksOn(api, bill.id);
  if (!said.length) return 0;
  const balance = said.reduce((sum, r) => sum + r.position, 0);
  return (
    (meetingParameter("commentWeight") * balance) /
    (said.length + meetingParameter("commentSaturation") - 1)
  );
}

/**
 * Which questions touch a person's own life: labor and taxes if they work,
 * schools and family with children at home, health from their fifties,
 * housing while young (most renters are under 35).
 */
export function concerns(api: CoreAPI, p: Readonly<PersonState>) {
  const adultAge = api.parameter("votingAge");
  const date = api.state.date;
  const working =
    ((api.state as CoreState).work.commitmentsByPerson.get(p.id)?.size ?? 0) >
    0;
  const children = [...p.familyIds].some((id) => {
    const kin = api.state.people.get(id);
    return (
      kin?.alive && ageOn(kin, date) < adultAge && kin.placeId === p.placeId
    );
  });
  return concernsOf({ age: ageOn(p, date), working, children });
}

/** The one rule for whether a question touches a life, full person or counted alike. */
function concernsOf(life: {
  readonly age: number;
  readonly working: boolean;
  readonly children: boolean;
}) {
  return (question: string) => {
    const topic = question.split(":")[1]?.split(".")[0] ?? "";
    if (topic.startsWith("labor-") || topic === "fiscal") return life.working;
    if (topic === "education" || topic === "civil-family-community")
      return life.children;
    if (topic === "health-human-services")
      return life.age >= meetingParameter("healthConcernAge");
    if (topic === "housing-land-use")
      return life.age < meetingParameter("housingConcernAgeBelow");
    return false;
  };
}

const concernShares = new WeakMap<
  CoreState,
  {
    key: string;
    lives: { touches: ReturnType<typeof concernsOf>; weight: number }[];
  }
>();

/**
 * The share of the town's adults whose own life a question touches, by the
 * same rule for every resident: the full people and each counted resident,
 * from their age, their work and the children in their household (one
 * model, two tiers).
 */
export function townConcernShare(api: CoreAPI, question: string): number {
  const adultAge = api.parameter("votingAge");
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const date = core.date;
  const rt = residentsRuntime(core);
  const key = `${date}|${core.people.size}|${rt?.store.membersVersion ?? 0}`;
  let hit = concernShares.get(core);
  if (!hit || hit.key !== key) {
    const lives: { touches: ReturnType<typeof concernsOf>; weight: number }[] =
      [];
    for (const p of core.people.values())
      if (
        p.alive &&
        p.placeId === town &&
        !isDemoted(p) &&
        ageOn(p, date) >= adultAge
      )
        lives.push({ touches: concerns(api, p), weight: 1 });
    if (rt) {
      const store = rt.store;
      for (const h of store.liveHouseholds()) {
        const members = store.countedMembers(h);
        const ageOf = (m: number) => ageOn({ birthDate: store.born[m]! }, date);
        const children = members.some((m) => ageOf(m) < adultAge);
        for (const m of members) {
          if (store.text(store.placeIx[m]!) !== town || ageOf(m) < adultAge)
            continue;
          const id = store.ids[m]!;
          const full = core.people.get(id);
          if (full && !isDemoted(full)) continue;
          const working = h.workCommitments.some(
            (c) =>
              c.personId === id && (c.endsAt === undefined || c.endsAt > date),
          );
          // A counted adult counts as many times as their household's weight.
          lives.push({
            touches: concernsOf({ age: ageOf(m), working, children }),
            weight: store.weightOf(h),
          });
        }
      }
    }
    hit = { key, lives };
    concernShares.set(core, hit);
  }
  if (!hit.lives.length) return 0;
  let touched = 0,
    all = 0;
  for (const life of hit.lives) {
    all += life.weight;
    if (life.touches(question)) touched += life.weight;
  }
  return touched / all;
}

/** A host's answers: their stated platform, else their own lean, else no answer. */
function ownView(
  api: CoreAPI,
  hostId: string,
  questions: readonly string[],
): readonly InterviewAnswer[] {
  const host = api.state.people.get(hostId);
  return questions.map((question) => {
    if (!host) return { question, position: null };
    const view = viewOn(
      api,
      host.id,
      question,
      personLean(api.state.people, host, 0),
    );
    return { question, position: view === 0 ? null : Math.sign(view) };
  });
}

/**
 * Who would fill a town hall's room, most driven first: each adult's
 * strongest question (among those their own life touches most) and how hard
 * it drives them, how strongly they feel it times their civic temperament.
 */
export function townHallDrives(
  api: CoreAPI,
  hostId: string,
): readonly {
  p: PersonState;
  question: string | undefined;
  base: number;
  drive: number;
  lean: number;
}[] {
  const questions = Object.keys(POLICY_QUESTIONS).filter(
    (q) => questionAxis(q) !== 0,
  );
  // The room fills from the town's full adults; its counted residents do
  // not come yet (public comment reads them, `commentSpeakers`).
  // stopgapId: SG-GOV-town-hall-room-full-people
  api.stopgap("SG-GOV-town-hall-room-full-people");
  return townAdults(api)
    .filter((p) => p.id !== hostId)
    .map((p) => {
      const lean = personLean(api.state.people, p, 0);
      const weight = concerns(api, p);
      const salience = (q: string) =>
        Math.abs(viewOn(api, p.id, q, lean)) *
        (1 + meetingParameter("lifeConcernWeight") * (weight(q) ? 1 : 0));
      const question = questions
        .slice()
        .sort((a, b) => salience(b) - salience(a) || a.localeCompare(b))[0];
      const base = question ? salience(question) : 0;
      return { p, question, base, ...driveOf(base, p, api.state) };
    })
    .filter((row) => row.drive > 0)
    .sort((a, b) => b.drive - a.drive || a.p.id.localeCompare(b.p.id));
}

/** A host's town hall on a day: one a day, by who held it and when. */
export function townHallId(hostId: string, date: string): string {
  return `town-hall:${hostId}:${date}`;
}

/**
 * Hold a town hall. The town's most civic-minded adults come; each asks about
 * the question they feel most strongly about, and the host takes the
 * commonest. The host answers (the player's own answers, or another host's
 * own views); a candidate's answers are promises those present heard, and
 * each attendee's view of the host moves with a recorded cause.
 */
export function holdTownHall(
  api: CoreAPI,
  input: {
    readonly hostId: string;
    /** The host's campaign, if they're running: answers become promises. */
    readonly filingId?: string;
    /** The player's answers, by question; questions left out are declined. */
    readonly answers?: Readonly<Record<string, number | null>>;
    readonly calledFor?: TownHallRow["calledFor"];
  },
): TownHallRow {
  const drives = takePart(
    townHallDrives(api, input.hostId),
    meetingParameter("townHallSize"),
  );
  const attendees = drives.map((row) => row.p);
  const asked = drives.flatMap((row) =>
    row.question ? [{ askedBy: row.p.id, question: row.question }] : [],
  );
  const counts = new Map<string, number>();
  for (const q of asked)
    counts.set(q.question, (counts.get(q.question) ?? 0) + 1);
  const taken = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, meetingParameter("questionsPerTownHall"))
    .map(([q]) => asked.find((a) => a.question === q)!);
  const answers: readonly InterviewAnswer[] = input.answers
    ? taken.map(({ question }) => {
        const p = input.answers![question];
        return {
          question,
          position:
            p === null || p === undefined ? null : Math.max(-1, Math.min(1, p)),
        };
      })
    : ownView(
        api,
        input.hostId,
        taken.map((t) => t.question),
      );
  const statements: Stance[] = answers.flatMap((a) =>
    a.position === null ? [] : [{ question: a.question, position: a.position }],
  );
  const id = townHallId(input.hostId, api.state.date);
  let causes: readonly CauseRow[] = [];
  if (input.filingId && api.state.modules.has(CAMPAIGNS_MODULE_ID))
    causes = makeStatements(api, {
      filingId: input.filingId,
      venue: id,
      statements,
      audienceIds: attendees.map((p) => p.id),
      act: "town-hall",
      weight: meetingParameter("townHallWeight"),
      faceToFace: true,
    });
  else if (api.state.modules.has(CAMPAIGNS_MODULE_ID))
    causes = attendees.flatMap((p) => {
      const cause = touchImpression(api, {
        voterId: p.id,
        officialId: input.hostId,
        act: "town-hall",
        target: agreementWith(
          api,
          p.id,
          personLean(api.state.people, p, 0),
          statements,
        ),
        weight: meetingParameter("townHallWeight"),
        rapport: 0,
      });
      return cause ? [cause] : [];
    });
  const row: TownHallRow = {
    id,
    hostId: input.hostId,
    filingId: input.filingId ?? null,
    date: api.state.date,
    attendeeIds: attendees.map((p) => p.id),
    questions: taken,
    answers,
    causeIds: causes.map((c) => c.id),
    moved: causes.filter((c) => c.warmthAfter !== c.warmthBefore).length,
    ...(input.calledFor ? { calledFor: input.calledFor } : {}),
  };
  table(api, "townHalls").put(row as unknown as ModuleRow);
  api.emit({
    id: `town-hall:${id}`,
    date: api.state.date,
    kind: "town-hall",
    personIds: [input.hostId, ...row.attendeeIds],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Town hall ${id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      townHallId: id,
      hostId: input.hostId,
      // A candidate's forum names the race it was held for.
      ...(input.filingId ? { filingId: input.filingId } : {}),
      attendees: String(row.attendeeIds.length),
      questions: taken.map((t) => t.question).join(","),
    },
  });
  return row;
}

/**
 * Each week every local official and town candidate (the player aside, who
 * holds one by choice) weighs holding a town hall: their reason is how evenly
 * the town splits on a bill before their body (pending, or decided in the
 * last two weeks), or their own race coming up; their temperament leans for
 * or against; the effort weighs against it, more the more recently they held
 * one. Nothing rolls: whoever's reasons outweigh the effort holds one.
 */
function considerTownHalls(api: CoreAPI): void {
  const date = api.state.date;
  const playerId = (api.state as CoreState).playerId;
  const reasons = new Map<
    string,
    {
      cause: number;
      kind: "bill" | "race";
      recordId: string;
      filingId?: string;
    }
  >();
  const raise = (
    id: string,
    cause: number,
    kind: "bill" | "race",
    recordId: string,
    filingId?: string,
  ) => {
    const prior = reasons.get(id);
    if (!prior || cause > prior.cause)
      reasons.set(id, {
        cause,
        kind,
        recordId,
        ...(filingId ? { filingId } : {}),
      });
  };
  // Bills before the town's bodies: how evenly the town splits on each.
  const adults = townAdults(api);
  const split = new Map<string, number>();
  const evenness = (question: string) => {
    let value = split.get(question);
    if (value === undefined) {
      const forIt = adults.filter(
        (p) =>
          viewOn(api, p.id, question, personLean(api.state.people, p, 0)) > 0,
      ).length;
      const share = adults.length ? forIt / adults.length : 0.5;
      split.set(question, (value = 1 - Math.abs(2 * share - 1)));
    }
    return value;
  };
  const since = addDays(
    makeIsoDate(date),
    -meetingParameter("townHallBillDays"),
  );
  if (api.state.modules.has(LEGISLATURE_MODULE_ID))
    for (const bill of (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    ).filter(
      (b) => local(b) && (b.status === "drafted" || b.introduced >= since),
    )) {
      const question = billQuestion(api, bill);
      if (!question) continue;
      for (const member of members(api, bill.bodyOfficeId))
        if (member.personId)
          raise(member.personId, evenness(question.question), "bill", bill.id);
    }
  // A race coming up: its candidates' reason.
  if (api.state.modules.has(ELECTIONS_MODULE_ID)) {
    const until = addDays(
      makeIsoDate(date),
      meetingParameter("townHallCampaignDays"),
    );
    for (const contest of (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter(
      (c) =>
        c.electionDate > date &&
        c.electionDate <= until &&
        c.level !== "state" &&
        c.level !== "federal",
    ))
      for (const f of ballot(api, contest.id))
        raise(f.personId, 1, "race", contest.id, f.id);
  }
  const town = lawChain(api).townPlaceId;
  for (const [hostId, why] of [...reasons.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const host = api.state.people.get(hostId);
    if (!host?.alive || host.placeId !== town || hostId === playerId) continue;
    const last = (
      table(api, "townHalls").query("byHost", [
        hostId,
      ]) as unknown as TownHallRow[]
    ).reduce((d, row) => (row.date > d ? row.date : d), "");
    const gap = meetingParameter("townHallGapDays");
    const recency = last
      ? gap /
        (gap +
          Math.max(
            0,
            (Date.parse(`${date}T00:00:00Z`) -
              Date.parse(`${last}T00:00:00Z`)) /
              86_400_000,
          ))
      : 0;
    const cause = meetingParameter("townHallCauseWeight") * why.cause;
    const effort = -meetingParameter("townHallEffort") * (1 + recency);
    const { yes, term } = leanedYesWithTerm(
      api.state,
      host,
      "meetings.hold-town-hall",
      "hold",
      "skip",
      cause + effort,
    );
    if (!yes) continue;
    const parts = { cause, temperament: term, effort };
    holdTownHall(api, {
      hostId,
      ...(why.filingId ? { filingId: why.filingId } : {}),
      calledFor: { cause: why.kind, recordId: why.recordId, reasons: parts },
    });
  }
}

function contestOf(api: CoreAPI, contestId: string): ContestRow {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
}

/** The moderator's questions: each candidate's own (their record, the widest gap, the most divisive), in turn. */
function debateQuestions(
  api: CoreAPI,
  filings: readonly FilingRow[],
): readonly string[] {
  const lists = filings.map((f) => interviewQuestions(api, f));
  const out: string[] = [];
  for (let i = 0; lists.some((l) => l[i] !== undefined); i += 1)
    for (const list of lists)
      if (list[i] && !out.includes(list[i]!)) out.push(list[i]!);
  return out.slice(0, meetingParameter("questionsPerDebate"));
}

/** Where the debate airs: the outlet with the widest audience in town. */
function debateOutlet(
  api: CoreAPI,
): { id: string; audience: readonly string[] } | null {
  const best = outletsHere(api)
    .map((o) => ({ id: o.id, audience: followersOf(api, o.id) }))
    .sort(
      (a, b) =>
        b.audience.length - a.audience.length || a.id.localeCompare(b.id),
    )[0];
  return best ?? null;
}

/**
 * Hold a race's debate: every candidate on the ballot answers each question
 * (the player with `answers`, the others from their own positions), and the
 * host outlet's audience hears them all.
 */
function holdDebate(
  api: CoreAPI,
  row: DebateRow,
  playerAnswers?: readonly InterviewAnswer[],
): DebateRow {
  // The ballot after the clerk's check: the names on it.
  const filings = ballot(api, row.contestId);
  const playerId = (api.state as CoreState).playerId;
  const outlet = row.outletId
    ? { id: row.outletId, audience: followersOf(api, row.outletId) }
    : null;
  const answers: Record<string, readonly InterviewAnswer[]> = {};
  let reached = new Set<string>();
  for (const f of filings) {
    const given =
      f.personId === playerId && playerAnswers
        ? row.questions.map((question) => {
            const a = playerAnswers.find((x) => x.question === question);
            return {
              question,
              position:
                a?.position === null || a?.position === undefined
                  ? null
                  : Math.max(-1, Math.min(1, a.position)),
            };
          })
        : candidateAnswers(api, row.questions, f);
    answers[f.personId] = given;
    if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) continue;
    const causes = makeStatements(api, {
      filingId: f.id,
      venue: row.id,
      statements: given.flatMap((a) =>
        a.position === null
          ? []
          : [{ question: a.question, position: a.position }],
      ),
      audienceIds: (outlet?.audience ?? []).filter((id) => id !== f.personId),
      act: "debate",
      weight: meetingParameter("debateWeight"),
      faceToFace: false,
    });
    reached = new Set([...reached, ...causes.map((c) => c.voterId)]);
  }
  const held: DebateRow = {
    ...row,
    date: api.state.date,
    status: "held",
    answers,
    audience: reached.size,
  };
  table(api, "debates").put(held as unknown as ModuleRow);
  const contest = contestOf(api, row.contestId);
  api.emit({
    id: `debate:${row.id}`,
    date: api.state.date,
    kind: "debate",
    personIds: filings
      .map((f) => f.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Debate ${row.id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      debateId: row.id,
      contestId: contest.id,
      outletId: row.outletId ?? "",
      candidates: String(filings.length),
    },
  });
  return held;
}

/** The player's answers to a debate waiting on them; the debate is held. */
export function answerDebate(
  api: CoreAPI,
  debateId: string,
  answers: readonly InterviewAnswer[],
): DebateRow {
  const row = table(api, "debates").get(debateId) as unknown as
    DebateRow | undefined;
  if (!row || row.status !== "invited")
    throw new Error(`No debate waiting: ${debateId}`);
  return holdDebate(api, row, answers);
}

/** The kind of an outlet's invitation to a candidate to its race's debate. */
export const DEBATE_INVITED_EVENT = "debate-invited";

/**
 * A debate's invitation, on the record for the candidate it waits on and the
 * host outlet's reporter who brings it, the one closest to them (a reporter
 * who is in the race never hosts it). The director stages it as a call; the
 * answer there is read back here (`answerDebateInvitation`).
 */
function debateInvited(
  api: CoreAPI,
  row: DebateRow,
  contest: ContestRow,
  candidateId: string,
): void {
  const rivals = new Set(ballot(api, contest.id).map((f) => f.personId));
  const outlet = outletsHere(api).find((o) => o.id === row.outletId);
  const host = (outlet?.reporterIds ?? [])
    .filter((id) => api.state.people.get(id)?.alive && !rivals.has(id))
    .map((id) => ({
      id,
      tie: closenessBetween(api.state, id as PersonId, candidateId as PersonId),
    }))
    .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))[0]?.id;
  api.emit({
    id: `${DEBATE_INVITED_EVENT}:${row.id}`,
    date: api.state.date,
    kind: DEBATE_INVITED_EVENT,
    personIds: host ? [candidateId, host] : [candidateId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Debate ${row.id}`,
      asOf: api.state.date,
    },
    facts: {
      debateId: row.id,
      contestId: contest.id,
      invitedId: candidateId,
      office: contest.title,
      ...(outlet ? { outletId: outlet.organizationId } : {}),
      ...(host ? { reporterId: host } : {}),
      candidates: String(rivals.size),
    },
  });
}

/**
 * The answer to a debate's invitation, said in its scene: a yes takes the
 * stage with the candidate's filed platform as their answers; a no lets the
 * debate go on without them (every question left unanswered); anything else
 * leaves it waiting.
 */
function answerDebateInvitation(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== DEBATE_INVITED_EVENT) return;
  const row = table(api, "debates").get(
    String(cause.facts?.debateId ?? ""),
  ) as unknown as DebateRow | undefined;
  const candidateId = String(cause.facts?.invitedId ?? "");
  if (row?.status !== "invited" || !event.personIds.includes(candidateId))
    return;
  const move = String(facts.move);
  if (ACCEPTING_MOVES.has(move)) {
    const filing = ballot(api, row.contestId).find(
      (f) => f.personId === candidateId,
    );
    holdDebate(
      api,
      row,
      platformAnswers(api, filing?.id ?? null, row.questions),
    );
  } else if (REFUSING_MOVES.has(move)) holdDebate(api, row, []);
}

export function debatesIn(
  api: CoreAPI,
  contestId: string,
): readonly DebateRow[] {
  if (!api.state.modules.has(MEETINGS_MODULE_ID)) return [];
  return table(api, "debates").query("byContest", [
    contestId,
  ]) as unknown as DebateRow[];
}

/**
 * Each week, races with a general election about two weeks out and two or
 * more candidates on the ballot get their debate on the town's
 * widest-reaching outlet; a race the player runs in waits for their answers.
 */
function debateWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "debate-week") return;
  scheduleWeek(api, api.state.date);
  considerTownHalls(api);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const from = addDays(
    makeIsoDate(api.state.date),
    meetingParameter("debateDaysBefore") - 6,
  );
  const to = addDays(
    makeIsoDate(api.state.date),
    meetingParameter("debateDaysBefore"),
  );
  const playerId = (api.state as CoreState).playerId;
  const outlet = debateOutlet(api);
  for (const contest of (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => c.electionDate >= from && c.electionDate <= to)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    if (debatesIn(api, contest.id).length) continue;
    const filings = ballot(api, contest.id);
    if (filings.length < 2) continue;
    const row: DebateRow = {
      id: `debate:${contest.id}`,
      contestId: contest.id,
      outletId: outlet?.id ?? null,
      date: api.state.date,
      status: "invited",
      questions: debateQuestions(api, filings),
      answers: {},
      audience: 0,
    };
    table(api, "debates").put(row as unknown as ModuleRow);
    const own = filings.find((f) => f.personId === playerId);
    if (!own) holdDebate(api, row);
    else debateInvited(api, row, contest, own.personId);
  }
}
