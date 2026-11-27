import { CORRUPTION_MODULE_ID } from "./laws";
import { type CrimeRecord, wantedFacts } from "../laws-in-force";
import {
  CONTRACTS_MODULE_ID,
  type ContractAwardRow,
  OWNER_RELATION,
} from "../budgets-treasury";
import { awardsOn } from "./budgets";
import { familyRelation } from "./people";
import { crimeRecord } from "./justice";
import type {
  CoreAPI,
  CoreEventInput,
  DeskContext,
  ModuleCalendarWork,
  ModuleRow,
  OutletRow,
  PersonId,
  WireItem,
} from "./press-base";
import {
  addDays,
  closeness,
  decisionLean,
  grudge,
  lawChain,
  leanedScore,
  makeIsoDate,
  outletsHere,
  pressParameter,
  printItem,
  regard,
  table,
  touchImpression,
  wireItem,
} from "./press-base";
import { PRESS_MODULE_ID } from "./press-ids";
import { deskContext } from "./press-desk-reads";
import { storiesPrinted } from "./press-stories";

/** A story a paper ran on an official's hidden act: a bribe taken, or a vote for a firm they or their family own. */
export const PRESS_EXPOSED = "press.exposed";

/**
 * A hidden act surfaces (capability gap U2). Each person who now knows of it
 * (the one told, and the one who told) may take it to a reporter they know,
 * the closest: whether they do reads their own lean toward tipping off over
 * keeping quiet, their closeness to the reporter, and their regard for the
 * official, which holds them back. The reporter decides whether to dig (their
 * lean toward digging, a grudge against the official, closeness holding them
 * back, and the paper trail the act left); the outlet's owner and head decide
 * whether it runs (the reporter's case against their regard for the
 * official). A run is a public record naming the act: its readers learn it
 * and think less of the official, and every other outlet sees it on the wire.
 */
export function tipOff(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const key = Object.keys(event.facts ?? {}).find((k) =>
    k.startsWith("crime:"),
  );
  if (!key || !api.state.modules.has(CORRUPTION_MODULE_ID)) return;
  const crimeId = key.slice("crime:".length);
  const crime = api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("crimes")
    .get(crimeId) as unknown as CrimeRecord | undefined;
  if (!crime?.taken || table(api, "tips").get(crimeId)) return;
  const officialId = crime.officialId;
  const staff = reportersHere(api);
  for (const knowerId of [...event.personIds, ...(event.witnessIds ?? [])]) {
    const knower = api.state.people.get(knowerId);
    if (!knower?.alive || knowerId === officialId) continue;
    const reporterId = [...staff.keys()]
      .filter((id) => id === knowerId || knower.knownIds.has(id))
      .sort(
        (a, b) =>
          closeness(api, knowerId, b) - closeness(api, knowerId, a) ||
          a.localeCompare(b),
      )[0];
    if (!reporterId) continue;
    const row = weighTip(api, {
      act: bribeAct(crimeId),
      officialId,
      knowerId,
      reporterId,
      staff,
      leak: false,
    });
    if (row?.exposedId) return;
  }
}

/** The town's outlets' reporters, each with the outlet they file for. */
function reportersHere(api: CoreAPI): Map<string, OutletRow> {
  const staff = new Map<string, OutletRow>();
  for (const outlet of outletsHere(api))
    for (const id of outlet.reporterIds ?? []) staff.set(id, outlet);
  return staff;
}

/**
 * An act the press can expose, named on the tip, the exposure and the story:
 * the id the tip is kept under, the fact that names the act and says what it
 * was, any more facts the exposure carries, the citation, and the fields that
 * name the act on the tip's row.
 */
interface ExposableAct {
  readonly id: string;
  readonly fact: readonly [key: string, word: string];
  readonly facts?: Readonly<Record<string, string>>;
  readonly citation: string;
  readonly row: Readonly<Record<string, unknown>>;
}

/** A bribe an official took: the crime record on the cash journal. */
const bribeAct = (crimeId: string): ExposableAct => ({
  id: crimeId,
  fact: [`crime:${crimeId}`, "bribe-taken"],
  citation: `A reporter's story on recorded bribe ${crimeId}`,
  row: { crimeId },
});

