import { runModuleCalendar } from "./module-calendar";
/** Process-local controlled clock. Client IDs select saved offers, never amounts or motives. */
import { addDays, makeIsoDate, daysBetweenText } from "./kernel/dates";
import { advanceDate, duePeople } from "./calendar";
import type { DuePerson } from "./calendar";
import { chooseAct } from "./choice";
import { compactOriginalAnswer } from "./compact-choice";
import { FinanceReadGuard } from "./finance-plan";
import {
  activate,
  availableActs,
  compactRoutineMetrics,
  projectWorkNeeds,
  refreshNeeds,
} from "./life";
import { parameter } from "./parameters";
import {
  assertFactoryCoreV1,
  condenseCircleDecisions,
  coreAPI,
  resolveOperation,
} from "./state";
import { compactQuietWorkResults } from "./work-state";
import { runWorkPayrollDay } from "./work-payroll-dispatch";
import {
  WORK_MODULE,
  commitWorkChoice,
  notifyWorkChoice,
  prepareWorkChoice,
  recordDiscretionaryActivity,
  runScheduledWork,
  verifyWorkChoiceV1,
} from "./modules/work";
import type { PreparedWorkChoice } from "./modules/work";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
  snapshotExplicitControlV1,
  prepareControlledActTraceV1,
} from "./player-control-state-v1";
import type { ControlTokenV1 } from "./player-control-state-v1";
import {
  earliestWorkBoundaryV1,
  workBoundaryIdV1,
  workSpansOnDateV1,
} from "./work-spans-v1";
import type {
  WorkBoundaryV1,
  WorkMomentV1,
  WorkSpanOwnerV1,
} from "./work-spans-v1";
import {
  acknowledgeModuleStopsV1,
  bindModuleStopClockV1,
  comparePlayerMomentsV1,
  earliestModuleStopsV1,
} from "./player-stops-v1";
import type { ModuleStopV1 } from "./player-stops-v1";
import type { ActOffer, CoreAPI, CoreState, DecisionResult } from "./types";

const version = "core2-part1b-v1" as const;
export type PlayerMomentV1 = WorkMomentV1;
export interface PlayerStopV1 {
  readonly version: typeof version;
  readonly at: PlayerMomentV1;
  readonly work: WorkBoundaryV1 | null;
  readonly modules: readonly ModuleStopV1[];
}
export interface PlayerOfferV1 {
  readonly offerId: string;
  readonly actionId: string;
  readonly targetId: string;
  readonly durationMinutes: number;
  readonly availableHours: number;
  readonly durationEvidence: Readonly<{
    basis: "work-slot" | "action-definition";
    spans?: WorkSpanOwnerV1["spans"];
    effortParameter?: string;
  }>;
  readonly score: NonNullable<DecisionResult["scores"]>[number];
}
export type PlayerPacketV1 = Readonly<
  {
    version: typeof version;
    controlledPersonId: string;
    at: PlayerMomentV1;
    simulatedDays: number;
    decisions: number;
    acts: number;
  } & (
    | { kind: "complete" }
    | { kind: "stop"; pauseId: string; stop: PlayerStopV1 }
    | {
        kind: "choice";
        pauseId: string;
        choiceKind: "committed" | "discretionary";
        offers: readonly PlayerOfferV1[];
        decision: DecisionResult;
      }
  )
