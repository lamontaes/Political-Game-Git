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
import { coreAPI, registerModule } from "../state";
import { addDays, makeIsoDate } from "../kernel/dates";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { lawChain } from "./laws";
import { residentsRuntime } from "./residents";
import { isDemoted } from "../counted-groups";
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
  candidateAnswers,
  followersOf,
  interviewQuestions,
  outletsHere,
  type InterviewAnswer,
} from "./press";
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
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(MEETINGS_MODULE_ID).table(name);
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);
/**
 * Every trait's lean toward taking part in a public meeting over staying
 * away, on the trait scale the meeting bars were set on.
 */
const civic = (p: Readonly<PersonState>, core: Pick<CoreState, "data">) =>
  parameter("traitScale") *
  decisionLean(core, p, "meetings.take-part", "take-part", "stay-away");

export function openMeetings(core: CoreState): void {
  registerLegislatureHooks({
    beforeVote: publicComment,
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
  const date = api.state.date;
  return [...(api.state.peopleByPlace.get(lawChain(api).townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter(
      (p): p is PersonState =>
        p !== undefined && p.alive && ageOn(p, date) >= 18,
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
 * At a town or county meeting, before the vote: the residents who feel most
 * strongly about the bill's question, by their civic temperament, stand up
 * and say so; the room is a public record.
 */
function publicComment(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(MEETINGS_MODULE_ID)) return;
  const bill = billOf(api, billId);
  const stance = billQuestion(api, bill);
  if (!stance || !local(bill)) return;
  const already = new Set(remarksOn(api, billId).map((r) => r.personId));
  // The body's own members vote on the bill; public comment is the public's.
  const seated = new Set(
    members(api, bill.bodyOfficeId).flatMap((t) =>
      t.personId ? [t.personId] : [],
    ),
  );
  const speakers = townAdults(api)
    .filter(
      (p) =>
        !already.has(p.id) &&
        !seated.has(p.id) &&
        p.id !== (api.state as CoreState).playerId,
    )
    .map((p) => {
      const view =
        viewOn(api, p.id, stance.question, personLean(api.state.people, p, 0)) *
        stance.position;
      return { p, view, drive: Math.abs(view) * (1 + civic(p, api.state)) };
    })
    .filter((s) => s.view !== 0 && s.drive >= meetingParameter("commentBar"))
    .sort((a, b) => b.drive - a.drive || a.p.id.localeCompare(b.p.id))
    .slice(0, meetingParameter("publicCommentSpeakers"));
  for (const s of speakers)
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
          occasion: "meeting",
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
  const date = api.state.date;
  const working =
    ((api.state as CoreState).work.commitmentsByPerson.get(p.id)?.size ?? 0) >
    0;
  const children = [...p.familyIds].some((id) => {
    const kin = api.state.people.get(id);
    return kin?.alive && ageOn(kin, date) < 18 && kin.placeId === p.placeId;
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
        ageOn(p, date) >= 18
      )
        lives.push({ touches: concerns(api, p), weight: 1 });
    if (rt) {
      const store = rt.store;
      for (const h of store.liveHouseholds()) {
        const members = store.countedMembers(h);
        const ageOf = (m: number) => ageOn({ birthDate: store.born[m]! }, date);
        const children = members.some((m) => ageOf(m) < 18);
        for (const m of members) {
          if (store.text(store.placeIx[m]!) !== town || ageOf(m) < 18) continue;
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
  const questions = Object.keys(POLICY_QUESTIONS).filter(
    (q) => questionAxis(q) !== 0,
  );
  const attendees = townAdults(api)
    .filter(
      (p) =>
        p.id !== input.hostId &&
        civic(p, api.state) >= meetingParameter("townHallBar"),
    )
    .sort(
      (a, b) =>
        civic(b, api.state) - civic(a, api.state) || a.id.localeCompare(b.id),
    )
    .slice(0, meetingParameter("townHallSize"));
  // Each asks about what they feel most strongly about, among the questions
  // their own life touches most.
  const asked = attendees
    .map((p) => {
      const lean = personLean(api.state.people, p, 0);
      const weight = concerns(api, p);
      const salience = (q: string) =>
        Math.abs(viewOn(api, p.id, q, lean)) *
        (1 + meetingParameter("lifeConcernWeight") * (weight(q) ? 1 : 0));
      const question = questions
        .slice()
        .sort((a, b) => salience(b) - salience(a) || a.localeCompare(b))[0];
      return question ? { askedBy: p.id, question } : null;
    })
    .filter((q): q is { askedBy: string; question: string } => q !== null);
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
  const id = `town-hall:${input.hostId}:${api.state.date}`;
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
        if (f.status === "on-ballot")
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
    const parts = {
      cause: meetingParameter("townHallCauseWeight") * why.cause,
      temperament:
        parameter("traitDecisionWeight") *
        decisionLean(
          api.state,
          host,
          "meetings.hold-town-hall",
          "hold",
          "skip",
        ),
      effort: -meetingParameter("townHallEffort") * (1 + recency),
    };
    if (parts.cause + parts.temperament + parts.effort <= 0) continue;
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
  const filings = ballot(api, row.contestId).filter(
    (f) => f.status === "on-ballot",
  );
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
    const filings = ballot(api, contest.id).filter(
      (f) => f.status === "on-ballot",
    );
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
    if (!filings.some((f) => f.personId === playerId)) holdDebate(api, row);
  }
}