/**
 * One person's tip of a hidden act to a reporter, weighed in order: whether
 * the one who knows takes it (their lean toward tipping off over keeping
 * quiet, their closeness to the reporter, their regard for the official; a
 * leak is a tip the person chose to make), whether the reporter digs, and
 * whether the outlet's owner and head let it run. A run is a public record
 * and a story its readers take in. Returns the tip's row, or null when the
 * reporter is no longer there.
 */
function weighTip(
  api: CoreAPI,
  input: {
    readonly act: ExposableAct;
    readonly officialId: string;
    readonly knowerId: string;
    readonly reporterId: string;
    readonly staff: ReadonlyMap<string, OutletRow>;
    readonly leak: boolean;
  },
): Record<string, unknown> | null {
  const { act, officialId, knowerId, reporterId, staff } = input;
  const knower = api.state.people.get(knowerId);
  const reporter = api.state.people.get(reporterId);
  const outlet = staff.get(reporterId);
  if (!knower?.alive || !reporter?.alive || !outlet) return null;
  const p = pressParameter;
  const tip =
    reporterId === knowerId || input.leak
      ? 1
      : // Taking it to the nearest reporter, weighed against how they regard
        // the official, with the knower's temperament at its calibrated weight.
        leanedScore(
          api.state,
          knower,
          "press.tip",
          "tip",
          "keep",
          closeness(api, knowerId, reporterId) -
            regard(api, p, knowerId, officialId),
        );
  const row: Record<string, unknown> = {
    id: act.id,
    ...act.row,
    knowerId,
    reporterId,
    officialId,
    date: api.state.date,
    tip,
    dig: null,
    run: null,
    storyId: null,
    ...(input.leak ? { leaked: true } : {}),
  };
  if (tip <= 0) {
    table(api, "tips").put(row as unknown as ModuleRow);
    return row;
  }
  // The paper trail: the payment is on the cash journal, the award on the
  // government's books.
  const dig =
    decisionLean(api.state, reporter, "press.dig", "dig", "let-go") +
    grudge(api, reporterId, officialId) -
    closeness(api, reporterId, officialId) +
    p("tipDocumentsWeight");
  row.dig = dig;
  const run =
    dig -
    p("slantOwnerWeight") *
      (outlet.ownerId ? regard(api, p, outlet.ownerId, officialId) : 0) -
    p("slantPublisherWeight") *
      (outlet.headId ? regard(api, p, outlet.headId, officialId) : 0);
  row.run = dig > 0 ? run : null;
  if (dig > 0 && run > 0) {
    const exposedId = `press.exposed:${act.id}:${outlet.id}`;
    // A reporter asks the one exposed for comment before the story runs: it
    // runs in the outlet's next edition (`exposureCommentDays`, runExposure).
    const runsOn = addDays(
      makeIsoDate(api.state.date),
      p("exposureCommentDays"),
    );
    api.emit({
      id: exposedId,
      date: api.state.date,
      kind: PRESS_EXPOSED,
      personIds: api.state.people.has(officialId) ? [officialId] : [],
      placeId: outlet.placeId,
      publicRecord: true,
      news: true,
      topic: `conduct:${officialId}`,
      facts: {
        [act.fact[0]]: act.fact[1],
        ...act.facts,
        outletId: outlet.id,
        runsOn,
      },
      source: {
        tag: "SOURCED",
        citation: act.citation,
        asOf: api.state.date,
      },
    });
    row.exposedId = exposedId;
    row.outletId = outlet.id;
    row.runsOn = runsOn;
    row.fact = [...act.fact];
    api.moduleCalendar(PRESS_MODULE_ID).schedule({
      key: `press-run:${exposedId}`,
      date: runsOn,
      kind: "press-run",
      source: {
        tag: "ESTIMATED",
        citation:
          "An exposure runs in the outlet's next edition, after the one exposed is asked for comment",
        asOf: api.state.date,
        estimatedFrom: "exposureCommentDays",
      },
      sourceRecordIds: [String(row.id)],
    });
  }
  table(api, "tips").put(row as unknown as ModuleRow);
  return row;
}

/**
 * An exposure runs on its day (weighTip set it): the outlet prints the story,
 * puts it on the wire for the other outlets, and the one exposed's standing
 * with the outlet's followers falls as the story is read.
 */
