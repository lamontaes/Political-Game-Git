/**
 * Public action (owner, Nov 8: "if you're having a good term except for
 * education, then you might get a strike... if the world is great, maybe
 * there's not a lot to react to, or you show up to a rally, or if it's bad,
 * you show up to a protest"). Each month, after the outcome web writes the
 * town's row, the town's term is read by area (src/core2/term-read.ts). A bad
 * slide feeds the town's organizing in that area and a good one its pride;
 * both fade a share each month, so a movement grows over a bad term and dies
 * after one that mends. The people each area touches (the school's staff, the
 * town's renters, the jobless, every resident) then each decide whether to
 * join, by the same resident's decision a residents' group uses
 * (`joinsGroup`: their view, whether it touches their own life, who they know
 * who is already in, and their traits). Two or more who join are an action: a
 * strike where the area's workers act, a protest where residents press a
 * demand, a rally where they gather to say the term is going well.
 *
 * What an action does: the people in it make their case on the area's policy
 * question to the officials who hold the town's seats, through the speech
 * engine, so the views engine moves each official by their standing with the
 * speaker, and the position they take at the next vote is the one their views
 * give. The player is never decided for: an action the player's own life is
 * touched by is left open for them (`playerTouched`), and the scene is theirs.
 *
 * stopgapId: SG-WORDS-public-action-counted-share (the counted population is
 * not asked to join: an action's size is its named participants).
 */
import { countedPersonOf } from "../counted-actor";
import { residentsRuntime } from "./residents";
import { registerModule } from "../state";
import { addDays, makeIsoDate } from "../kernel/dates";
import { groupDraw, joinsGroup } from "./elections";
import { makeCase } from "./speech";
import { townSeats } from "./offices";
import { currentCloseness } from "../closeness";
import { placeTermRead, termReadPlaces, type AreaRead } from "./laws";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { ageOnDate } from "../kernel/dates";
import data from "../data/public-action/actions.json" with { type: "json" };