>;
type Choice = {
  kind: "choice";
  packet: Extract<PlayerPacketV1, { kind: "choice" }>;
  offers: readonly ActOffer[];
  decision: DecisionResult;
  verify: () => void;
  work?: PreparedWorkChoice;
  owner?: WorkSpanOwnerV1;
};
type Stop = { kind: "stop"; packet: Extract<PlayerPacketV1, { kind: "stop" }> };
type WorkIntent = {
  prepared: PreparedWorkChoice;
  owner: WorkSpanOwnerV1;
  decision: DecisionResult;
  end: PlayerMomentV1;
  evidence: ReturnType<typeof prepareControlledActTraceV1>;
};
type ActIntent = {
  offer: ActOffer;
  decision: DecisionResult;
  end: PlayerMomentV1;
  verify: () => void;
  evidence: ReturnType<typeof prepareControlledActTraceV1>;
};
type Day = {
  date: string;
  due: readonly DuePerson[];
  owners: readonly WorkSpanOwnerV1[];
  preparedIds: Set<string>;
  work: WorkIntent[];
  discretionaryOffered: boolean;
  action?: ActIntent;
};
type Session = {
  personId: string;
  token: ControlTokenV1;
  api: CoreAPI;
  clock: ReturnType<typeof bindModuleStopClockV1>;
  at: PlayerMomentV1;
  target: PlayerMomentV1;
  acknowledged: Set<string>;
  serial: number;
  simulatedDays: number;
  decisions: number;
  acts: number;
  day?: Day;
  pending?: Choice | Stop;
  busy: boolean;
  fault?: unknown;
};
const sessions = new WeakMap<CoreState, Session>();
const compare = comparePlayerMomentsV1;
function frozen<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) frozen(child);
    Object.freeze(value);
  }
  return value;
}
function detached<T>(value: T): T {
  return frozen(structuredClone(value));
}
function moment(core: CoreState, raw: PlayerMomentV1): PlayerMomentV1 {
  const r = new FinanceReadGuard(),
    date = makeIsoDate(r.field(raw, "date")),
    minuteOfDay = r.field(raw, "minuteOfDay");
  const limit = dayMinutes(core);
  if (!Number.isFinite(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= limit)
    throw new Error("Invalid exact player minute.");
  r.verify();
  return Object.freeze({ date, minuteOfDay });
}
function dayMinutes(core: CoreState): number {
  const result =
    parameter("hoursPerDay", core.data.parameters) *
    parameter("minutesPerHour", core.data.parameters);
  if (!(result > 0) || !Number.isFinite(result))
    throw new Error("Invalid civil day units.");
  return result;
}
function nextDay(date: string): string {
  return addDays(makeIsoDate(date), 1);
}
function endOf(
  core: CoreState,
  date: string,
  minuteOfDay: number,
): PlayerMomentV1 {
  return Object.freeze(
    minuteOfDay === dayMinutes(core)
      ? { date: nextDay(date), minuteOfDay: 0 }
      : { date, minuteOfDay },
  );
}
function base(s: Session) {
  return {
    version,
    controlledPersonId: s.personId,
    at: s.at,
    simulatedDays: s.simulatedDays,
    decisions: s.decisions,
    acts: s.acts,
  };
}
function assertSession(core: CoreState, s: Session): void {
  if (s.fault !== undefined)
    throw new Error(
      "Player clock faulted after a committed step; automatic replay is prohibited.",
    );
  if (snapshotExplicitControlV1(core).personId !== s.personId)
    throw new Error("Player control changed outside its clock.");
  if (s.day && core.date !== s.day.date)
    throw new Error("Player core date changed outside its clock.");
  if (!core.people.get(s.personId)?.alive)
    throw new Error(
      "Controlled person is no longer alive; unresolved intentions remain unposted.",
    );
}
function locked<T>(core: CoreState, s: Session, operation: () => T): T {
  if (s.busy) throw new Error("Player clock cannot reenter.");
  assertSession(core, s);
  s.busy = true;
  try {
    return operation();
  } finally {
    s.busy = false;
  }
}
function earliest(
  core: CoreState,
  personId: string,
  from: PlayerMomentV1,
  through: PlayerMomentV1,
  ack: readonly string[],
): PlayerStopV1 | null {
  const work = core.data.work
    ? earliestWorkBoundaryV1(coreAPI(core), {
        controlledPersonId: personId,
        from,
        through,
        acknowledgedBoundaryIds: ack,
      })
    : null;
  const modules = earliestModuleStopsV1(core, {
    controlledPersonId: personId,
    from,
    through,
  });
  const moduleAt = modules[0]?.at;
  if (!work && !moduleAt) return null;
  const at =
    work && (!moduleAt || compare(work.at, moduleAt) <= 0)
      ? work.at
      : moduleAt!;
  return Object.freeze({
    version,
    at,
    work: work && compare(work.at, at) === 0 ? work : null,
    modules:
      moduleAt && compare(moduleAt, at) === 0 ? modules : Object.freeze([]),
  });
}
/** Pure query; cold clocks begin at the next unprocessed civil day, midnight. */
function earliestPlayerStopV1Impl(
  core: CoreState,
  input: Readonly<{ controlledPersonId: string; through: PlayerMomentV1 }>,
): PlayerStopV1 | null {
  assertFactoryCoreV1(core);
  const r = new FinanceReadGuard(),
    personId = r.field(input, "controlledPersonId"),
    through = moment(core, r.field(input, "through")),
    s = sessions.get(core);
  if (
    typeof personId !== "string" ||
    !core.people.get(personId)?.alive ||
    (s && s.personId !== personId)
  )
    throw new Error("Invalid controlled person.");
  const from =
    s?.at ?? Object.freeze({ date: nextDay(core.date), minuteOfDay: 0 });
  if (compare(through, from) < 0)
    throw new Error("Player query cannot move backward.");
  if (s) {
    if (s.busy) throw new Error("Player clock cannot reenter.");
    assertSession(core, s);
  }
  const identity = snapshotExplicitControlV1(core),
    result = earliest(core, personId, from, through, [
      ...(s?.acknowledged ?? []),
    ]);
  r.verify();
  identity.verify();
  if (sessions.get(core) !== s)
    throw new Error("Player session changed during query.");
  return result;
}
function openDay(core: CoreState, s: Session): Day {
  const date = s.at.date,
    due = duePeople(core, date).filter((row) => row.personId !== s.personId);
  advanceDate(core, date);
  const owners = core.data.work
    ? workSpansOnDateV1(s.api, { controlledPersonId: s.personId, date }).owners
    : [];
  const day: Day = {
    date,
    due,
    owners,
    preparedIds: new Set(),
    work: [],
    discretionaryOffered: false,
  };
  s.day = day;
  return day;
}
function publishChoice(
  core: CoreState,
  s: Session,
  offers: readonly ActOffer[],
  original: DecisionResult,
  verify: () => void,
  work?: PreparedWorkChoice,
  owner?: WorkSpanOwnerV1,
): PlayerPacketV1 {
  if (
    !offers.length ||
    !original.scores ||
    original.scores.length !== offers.length
  )
    throw new Error("Controlled choice requires its original full score pass.");
  const reads = new FinanceReadGuard();
  const parameters = reads.field(reads.field(core, "data"), "parameters");
  const durationKeys = offers.map((offer) => {
    const definition = reads.field(offer, "definition"),
      effect = reads.field(definition, "effect");
    let key = reads.field(definition, "effortParameter");
    if (!work) {
      const dataWork = reads.field(reads.field(core, "data"), "work");
      const overrides =
        dataWork && reads.field(dataWork, "discretionaryDurationParameters");
      const override = overrides && reads.field(overrides, effect);
      if (override !== undefined) key = override;
      const value = reads.field(reads.field(parameters, key), "value");
      if (reads.field(offer, "effortHours") !== value)
        throw new Error(
          "Controlled duration no longer matches its actual owning parameter.",
        );
    }
    return key;
  });
  reads.verify();
  const pauseId = `player:${s.personId}:${++s.serial}`,
    m = parameter("minutesPerHour", core.data.parameters);
  const packet = detached({
    ...base(s),
    kind: "choice" as const,
    pauseId,
    choiceKind: work ? ("committed" as const) : ("discretionary" as const),
    decision: original,
    offers: offers.map((offer, index) => ({
      offerId: `${pauseId}:${index}`,
      actionId: offer.definition.id,
      targetId: offer.targetId,
      durationMinutes: offer.effortHours! * m,
      availableHours: offer.availableHours,
      durationEvidence:
        work &&
        offer.definition.effect === core.data.work!.attendanceAction.effect
          ? { basis: "work-slot" as const, spans: owner!.spans }
          : {
              basis: "action-definition" as const,
              effortParameter: durationKeys[index]!,
            },
      score: original.scores![index]!,
    })),
  });
  // Capture only this controlled choice's original graph, never a world/history scan.
  const capture = (value: unknown, seen = new Set<object>()): void => {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    for (const key of reads.keys(value))
      capture(reads.field(value as Record<PropertyKey, unknown>, key), seen);
  };
  capture(offers);
  capture(original);
  for (const key of new Set(["hoursPerDay", "minutesPerHour", ...durationKeys]))
    reads.field(reads.field(parameters, key), "value");
  const control = snapshotExplicitControlV1(core);
  const preflight = () => {
    reads.verify();
    control.verify();
    verify();
  };
  preflight();
  s.pending = {
    kind: "choice",
    packet,
    offers,
    decision: original,
    verify: preflight,
    work,
    owner,
  };
  return packet;
}
function readyChoice(
  core: CoreState,
  s: Session,
  day: Day,
): PlayerPacketV1 | undefined {
  for (const owner of day.owners) {
    if (!owner.spans.length || day.preparedIds.has(owner.commitment.id))
      continue;
    const first = Math.min(...owner.spans.map((span) => span.startMinute));
    if (s.at.date !== day.date || s.at.minuteOfDay < first) continue;
    const actual = core.work.commitments.get(owner.commitment.id);
    if (!actual) throw new Error("Controlled work commitment disappeared.");
    const prepared = prepareWorkChoice(s.api, actual, (actor, ids) => {
      if (ids) return projectWorkNeeds(core, s.api, actor, ids);
      refreshNeeds(core, s.api, actor);
      return undefined;
    });
    if (!prepared)
      throw new Error(
        "Controlled scheduled work no longer has its owning choice.",
      );
    const decision = chooseAct(
      core,
      s.personId,
      prepared.offers,
      prepared.context,
    );
    s.decisions++;
    return publishChoice(
      core,
      s,
      prepared.offers,
      decision,
      () => verifyWorkChoiceV1(s.api, prepared),
      prepared,
      owner,
    );
  }
  if (
    day.discretionaryOffered ||
    day.work.length ||
    day.preparedIds.size < day.owners.filter((o) => o.spans.length).length ||
    s.at.date !== day.date
  )
    return;
  const actor = core.people.get(s.personId)!;
  refreshNeeds(core, s.api, actor);
  const limit = endOf(core, day.date, dayMinutes(core)),
    next = earliest(core, s.personId, s.at, limit, [...s.acknowledged]);
  const remaining =
    next && next.at.date === day.date
      ? next.at.minuteOfDay - s.at.minuteOfDay
      : dayMinutes(core) - s.at.minuteOfDay;
  const m = parameter("minutesPerHour", core.data.parameters),
    offers = availableActs(core, s.personId).filter(
      (offer) =>
        offer.effortHours !== undefined &&
        offer.effortHours >= 0 &&
        offer.effortHours * m <= remaining,
    );
  if (!offers.length) {
    day.discretionaryOffered = true;
    return;
  }
  const decision = chooseAct(core, s.personId, offers);
  s.decisions++;
  const actual = core.people.get(s.personId),
    date = core.date;
  const packet = publishChoice(core, s, offers, decision, () => {
    if (core.people.get(s.personId) !== actual || core.date !== date)
      throw new Error("Discretionary actor changed while awaiting its answer.");
  });
  day.discretionaryOffered = true;
  return packet;
}
function finishIntents(core: CoreState, s: Session, day: Day): void {
  for (const intent of [...day.work])
    if (compare(intent.end, s.at) <= 0) {
      verifyWorkChoiceV1(s.api, intent.prepared);
      intent.evidence.verify();
      try {
        commitWorkChoice(s.api, intent.prepared, intent.decision);
        s.acts++;
        notifyWorkChoice(s.api, intent.prepared);
      } catch (error) {
        s.fault = error;
        throw error;
      }
      day.work.splice(day.work.indexOf(intent), 1);
    }
  const intent = day.action;
  if (intent && compare(intent.end, s.at) <= 0) {
    intent.verify();
    intent.evidence.verify();
    const effect = resolveOperation(
      core,
      "effectHandlers",
      intent.offer.definition.effect,
    );
    if (!effect) throw new Error("Controlled effect operation disappeared.");
    try {
      if (intent.offer.definition.stopgapId)
        s.api.stopgap(intent.offer.definition.stopgapId);
      const days = daysBetweenText(
        core.people.get(s.personId)!.lastActDate,
        core.date,
      );
      const result = effect(
        s.api,
        s.personId,
        intent.offer,
        core.date,
        days,
        intent.decision,
      );
      if (!result?.recordedActId)
        s.api.recordAct(s.personId, intent.offer, core.date, intent.decision);
      if (!result?.recordedActivity)
        recordDiscretionaryActivity(s.api, s.personId, intent.offer);
      if (!result?.recordedLastActDate)
        s.api.updatePerson(s.personId, { lastActDate: core.date });
      s.acts++;
      day.action = undefined;
    } catch (error) {
      s.fault = error;
      throw error;
    }
  }
}
function closeDay(core: CoreState, s: Session, day: Day): void {
  if (day.work.length || day.action)
    throw new Error("Cannot close a day with unfinished controlled acts.");
  try {
    runModuleCalendar(core, s.api);
    for (const module of core.modules.values()) {
      const decide = (
        actorId: string,
        offers: readonly ActOffer[],
        context?: Parameters<typeof chooseAct>[3],
      ) => {
        if (actorId === s.personId)
          throw new Error(
            "A module attempted an autonomous controlled choice.",
          );
        return chooseAct(core, actorId, offers, context);
      };
      const refresh = (
        actor: Parameters<typeof refreshNeeds>[2],
        ids?: readonly string[],
      ) => {
        // The controlled person's needs belong to the clock's continuation:
        // a module may read a projection of them but never refresh them.
        if (actor.id === s.personId)
          return ids ? projectWorkNeeds(core, s.api, actor, ids) : undefined;
        if (ids) return projectWorkNeeds(core, s.api, actor, ids);
        refreshNeeds(core, s.api, actor);
        return undefined;
      };
      const count =
        module.id === WORK_MODULE.id
          ? runScheduledWork(s.api, decide, refresh, s.personId)
          : module.onDay?.(s.api, decide, refresh);
      if (module.id === WORK_MODULE.id) runWorkPayrollDay(s.api);
      if (count) {
        s.decisions += count.decisions;
        s.acts += count.acts;
      }
    }
    for (const row of day.due) {
      s.decisions++;
      if (activate(core, row.personId, row.days)) s.acts++;
    }
    for (const module of core.modules.values()) module.onAfterDay?.(s.api);
    compactRoutineMetrics(core);
    compactQuietWorkResults(core, s.api);
    condenseCircleDecisions(core);
    s.simulatedDays++;
    s.day = undefined;
  } catch (error) {
    s.fault = error;
    throw error;
  }
}
function drive(core: CoreState, s: Session): PlayerPacketV1 {
  while (true) {
    assertSession(core, s);
    if (s.pending) return s.pending.packet;
    if (!s.day && compare(s.at, s.target) >= 0)
      return Object.freeze({ ...base(s), kind: "complete" });
    const day = s.day ?? openDay(core, s);
    finishIntents(core, s, day);
    const stop = earliest(core, s.personId, s.at, s.target, [
      ...s.acknowledged,
    ]);
    if (stop && compare(stop.at, s.at) === 0) {
      const packet = Object.freeze({
        ...base(s),
        kind: "stop" as const,
        pauseId: `player:${s.personId}:${++s.serial}`,
        stop,
      });
      s.pending = { kind: "stop", packet };
      return packet;
    }
    if (compare(s.at, endOf(core, day.date, dayMinutes(core))) === 0) {
      closeDay(core, s, day);
      continue;
    }
    if (compare(s.at, s.target) >= 0)
      return Object.freeze({ ...base(s), kind: "complete" });
    const choice = readyChoice(core, s, day);
    if (choice) return choice;
    let next = s.target;
    const candidates = [
      endOf(core, day.date, dayMinutes(core)),
      stop?.at,
      ...day.work.map((row) => row.end),
      day.action?.end,
    ].filter((at): at is PlayerMomentV1 => at !== undefined);
    for (const at of candidates) if (compare(at, next) < 0) next = at;
    if (compare(next, s.at) <= 0)
      throw new Error("Player clock has no advancing frontier.");
    for (const work of day.work) {
      verifyWorkChoiceV1(s.api, work.prepared);
      work.evidence.verify();
    }
    if (day.action) {
      day.action.verify();
      day.action.evidence.verify();
    }
    s.clock.setFrontier(next);
    s.at = next;
    s.acknowledged.clear();
  }
}
/** Opening date is already processed. The first controlled day starts at next midnight. */
function advancePlayerV1Impl(
  core: CoreState,
  input: Readonly<{ controlledPersonId: string; through: PlayerMomentV1 }>,
): PlayerPacketV1 {
  assertFactoryCoreV1(core);
  const r = new FinanceReadGuard(),
    personId = r.field(input, "controlledPersonId"),
    through = moment(core, r.field(input, "through"));
  let s = sessions.get(core);
  if (s && s.personId !== personId)
    throw new Error("Retire the player clock before changing person.");
  const from =
    s?.at ?? Object.freeze({ date: nextDay(core.date), minuteOfDay: 0 });
  if (compare(through, from) < 0)
    throw new Error("Player advance cannot move backward.");
  r.verify();
  if (!s) {
    const clock = bindModuleStopClockV1(core, {
      controlledPersonId: personId,
      at: from,
    });
    let token: ControlTokenV1;
    try {
      token = registerControlledPersonV1(core, personId);
    } catch (error) {
      clock.retire();
      throw error;
    }
    s = {
      personId,
      token,
      clock,
      api: coreAPI(core),
      at: from,
      target: through,
      acknowledged: new Set(),
      serial: 0,
      simulatedDays: 0,
      decisions: 0,
      acts: 0,
      busy: false,
    };
    sessions.set(core, s);
  }
  const session = s;
  return locked(core, session, () => {
    if (session.pending) return session.pending.packet;
    session.target = through;
    return drive(core, session);
  });
}
function resumePlayerV1Impl(
  core: CoreState,
  input: Readonly<
    | { kind: "choice"; pauseId: string; offerId: string }
    /** Let the character make its own choice; the act is saved as theirs, not the player's. */
    | { kind: "own-choice"; pauseId: string }
    | { kind: "stop"; pauseId: string }
  >,
): PlayerPacketV1 {
  assertFactoryCoreV1(core);
  const s = sessions.get(core);
  if (!s) throw new Error("Player clock has no outstanding pause.");
  return locked(core, s, () => {
    const r = new FinanceReadGuard(),
      kind = r.field(input, "kind"),
      pauseId = r.field(input, "pauseId"),
      pending = s.pending;
    const own = kind === "own-choice";
    if (
      !pending ||
      pauseId !== pending.packet.pauseId ||
      (own ? pending.kind !== "choice" : kind !== pending.kind)
    )
      throw new Error("Player answer is foreign, stale or unavailable.");
    if (pending.kind === "stop") {
      r.verify();
      const actual = earliestModuleStopsV1(core, {
        controlledPersonId: s.personId,
        from: s.at,
        through: s.at,
      });
      // Owners can release held stops; clients cannot waive remaining ones.
      if (actual.some((row) => row.hold)) return pending.packet;
      acknowledgeModuleStopsV1(core, actual);
      for (const reason of pending.packet.stop.work?.reasons ?? [])
        s.acknowledged.add(workBoundaryIdV1(reason));
      s.pending = undefined;
      return drive(core, s);
    }
    const ownIndex = own
        ? pending.offers.findIndex(
            (offer) =>
              offer.definition.id ===
                pending.decision.selected?.definition.id &&
              offer.targetId === pending.decision.selected?.targetId,
          )
        : -1,
      offerId = own
        ? pending.packet.offers[ownIndex]?.offerId
        : r.field(input as { offerId: string }, "offerId"),
      index = pending.packet.offers.findIndex(
        (offer) => offer.offerId === offerId,
      );
    if (index < 0)
      throw new Error(
        own
          ? "The character made no choice of its own here."
          : "Player answer selects an unavailable offer.",
      );
    r.verify();
    pending.verify();
    const offer = pending.offers[index]!,
      score = pending.decision.scores![index]!,
      decision: DecisionResult = own
        ? {
            ...pending.decision,
            selected: offer,
            selectedReasons: score.reasons,
            selectedReasonTerms: score.reasonTerms,
            compactChoice: compactOriginalAnswer(
              pending.decision,
              pending.offers,
              index,
            ),
          }
        : {
            ...pending.decision,
            controlledChoice: { pauseId, offerId: offerId! },
            selected: offer,
            selectedReasons: score.reasons,
            selectedReasonTerms: score.reasonTerms,
            reasonKey: `controlled:${offer.definition.id}:${offer.targetId}`,
            compactChoice: compactOriginalAnswer(
              pending.decision,
              pending.offers,
              index,
            ),
          };
    const evidence = prepareControlledActTraceV1(
        core,
        s.personId,
        offer,
        core.date,
        decision,
      ),
      day = s.day!;
    evidence.verify();
    pending.verify();
    if (pending.work && pending.owner) {
      const end = endOf(
        core,
        day.date,
        Math.max(...pending.owner.spans.map((span) => span.endMinute)),
      );
      day.preparedIds.add(pending.work.commitmentId);
      day.work.push({
        prepared: pending.work,
        owner: pending.owner,
        decision,
        end,
        evidence,
      });
    } else {
      const end = endOf(
        core,
        day.date,
        s.at.minuteOfDay +
          offer.effortHours! *
            parameter("minutesPerHour", core.data.parameters),
      );
      day.action = { offer, decision, end, verify: pending.verify, evidence };
    }
    s.pending = undefined;
    return drive(core, s);
  });
}
/** Retirement is restricted to a completed civil-day boundary, with no pending intention. */
function retirePlayerV1Impl(core: CoreState): void {
  assertFactoryCoreV1(core);
  const s = sessions.get(core);
  if (!s) throw new Error("No player clock to retire.");
  // A controlled person who has died has no day left to finish: their clock is
  // released as it stands (their unresolved intentions stay unposted) so the
  // player can carry on as someone connected to them.
  if (!core.people.get(s.personId)?.alive) {
    if (s.busy) throw new Error("Player clock cannot reenter.");
    s.clock.retire();
    retireControlledPersonV1(core, s.token);
    sessions.delete(core);
    return;
  }
  locked(core, s, () => {
    if (s.pending || s.day || s.at.minuteOfDay !== 0)
      throw new Error("Finish the controlled day before retiring its clock.");
    s.clock.retire();
    retireControlledPersonV1(core, s.token);
    sessions.delete(core);
  });
}

const entries = new WeakSet<CoreState>();
const entryHas = WeakSet.prototype.has,
  entryAdd = WeakSet.prototype.add,
  entryDelete = WeakSet.prototype.delete;
function entered<T>(core: CoreState, run: () => T): T {
  assertFactoryCoreV1(core);
  if (entryHas.call(entries, core))
    throw new Error("Player clock cannot reenter.");
  entryAdd.call(entries, core);
  try {
    return run();
  } finally {
    entryDelete.call(entries, core);
  }
}
export function earliestPlayerStopV1(
  core: CoreState,
  input: Parameters<typeof earliestPlayerStopV1Impl>[1],
): ReturnType<typeof earliestPlayerStopV1Impl> {
  return entered(core, () => earliestPlayerStopV1Impl(core, input));
}
export function advancePlayerV1(
  core: CoreState,
  input: Parameters<typeof advancePlayerV1Impl>[1],
): PlayerPacketV1 {
  return entered(core, () => advancePlayerV1Impl(core, input));
}
export function resumePlayerV1(
  core: CoreState,
  input: Parameters<typeof resumePlayerV1Impl>[1],
): PlayerPacketV1 {
  return entered(core, () => resumePlayerV1Impl(core, input));
}
export function retirePlayerV1(core: CoreState): void {
  entered(core, () => retirePlayerV1Impl(core));
}

/**
 * No player clock, or one at rest: a whole day done and nothing waiting on
 * the player. A world snapshot is taken only then; the loaded world starts a
 * fresh clock from the same moment on the player's next advance.
 */
export function playerClockAtRestV1(core: CoreState): boolean {
  const s = sessions.get(core);
  return !s || (!s.pending && !s.day && !s.busy && s.at.minuteOfDay === 0);
}