export function runExposure(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  const row = table(api, "tips").get(work.sourceRecordIds[0]!) as unknown as
    Record<string, unknown> | undefined;
  if (!row?.exposedId || row.storyId) return;
  const exposedId = String(row.exposedId);
  const officialId = String(row.officialId);
  const reporterId = String(row.reporterId);
  const outlet = outletsHere(api).find((o) => o.id === row.outletId);
  if (!outlet || !api.state.people.get(reporterId as PersonId)?.alive) return;
  const run = Number(row.run);
  const [factKey, factWord] = row.fact as [string, string];
  const ctx = deskContext(api);
  const story = printItem(
    api,
    ctx,
    outlet,
    reporterId,
    {
      id: exposedId,
      kind: PRESS_EXPOSED,
      date: api.state.date,
      level: "town",
      topic: `conduct:${officialId}`,
      desiredChange: "remove",
      ending: false,
      subjectIds: api.state.people.has(officialId) ? [officialId] : [],
    },
    null,
    {
      slant: {
        slant: -Math.min(1, run),
        reasons: { lean: 0, tie: 0, publisher: 0, advertiser: 0 },
      },
      facts: { [factKey]: factWord },
    },
  );
  table(api, "tips").put({
    ...row,
    storyId: story.id,
  } as unknown as ModuleRow);
  // In print, it is on the wire for the other outlets to carry.
  const exposure = api.state.durableLog.get(exposedId);
  if (exposure) {
    const chain = lawChain(api);
    const item = wireItem(api, exposure, {
      placeId: chain.townPlaceId,
      stateKey: chain.stateKey,
    });
    if (item) table(api, "wire").put(item as unknown as ModuleRow);
  }
  for (const id of ctx.followers(outlet.id))
    if (id !== officialId)
      touchImpression(api, {
        voterId: id,
        officialId,
        act: "interview",
        target: -1,
        weight: pressParameter("exposureWeight") * Math.min(1, run),
        rapport: 0,
      });
}

/**
 * The week's conflicts of interest reach the desk. An award a government
 * made in the last week whose record names a member who chose a firm they
 * own, or a relative or housemate owns (contracts.ts `conflicts`), is public
 * business the local reporters can read: the award on the government's books
 * is the paper trail. Each reporter of the town's local outlets, in outlet and
 * id order, weighs it as they weigh a tip they came to themself (nobody to
 * take it to): whether to dig, then whether the outlet's owner and head let
 * it run. The first to run it prints it and the others see it on the wire. A
 * reporter never covers themself, the firm's owner or either one's relatives.
 * Every conflict the desk weighs keeps a tip row under its award and member;
 * nothing rolls.
 */
export function conflictBeat(api: CoreAPI): void {
  if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return;
  // stopgapId: SG-PEOPLE-press-conflict-beat
  const local = outletsHere(api).filter((o) => o.tier !== "national");
  const staff = new Map<string, OutletRow>();
  for (const outlet of local)
    for (const id of outlet.reporterIds ?? []) staff.set(id, outlet);
  if (!staff.size) return;
  // Awards made since the desk last sat (it sits weekly; a conflict already
  // weighed keeps its tip row and is not weighed again).
  const awards = new Map<string, ContractAwardRow>();
  for (let back = 0; back <= api.parameter("daysPerWeek"); back += 1)
    for (const award of awardsOn(
      api,
      addDays(makeIsoDate(api.state.date), -back),
    ))
      if (award.conflicts.length) awards.set(award.id, award);
  for (const award of [...awards.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  ))
    for (const conflict of award.conflicts) {
      const act = conflictAct(award, conflict);
      if (
        !api.state.people.has(conflict.memberId) ||
        table(api, "tips").get(act.id)
      )
        continue;
      const reporters = local
        .flatMap((o) => [...(o.reporterIds ?? [])].sort())
        .filter(
          (id) =>
            ![conflict.memberId, conflict.ownerId].some(
              (party) =>
                id === party || familyRelation(api.state, id, party) !== null,
            ),
        );
      for (const reporterId of reporters) {
        api.stopgap("SG-PEOPLE-press-conflict-beat");
        const row = weighTip(api, {
          act,
          officialId: conflict.memberId,
          knowerId: reporterId,
          reporterId,
          staff,
          leak: false,
        });
        if (row?.exposedId) break;
      }
    }
}