export const PUBLIC_ACTION_MODULE_ID = "core2-public-action-v1";
const RUN_KIND = "public-action";
/** The kinds of public record an action leaves. */
export const ACTION_KINDS = ["strike", "protest", "rally"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

type Touches = "school-staff" | "renters" | "jobless" | "residents";
interface AreaRule {
  readonly touches: Touches;
  readonly bad: ActionKind;
  readonly good: ActionKind;
  readonly question?: string;
}
const RULES = data.areas as unknown as Readonly<Record<string, AreaRule>>;
const PAR = data.parameters;
/** The age at which someone is an adult for jobs and for taking part. */
const ADULT_AGE = 18;

/** The town's organizing in one area, one side of it. */
export interface MobilizationRow {
  readonly id: string;
  readonly placeId: string;
  readonly area: string;
  readonly side: "grievance" | "pride";
  readonly level: number;
  readonly updatedOn: string;
  readonly sourceRecordIds: readonly string[];
}

/** One strike, protest or rally, from the month it formed to the month it faded. */
export interface ActionRow {
  readonly id: string;
  readonly placeId: string;
  readonly area: string;
  readonly kind: ActionKind;
  readonly side: "grievance" | "pride";
  readonly startedOn: string;
  readonly lastOn: string;
  readonly endedOn: string | null;
  readonly months: number;
  readonly participantIds: readonly string[];
  /** The wider town's people in it this month, by count (they are not named until met). */
  readonly countedParticipants: number;
  /** How strongly the town was organized when it was last seen. */
  readonly level: number;
  /** The term read of the area it rose from, between -1 and 1. */
  readonly slide: number;
  /** The player's own life is touched by it: the scene is theirs to take. */
  readonly playerTouched: boolean;
  /** The web rows the read compared. */
  readonly sourceRecordIds: readonly string[];
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(PUBLIC_ACTION_MODULE_ID).table(name);

/** Every action on record, newest last. */
export function actionsOf(api: CoreAPI, placeId?: string): ActionRow[] {
  if (!(api.state as CoreState).modules.has(PUBLIC_ACTION_MODULE_ID)) return [];
  return (table(api, "actions").rows() as unknown as ActionRow[])
    .filter((row) => !placeId || row.placeId === placeId)
    .sort((a, b) => a.startedOn.localeCompare(b.startedOn));
}

/** The policy question a town presses on its officials when an area goes badly, where the area has one. */
export function areaQuestion(area: string): string | undefined {
  return RULES[area]?.question;
}

/** The first of the month's key ("YYYY-MM"). */
const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

/** The people an area touches in a town, from the records the other engines keep. */
function touchedIn(
  core: CoreState,
  placeId: string,
  touches: Touches,
  renters: ReadonlySet<string>,
  seekers: ReadonlySet<string>,
): PersonState[] {
  const out: PersonState[] = [];
  for (const person of core.people.values()) {
    if (!person.alive || person.placeId !== placeId) continue;
    if (ageOnDate(person.birthDate, core.date) < ADULT_AGE) continue;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    const employed = !!job && job.endsAt === undefined;
    const employer = employed
      ? core.organizations.get(job.organizationId)
      : undefined;
    if (touches === "school-staff") {
      if (employer?.classification?.startsWith("service:school"))
        out.push(person);
    } else if (touches === "renters") {
      if (renters.has(person.householdId)) out.push(person);
    } else if (touches === "jobless") {
      if (seekers.has(person.id)) out.push(person);
    } else out.push(person);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The wider town's people who work for the town's schools, from the residents
 * engine's wage flows: counted workers, who are asked to join by the same
 * resident decision as a full person (one model, two tiers).
 */
function countedSchoolStaff(core: CoreState, placeId: string): string[] {
  const rt = residentsRuntime(core);
  if (!rt) return [];
  const out: string[] = [];
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    const organization = flow.organizationId
      ? core.organizations.get(flow.organizationId)
      : undefined;
    if (
      !job ||
      job.endsAt !== undefined ||
      flow.endedAt ||
      organization?.placeId !== placeId ||
      !organization.classification?.startsWith("service:school")
    )
      continue;
    out.push(job.personId);
  }
  return out.sort();
}

/** The people the jobs engine records as looking for work and not yet employed. */
function jobSeekers(api: CoreAPI): Set<string> {
  const core = api.state as CoreState;
  if (!core.modules.has("jobs")) return new Set();
  return new Set(
    (
      api.moduleState("jobs").table("seekers").rows() as unknown as {
        personId: string;
        employed: boolean;
      }[]
    )
      .filter((row) => !row.employed)
      .map((row) => row.personId),
  );
}

/** The households that rent: a lease on the books with no end. */
function renterHouseholds(core: CoreState): Set<string> {
  const out = new Set<string>();
  for (const [id, row] of core.finance.contracts)
    if (id.startsWith("lease:") && !row.endedAt && row.householdId)
      out.add(row.householdId);
  return out;
}

/** The month's organizing in each area of one town: the stock after fading and adding what the term read gives it. */
function organize(
  api: CoreAPI,
  placeId: string,
  reads: readonly AreaRead[],
): MobilizationRow[] {
  const rows: MobilizationRow[] = [];
  for (const area of Object.keys(RULES)) {
    const read = reads.find((row) => row.area === area);
    for (const side of ["grievance", "pride"] as const) {
      const id = `${placeId}:${area}:${side}`;
      const before = table(api, "mobilization").get(id) as unknown as
        MobilizationRow | undefined;
      const pressure = read
        ? Math.max(0, side === "grievance" ? -read.slide : read.slide)
        : 0;
      const level =
        (before?.level ?? 0) * (1 - PAR.fade.value) + PAR.gain.value * pressure;
      const row: MobilizationRow = {
        id,
        placeId,
        area,
        side,
        level,
        updatedOn: api.state.date,
        sourceRecordIds: read?.sourceRecordIds ?? before?.sourceRecordIds ?? [],
      };
      table(api, "mobilization").put(row as unknown as ModuleRow);
      rows.push(row);
    }
  }
  return rows;
}

/** The people in the town who are in the action this month, deciding one at a time who is drawn in by those already there. */
function gatherCounted(
  api: CoreAPI,
  counted: readonly string[],
  level: number,
): number {
  let joined = 0;
  for (const id of counted) {
    const person = countedPersonOf(api.state as CoreState, id);
    if (!person) continue;
    if (
      joinsGroup(
        api,
        { ...person, id } as unknown as PersonState,
        Math.min(1, level),
        true,
        0,
      )
    )
      joined += 1;
  }
  return joined;
}

function gather(
  api: CoreAPI,
  pool: readonly PersonState[],
  level: number,
): string[] {
  const joined = new Set<string>();
  for (const person of pool) {
    if (person.id === api.state.playerId) continue;
    if (
      joinsGroup(
        api,
        person,
        Math.min(1, level),
        true,
        groupDraw(api.state, person.id, joined),
      )
    )
      joined.add(person.id);
  }
  return [...joined];
}

/** The id of the invitation a friend in an action sends the player (a `cause.shared` record, the one the cause-invite scene reads). */
const inviteId = (actionId: string, recruiterId: string, playerId: string) =>
  `cause.shared:${actionId}:${recruiterId}:${playerId}`;

/**
 * The friend in the action who knows the player best asks them to come: the
 * participant with the strongest recorded tie to the player, if any has one.
 * It is the same `cause.shared` record a person sharing their cause writes,
 * so the director stages the cause-invite scene from it and the player
 * answers in their own words; nothing here decides for them.
 */
function inviteThePlayer(
  api: CoreAPI,
  action: ActionRow,
  question: string | undefined,
): void {
  const core = api.state as CoreState;
  const playerId = core.playerId;
  if (!playerId || action.participantIds.includes(playerId)) return;
  let best: { id: string; closeness: number } | undefined;
  for (const key of core.relationshipsByPerson.get(playerId) ?? []) {
    const tie = core.relationships.get(key);
    if (!tie) continue;
    const other = tie.actorId === playerId ? tie.otherId : tie.actorId;
    if (!action.participantIds.includes(other)) continue;
    const closeness = currentCloseness(core, tie);
    if (closeness > (best?.closeness ?? 0)) best = { id: other, closeness };
  }
  if (!best) return;
  const id = inviteId(action.id, best.id, playerId);
  if (core.eventIds.has(id)) return;
  api.emit({
    id,
    date: core.date,
    kind: "cause.shared",
    personIds: [best.id],
    witnessIds: [playerId],
    placeId: core.people.get(best.id)!.placeId,
    topic: question ?? action.area,
    desiredChange: "enact",
    facts: { actionId: action.id, area: action.area },
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation: `A friend in the ${action.kind} over ${action.area} (${action.id}) asks the player to come.`,
    },
  });
}

/**
 * The player said yes to a friend's invitation (the cause-invite scene's
 * reply): they are in the action from now, and make their case to the town's
 * officials like everyone in it.
 */
function playerJoins(api: CoreAPI, event: { facts?: Record<string, string> }) {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "cause-invite" || facts.ending !== "joined") return;
  const match = /^cause\.shared:(action:.+):[^:]+:([^:]+)$/.exec(
    facts.causeId ?? "",
  );
  if (!match) return;
  const [, actionId, playerId] = match;
  const action = table(api, "actions").get(actionId!) as unknown as
    ActionRow | undefined;
  if (!action || action.participantIds.includes(playerId!)) return;
  table(api, "actions").put({
    ...action,
    participantIds: [...action.participantIds, playerId!].sort(),
    playerTouched: true,
  } as unknown as ModuleRow);
  const rule = RULES[action.area]!;
  // A rally has no demand to press: the player only stood with it.
  if (rule.question && action.side === "grievance")
    makeCase(api, {
      id: `case:${action.id}:${api.state.date}:player`,
      speakerId: playerId!,
      listenerIds: officialsOfTown(api),
      placeId: action.placeId,
      topic: rule.question,
      desiredChange: "enact",
      citation: `The player joined the ${action.kind} over ${action.area}, ${action.id}`,
    });
}

/** The officials holding the town's seats, at every level that covers it (or only the town's own). */
function officialsOfTown(api: CoreAPI, localOnly = false): string[] {
  return [
    ...new Set(
      townSeats(api).flatMap((row) =>
        row.holder?.personId &&
        (!localOnly || LOCAL_LEVELS.has(row.office.level))
          ? [row.holder.personId]
          : [],
      ),
    ),
  ].sort();
}

/** The levels of government that sit in the town and see its streets: their holders hear a protest when it forms. */
const LOCAL_LEVELS: ReadonlySet<string> = new Set([
  "city",
  "county",
  "township",
]);

function monthlyRun(api: CoreAPI): void {
  const core = api.state as CoreState;
  const state = table(api, "state").get("public-action:state") as unknown as
    { openedAt: string } | undefined;
  const renters = renterHouseholds(core);
  const seekers = jobSeekers(api);
  const month = monthOf(core.date);
  for (const placeId of termReadPlaces(api)) {
    const reads = placeTermRead(api, placeId, state?.openedAt ?? core.date);
    const stocks = organize(api, placeId, reads);
    for (const stock of stocks) {
      const rule = RULES[stock.area]!;
      const kind = stock.side === "grievance" ? rule.bad : rule.good;
      const open = (
        table(api, "actions").query("byPlace", [
          placeId,
        ]) as unknown as ActionRow[]
      ).find(
        (row) =>
          row.area === stock.area &&
          row.side === stock.side &&
          row.endedOn === null,
      );
      const pool =
        stock.level > 0
          ? touchedIn(core, placeId, rule.touches, renters, seekers)
          : [];
      const participants = pool.length ? gather(api, pool, stock.level) : [];
      // The wider town's school staff are asked the same question, by their count.
      const countedJoined =
        stock.level > 0 && rule.touches === "school-staff"
          ? gatherCounted(api, countedSchoolStaff(core, placeId), stock.level)
          : 0;
      const formed =
        participants.length + countedJoined >= PAR.minimumParticipants.value;
      if (!formed) {
        if (open)
          table(api, "actions").put({
            ...open,
            endedOn: core.date,
            level: stock.level,
          } as unknown as ModuleRow);
        continue;
      }
      const read = reads.find((row) => row.area === stock.area);
      const id =
        open?.id ?? `action:${placeId}:${stock.area}:${stock.side}:${month}`;
      const row: ActionRow = {
        id,
        placeId,
        area: stock.area,
        kind,
        side: stock.side,
        startedOn: open?.startedOn ?? core.date,
        lastOn: core.date,
        endedOn: null,
        months: (open?.months ?? 0) + 1,
        participantIds: [
          ...new Set([...(open?.participantIds ?? []), ...participants]),
        ].sort(),
        countedParticipants: countedJoined,
        level: stock.level,
        slide: read?.slide ?? 0,
        playerTouched: pool.some((person) => person.id === core.playerId),
        sourceRecordIds: stock.sourceRecordIds,
      };
      table(api, "actions").put(row as unknown as ModuleRow);
      if (!open)
        api.emit({
          id: `civic.${kind}:${id}`,
          date: core.date,
          kind: `civic.${kind}`,
          personIds: participants,
          // The town's own officials see it form, and so can be confronted by it.
          witnessIds: [
            ...new Set([...participants, ...officialsOfTown(api, true)]),
          ],
          placeId,
          publicRecord: true,
          news: true,
          topic: rule.question ?? stock.area,
          facts: {
            actionId: id,
            area: stock.area,
            side: stock.side,
            question: rule.question ?? "",
            size: String(participants.length + countedJoined),
          },
          source: {
            tag: "SOURCED",
            citation: `The town's ${stock.area} read ${read?.slide.toFixed(2) ?? "n/a"} since the term began (web rows ${stock.sourceRecordIds.join(", ")}).`,
            asOf: core.date,
          },
        });
      // A friend in it asks the player to come. A rally has no demand, so the
      // invitation names none (its topic is the area), and joining one presses
      // no one (`playerJoins`).
      if (!open)
        inviteThePlayer(
          api,
          row,
          stock.side === "grievance" ? rule.question : undefined,
        );
      // A grievance presses its demand on the town's officials; a rally has none.
      if (stock.side === "grievance" && rule.question) {
        const lead = participants[0];
        if (lead)
          makeCase(api, {
            id: `case:${id}:${month}`,
            speakerId: lead,
            listenerIds: officialsOfTown(api),
            placeId,
            topic: rule.question,
            desiredChange: "enact",
            citation: `${kind} over ${stock.area}, ${id}`,
          });
      }
    }
  }
}

/** Install the engine in a world (after the outcome web, the offices and the speech engine). */
export function openPublicAction(core: CoreState): void {
  if (!core.modules.has(PUBLIC_ACTION_MODULE_ID))
    registerModule(core, PUBLIC_ACTION_MODULE);
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-05";
  api.moduleCalendar(PUBLIC_ACTION_MODULE_ID).schedule({
    key: `public-action:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: "The outcome web's town rows, read by area.",
    },
    sourceRecordIds: ["public-action:state"],
  });
}

export const PUBLIC_ACTION_MODULE: CoreModule = {
  id: PUBLIC_ACTION_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      mobilization: {},
      actions: { indexes: { byPlace: { fields: ["placeId"] } } },
    },
  },
  eventKinds: ["scene.reply"],
  onEvent(api, event) {
    playerJoins(api, event as { facts?: Record<string, string> });
  },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    monthlyRun(api);
    schedule(api);
  },
  onDay(api) {
    const state = table(api, "state");
    if (state.get("public-action:state")) return;
    state.put({ id: "public-action:state", openedAt: api.state.date });
    schedule(api);
  },
};
