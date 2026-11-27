import { campaignFor, makeStatements } from "./campaigns";
import { slantOf, archiveItem } from "../press-desk";
import { type Story } from "./news";
import type {
  CoreAPI,
  CoreEventInput,
  CoreState,
  InterviewAnswer,
  InterviewMove,
  InterviewRow,
  ModuleCalendarWork,
  ModuleRow,
  OutletRow,
  PrintedStory,
  Stance,
} from "./press-base";
import {
  INTERVIEW_ACCEPTED_EVENT,
  addDays,
  closeness,
  decisionLean,
  followersOf,
  grudge,
  lawChain,
  makeIsoDate,
  pressParameter,
  printItem,
  record,
  reporterFor,
  table,
  touchImpression,
  townOutlet,
  votesCast,
  wireItem,
} from "./press-base";
import { deskContext } from "./press-desk-reads";
import { PRESS_MODULE_ID } from "./press-ids";

const MOVE_WEIGHT: Readonly<Record<InterviewMove, string>> = {
  plain: "moveWeightPlain",
  further: "moveWeightFurther",
  turn: "moveWeightTurn",
  brief: "moveWeightBrief",
  lie: "moveWeightPlain",
};

export function publish(
  api: CoreAPI,
  row: InterviewRow,
  answers: readonly InterviewAnswer[],
): InterviewRow {
  const statements: Stance[] = answers.flatMap((a) =>
    a.position === null ? [] : [{ question: a.question, position: a.position }],
  );
  if (row.filingId) campaignFor(api, row.filingId);
  const outlet = table(api, "outlets").get(
    row.outletId,
  ) as unknown as OutletRow;
  const audience = followersOf(api, row.outletId).filter(
    (id) => id !== row.candidateId,
  );
  const reporterId =
    row.reporterId ?? reporterFor(api, outlet, row.candidateId, row.contestId);
  // The interview is time together: a reporter and a candidate who never
  // met now have, and those who had grow closer.
  if (reporterId && api.state.people.has(row.candidateId)) {
    const hours = pressParameter("interviewHours");
    if (
      !api.meet(reporterId, row.candidateId, {
        placeId: lawChain(api).townPlaceId,
        sourceId: row.id,
        cause: "interview",
        hours,
      })
    )
      api.relationship(
        reporterId,
        row.candidateId,
        "contact",
        hours,
        undefined,
        {
          cause: "interview",
          sourceId: row.id,
        },
      );
  }
  // How it reads in print: the outlet's line, the reporter's and publisher's
  // ties to the candidate and the candidate's ad money at the outlet.
  const said = statements[0];
  const printed = said
    ? slantOf(api, deskContext(api), outlet, reporterId ?? "", {
        topic: said.question,
        desiredChange: said.position > 0 ? "enact" : "repeal",
        subjectIds: [row.candidateId],
      })
    : null;
  const moves = answers.filter((a) => a.position !== null);
  const carry = moves.length
    ? moves.reduce(
        (s, a) => s + pressParameter(MOVE_WEIGHT[a.move ?? "plain"]),
        0,
      ) / moves.length
    : 0;
  // A friendly print carries the candidate's words further, a hostile one
  // less far.
  const weight =
    pressParameter("interviewWeight") *
    carry *
    Math.max(0, 1 + (printed?.slant ?? 0));
  // A candidate's words reach the race's voters as campaign statements;
  // an officeholder's between races reach readers through the story alone.
  const causes = row.filingId
    ? makeStatements(api, {
        filingId: row.filingId,
        venue: row.outletId,
        statements,
        audienceIds: audience,
        act: "interview",
        weight,
        faceToFace: false,
      })
    : [];
  let storyId: string | null = null;
  let reached = causes.length;
  if (said && reporterId && api.state.people.has(reporterId)) {
    const story = printItem(
      api,
      deskContext(api),
      outlet,
      reporterId,
      {
        id: row.id,
        kind: "interview",
        date: api.state.date,
        level: "town",
        topic: said.question,
        desiredChange: said.position > 0 ? "enact" : "repeal",
        ending: false,
        subjectIds: api.state.people.has(row.candidateId)
          ? [row.candidateId]
          : [],
      },
      null,
      {
        interviewId: row.id,
        ...(printed ? { slant: printed } : {}),
        facts: { [`interview:${row.id}:candidate`]: row.candidateId },
      },
    );
    storyId = story.id;
    if (!row.filingId) reached = story.receivedNamed;
  }
  const done: InterviewRow = {
    ...row,
    status: "published",
    answers,
    audience: reached,
    reporterId,
    storyId,
  };
  record(api, done);
  // A position the candidate's own votes contradict: the reporter may check
  // the record and print what they find, weeks later.
  answers.forEach((answer, index) => {
    if (
      answer.position === null ||
      !answer.recordId ||
      !reporterId ||
      answer.move !== "lie"
    )
      return;
    const date = addDays(
      makeIsoDate(api.state.date),
      pressParameter("digDelayDays"),
    );
    api.moduleCalendar(PRESS_MODULE_ID).schedule({
      key: `press-dig:${row.id}:${index}`,
      date,
      kind: "press-dig",
      source: {
        tag: "ESTIMATED",
        citation: "A reporter checks a candidate's claim against the record",
        asOf: api.state.date,
        estimatedFrom: "digDelayDays",
      },
      sourceRecordIds: [row.id, String(index)],
    });
  });
  api.emit({
    id: `interview-published:${row.id}`,
    date: api.state.date,
    kind: "interview-published",
    personIds: api.state.people.has(row.candidateId) ? [row.candidateId] : [],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Interview ${row.id}`,
      asOf: api.state.date,
    },
    facts: {
      interviewId: row.id,
      outletId: row.outletId,
      candidateId: row.candidateId,
      ...(row.contestId ? { contestId: row.contestId } : {}),
      answered: String(statements.length),
      declined: String(answers.length - statements.length),
      // That the candidate sat for it: the sitting is the interview's scene,
      // so the director stages no second one after it.
      ...(api.state.durableLog.has(`${INTERVIEW_ACCEPTED_EVENT}:${row.id}`)
        ? { sat: "yes" }
        : {}),
      ...(storyId ? { storyId } : {}),
    },
  });
  return done;
}

/**
 * A reporter checks a candidate's claim against their votes, on the day set
 * when the interview ran. Whether they dig is theirs: their own lean toward
 * digging over letting it go (every trait), their grudge against the
 * candidate, and their closeness to them, which holds them back. When they
 * dig, the outlet prints the record against the claim, and its readers think
 * less of the candidate.
 */
export function checkClaim(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  const [interviewId, index] = work.sourceRecordIds;
  const row = table(api, "interviews").get(interviewId!) as unknown as
    InterviewRow | undefined;
  const answer = row?.answers[Number(index)];
  const reporter = row?.reporterId
    ? api.state.people.get(row.reporterId)
    : undefined;
  if (!row || !answer?.recordId || !reporter?.alive) return;
  const outlet = table(api, "outlets").get(row.outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) return;
  const lean =
    decisionLean(api.state, reporter, "press.dig", "dig", "let-go") +
    grudge(api, reporter.id, row.candidateId) -
    closeness(api, reporter.id, row.candidateId);
  const dug = lean > 0;
  table(api, "digs").put({
    id: `${interviewId}:${index}`,
    interviewId,
    question: answer.question,
    recordId: answer.recordId,
    reporterId: reporter.id,
    lean,
    dug,
    date: api.state.date,
  } as unknown as ModuleRow);
  if (!dug) return;
  const vote = votesCast(api.state as CoreState, row.candidateId).find(
    (v) => v.id === answer.recordId,
  );
  const ctx = deskContext(api);
  const story = printItem(
    api,
    ctx,
    outlet,
    reporter.id,
    {
      id: `claim:${interviewId}:${index}`,
      kind: "claim-checked",
      date: api.state.date,
      level: "town",
      topic: answer.question,
      desiredChange: (vote?.stance.position ?? 0) > 0 ? "enact" : "repeal",
      ending: false,
      subjectIds: api.state.people.has(row.candidateId)
        ? [row.candidateId]
        : [],
    },
    null,
    {
      interviewId: row.id,
      slant: {
        slant: -Math.min(1, lean),
        reasons: {
          lean: 0,
          tie: -Math.min(1, lean),
          publisher: 0,
          advertiser: 0,
        },
      },
      facts: {
        [`claim:${interviewId}:${index}:record`]: answer.recordId,
      },
    },
  );
  // Its readers think less of a candidate whose record belies their word.
  for (const id of ctx.followers(outlet.id))
    if (id !== row.candidateId)
      touchImpression(api, {
        voterId: id,
        officialId: row.candidateId,
        act: "interview",
        target: -1,
        weight: pressParameter("contradictionWeight") * Math.min(1, lean),
        rapport: 0,
      });
  table(api, "digs").put({
    ...(table(api, "digs").get(`${interviewId}:${index}`) as object),
    storyId: story.id,
  } as unknown as ModuleRow);
}

/**
 * Each week in the run-up to a general election, every outlet asks the
 * candidates on the ballot it hasn't interviewed, most newsworthy first, as
 * far as its reporter has room. The player's invitations wait for an answer;
 * another candidate accepts unless shy and averse to conflict and risk, and
 * answers from their own positions.
 */
/**
 * The press writes a story about a record from before day one for the news
 * archive: the record becomes a wire item by the same rule as a live public
 * record, and the town's paper slants and frames it. Null where no press is
 * installed, or the record is outside the town's coverage.
 */
export function writeArchiveStory(
  api: CoreAPI,
  record: Readonly<CoreEventInput>,
): Story | null {
  const outlet = townOutlet(api);
  if (!outlet) return null;
  const chain = lawChain(api);
  const item = wireItem(api, record, {
    placeId: chain.townPlaceId,
    stateKey: chain.stateKey,
  });
  if (!item) return null;
  const reporterId =
    (outlet.reporterIds ?? []).find((id) => api.state.people.get(id)?.alive) ??
    null;
  const written = archiveItem(api, deskContext(api), outlet, reporterId, item, {
    recordId: record.id,
    ...(record.facts ?? {}),
  });
  if (written.printed)
    table(api, "archive").put(written.printed as unknown as ModuleRow);
  return written.story;
}

/** One printed story by its id (what a reader remembers it by), or undefined. */
export function printedStoryOf(
  api: CoreAPI,
  storyId: string,
): PrintedStory | undefined {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return undefined;
  return table(api, "stories").get(storyId) as unknown as
    PrintedStory | undefined;
}

/** The stories an outlet printed, newest first. */
export function storiesPrinted(
  api: CoreAPI,
  outletId: string,
): readonly PrintedStory[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return (
    table(api, "stories").query("byOutlet", [
      outletId,
    ]) as unknown as PrintedStory[]
  )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