/** A member's vote for a firm their family owns, as an act the press can expose. */
function conflictAct(
  award: ContractAwardRow,
  conflict: ContractAwardRow["conflicts"][number],
): ExposableAct {
  return {
    id: `${award.id}:${conflict.memberId}`,
    fact: [`award:${award.id}`, "conflict-of-interest"],
    facts: {
      memberId: conflict.memberId,
      organizationId: conflict.organizationId,
      ownerId: conflict.ownerId,
      relation: conflict.relation,
    },
    citation: `A reporter's story on contract award ${award.id}: ${conflict.memberId} chose a firm owned by ${conflict.relation === OWNER_RELATION ? "themself" : `their ${conflict.relation}`}.`,
    row: {
      awardId: award.id,
      memberId: conflict.memberId,
      organizationId: conflict.organizationId,
      relation: conflict.relation,
    },
  };
}

/**
 * A person who knows of a hidden act takes it to a reporter on purpose (a
 * leak): the tip is theirs to give,
 * so the first step is not weighed; the reporter still decides to dig and the
 * outlet's owner and head still decide to run it. The leaker is named on the
 * tip and in what the reporter knows, and the two spend time together. A tip
 * already in print is not leaked again. Returns the tip.
 */
export function leakToReporter(
  api: CoreAPI,
  input: {
    readonly leakerId: string;
    readonly reporterId: string;
    readonly crimeId: string;
  },
): Record<string, unknown> {
  const crime = api.state.modules.has(CORRUPTION_MODULE_ID)
    ? (api
        .moduleState(CORRUPTION_MODULE_ID)
        .table("crimes")
        .get(input.crimeId) as unknown as CrimeRecord | undefined)
    : undefined;
  if (!crime?.taken) throw new Error(`No hidden act to leak: ${input.crimeId}`);
  if (input.leakerId === crime.officialId)
    throw new Error("The official cannot leak their own act.");
  // They can leak only what they know: they were told of it, or they told it.
  const told = (
    table(api, "told").query("byCrime", [input.crimeId]) as unknown as {
      personIds: readonly string[];
    }[]
  ).some((row) => row.personIds.includes(input.leakerId));
  if (!told && input.leakerId !== crime.offererId)
    throw new Error(`${input.leakerId} does not know of ${input.crimeId}.`);
  const staff = reportersHere(api);
  if (!staff.has(input.reporterId))
    throw new Error(`${input.reporterId} reports for no outlet here.`);
  const had = table(api, "tips").get(input.crimeId) as unknown as
    Record<string, unknown> | undefined;
  if (had?.exposedId) return had;
  const row = weighTip(api, {
    act: bribeAct(input.crimeId),
    officialId: crime.officialId,
    knowerId: input.leakerId,
    reporterId: input.reporterId,
    staff,
    leak: true,
  })!;
  // The reporter knows who gave it to them, and the two have spent time together.
  api.observe(input.reporterId, {
    key: `leak:${input.crimeId}`,
    value: input.leakerId,
    learnedAt: api.state.date,
    sourceId: `leak:${input.crimeId}`,
    access: "told",
  });
  api.relationship(
    input.leakerId,
    input.reporterId,
    "contact",
    api.parameter("sourceMeetingMinutes") / api.parameter("minutesPerHour"),
  );
  return row;
}

/**
 * A magazine's profile: who it writes about is the person the fresh records
 * name most (ties to the outlet's own reporter's closeness, then id), not
 * profiled by it this year; how it reads is the story's framing (the owner's,
 * head's and reporter's regard and the outlet's line). Its readers' view of
 * the person moves toward the framing.
 */
export function writeProfile(
  api: CoreAPI,
  ctx: DeskContext,
  outlet: OutletRow,
  wire: readonly WireItem[],
): void {
  const reporterId = (outlet.reporterIds ?? []).find(
    (id) => api.state.people.get(id)?.alive,
  );
  if (!reporterId) return;
  const yearAgo = addDays(makeIsoDate(api.state.date), -365);
  const done = new Set(
    storiesPrinted(api, outlet.id)
      .filter((s) => s.kind === "profile" && s.date >= yearAgo)
      .flatMap((s) => s.subjectIds),
  );
  const named = new Map<string, number>();
  for (const item of wire)
    for (const id of item.subjectIds)
      if (api.state.people.get(id)?.alive && !done.has(id))
        named.set(id, (named.get(id) ?? 0) + 1);
  const subjectId = [...named]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        closeness(api, reporterId, b[0]) - closeness(api, reporterId, a[0]) ||
        a[0].localeCompare(b[0]),
    )
    .map(([id]) => id)[0];
  if (!subjectId) return;
  const story = printItem(
    api,
    ctx,
    outlet,
    reporterId,
    {
      id: `profile:${outlet.id}:${subjectId}:${api.state.date}`,
      kind: "profile",
      date: api.state.date,
      level: "nation",
      topic: `person:${subjectId}`,
      desiredChange: "profile",
      ending: false,
      subjectIds: [subjectId],
    },
    null,
  );
  for (const id of ctx.followers(outlet.id))
    if (id !== subjectId)
      touchImpression(api, {
        voterId: id,
        officialId: subjectId,
        act: "interview",
        target: story.slant,
        weight: pressParameter("profileWeight"),
        rapport: 0,
      });
}

/*
 * What a paper found when it exposed an official (`press.exposed`),
 * read from the act's own record so the reporter who calls says what the
 * story says, not only that there is one (owner, Nov 15, on the scandal call:
 * "I've got a story about the water rates, and your name is in it... that's
 * very ambiguous"; Words lead's lines in reply-sets/oath-bribe-scandal.md C).
 *
 * - a bribe taken (corruption.ts crime record): who paid, and what the money
 *   was for, the bill or the contract award, read the same way the offer
 *   scene reads it (`wantedFacts`);
 * - a conflict on an award (contracts.ts award row, its conflict): the award
 *   by the work it pays for, the firm, and whose firm it is, the official's
 *   own or a relative's.
 */
/** The finding behind an exposure, with the records that hold it. */
export interface ExposedFinding {
  readonly found: "bribe" | "conflict";
  /** The crime record or the award the story is on. */
  readonly recordId: string;
  /** The bill a bribe bought a vote on. */
  readonly billId?: string;
  /** The award, by its id and its spending line. */
  readonly contractId?: string;
  readonly contractLine?: string;
  /** Who paid the bribe. */
  readonly briberId?: string;
  /** The firm an interested member chose, its owner and the owner's relation to the member. */
  readonly firmId?: string;
  readonly ownerId?: string;
  readonly ownFirm?: boolean;
}

/** The finding an exposure's facts name; null when its record is gone. */
export function exposedFinding(
  api: CoreAPI,
  said: Readonly<Record<string, string>>,
): ExposedFinding | null {
  const key = (prefix: string) =>
    Object.keys(said).find((row) => row.startsWith(prefix));
  const crimeKey = key("crime:");
  if (crimeKey && said[crimeKey] === "bribe-taken") {
    if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return null;
    const crimeId = crimeKey.slice("crime:".length);
    const crime = crimeRecord(api, crimeId);
    if (!crime) return null;
    const wanted = wantedFacts(crime.subjectId);
    return {
      found: "bribe",
      recordId: crime.id,
      briberId: crime.offererId,
      ...(wanted.billId ? { billId: wanted.billId } : {}),
      ...(wanted.contractId ? { contractId: wanted.contractId } : {}),
      ...(wanted.contractLine ? { contractLine: wanted.contractLine } : {}),
    };
  }
  const awardKey = key("award:");
  if (awardKey && said[awardKey] === "conflict-of-interest") {
    const awardId = awardKey.slice("award:".length);
    const wanted = wantedFacts(awardId);
    return {
      found: "conflict",
      recordId: awardId,
      contractId: awardId,
      ...(wanted.contractLine ? { contractLine: wanted.contractLine } : {}),
      ...(said.organizationId ? { firmId: said.organizationId } : {}),
      ...(said.ownerId ? { ownerId: said.ownerId } : {}),
      ownFirm: said.relation === OWNER_RELATION,
    };
  }
  return null;
}
