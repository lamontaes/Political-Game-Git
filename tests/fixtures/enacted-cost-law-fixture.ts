import { makeIsoDate, daysBetween } from "../../src/simulation/dates";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  scheduleCommitteeHearing,
  COMMITTEE_HEARING_TRANSITION_KEY,
  type MeasureStepKey,
} from "../../src/simulation/legislation";
import {
  legislativeRulePackForWorld,
  regularSessionRefusalText,
  regularSessionYearForWorld,
} from "../../src/simulation/legislative-procedure-world";
import { nextSessionCalendarDate } from "../../src/simulation/legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../../src/simulation/legislative-session-calendar-data";
import { futureDueItemStateAt } from "../../src/simulation/future-transitions";
import { applyInstitutionSessionEnd } from "../../src/simulation/governing/legislative-clock";
import { sessionClosesOn } from "../../src/simulation/governing/session-adjournments";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  votePlanKeyForConcurrence,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { recordWorldEvent } from "../../src/simulation/world";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import { enactThroughDesk } from "./enact-through-desk";
import { ensureStateExecutiveIncumbent } from "../../src/simulation/nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "../../src/simulation/governing/state-governing";
import {
  createCharacterHistoryContextPerson,
  characterHistoryContextPersonId,
} from "../../src/simulation/character-history";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import type {
  LegislativeMeasureRecord,
  IsoDate,
  World,
} from "../../src/simulation/types";

interface CostLawFixtureOptions {
  /** The authored operative date is separate from the actual filing date. */
  readonly effectiveAt?: IsoDate;
  /** Leave the clock at enactment rather than advancing to observation. */
  readonly advanceToObservation?: boolean;
}

/** Authored unanimous fixture ballots; canonical procedure, not natural passage. */
export function enactCostLawFixture(
  base: World,
  input: LegislativeMeasureRecord,
  options?: CostLawFixtureOptions,
): { world: World; measure: LegislativeMeasureRecord };
export function enactCostLawFixture(
  base: World,
  inputs: readonly LegislativeMeasureRecord[],
  options?: CostLawFixtureOptions,
): { world: World; measures: readonly LegislativeMeasureRecord[] };
export function enactCostLawFixture(
  base: World,
  inputOrInputs: LegislativeMeasureRecord | readonly LegislativeMeasureRecord[],
  options: CostLawFixtureOptions = {},
):
  | { world: World; measure: LegislativeMeasureRecord }
  | { world: World; measures: readonly LegislativeMeasureRecord[] } {
  const isList = Array.isArray(inputOrInputs);
  const inputs: readonly LegislativeMeasureRecord[] = isList
    ? (inputOrInputs as readonly LegislativeMeasureRecord[])
    : [inputOrInputs as LegislativeMeasureRecord];
  const first = inputs[0];
  if (!first) throw new Error("The cost fixture needs at least one measure.");
  if (
    inputs.some(
      (input) =>
        input.rulePackId !== first.rulePackId ||
        input.jurisdictionId !== first.jurisdictionId,
    )
  )
    throw new Error(
      "One cost fixture filing uses one legislature and jurisdiction.",
    );
  const pack = legislativeRulePackForWorld(base, first.rulePackId);
  const calendar =
    pack.session.sittingCalendar ?? LEGISLATIVE_SESSION_CALENDARS.state;
  const on = nextSessionCalendarDate(calendar, base.currentDate, "bill", {
    eligibleYear: (year) =>
      regularSessionYearForWorld(base, first.jurisdictionId, year),
  });
  const closedOn = sessionClosesOn(base, pack, Number(on.slice(0, 4)));
  const refusal = regularSessionRefusalText(pack, on);
  if (refusal || (closedOn !== null && on > closedOn))
    throw new Error(
      refusal ??
        `The fixture's filing opportunity is after the session ended on ${closedOn}.`,
    );
  if (inputs.some((input) => on > (options.effectiveAt ?? input.introducedAt)))
    throw new Error(
      "The fixture has no filing opportunity before its intended effective date.",
    );
  let world = passOrdinaryDays(base, daysBetween(base.currentDate, on));
  if (world.currentDate !== on)
    throw new Error(
      "The cost fixture stopped at a commitment before its filing date.",
    );
  // All measures are recorded at this one lawful opportunity, before time moves.
  const measures = inputs.map((input) => {
    world = introduceMeasure(world, input);
    return world.history.legislativeMeasures!.at(-1)!;
  });
  const votePlan: Record<string, { yea: number }> = {};
  const bodies = pack.chambers.map((chamber) => {
    if (chamber.seats.kind !== "known")
      throw new Error("Unknown chamber seats are unsupported in this fixture.");
    const members = Array.from({ length: chamber.seats.value }, (_, index) => ({
      memberKey: `${chamber.chamberKey}-fixture-seat-${index + 1}`,
      name: `Authored member ${index + 1}`,
      personId: null,
      caucusLabel: "Authored unanimous fixture",
    }));
    for (const committee of chamber.committees) {
      if (committee.appointedMembers === null)
        throw new Error(
          "Unknown committee seats are unsupported in this fixture.",
        );
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
      };
    }
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: members.length,
      };
    votePlan[votePlanKeyForConcurrence(chamber.chamberKey)] = {
      yea: members.length,
    };
    return {
      chamberKey: chamber.chamberKey,
      chamberName: chamber.name,
      members,
    };
  });
  for (let steps = 0; steps < 40; steps += 1) {
    const waits: {
      context: LegislativeProcedureContext;
      step: MeasureStepKey;
      until: IsoDate;
    }[] = [];
    for (const [index, input] of inputs.entries()) {
      const measure = measures[index]!;
      const effectiveAt = options.effectiveAt ?? input.introducedAt;
      const context: LegislativeProcedureContext = {
        pack,
        measureId: measure.id,
        bodies,
        committeeMemberCount: pack.chambers[0]!.committees[0]!.appointedMembers,
        votePlan,
        governorAction: null,
        governorRationale:
          "The fixture holder signs the bound matter through the real executive desk.",
      };
      if (measurePosition(world, measure.id).phase === "awaiting-executive") {
        if (
          !governorOfficeForJurisdiction(world, pack.jurisdictionKey)
            ?.holderPersonId
        ) {
          let subjectPersonId = world.personOrder[0];
          if (!subjectPersonId) {
            // An explicit fixture resident anchors the existing opening writer;
            // the actual incumbent and its tenure still come from that writer.
            const stableKey = `cost-fixture:executive-subject:${pack.jurisdictionKey}`;
            world = createCharacterHistoryContextPerson(world, {
              stableKey,
              givenName: "Fixture",
              familyName: "Resident",
              birthDate: makeIsoDate(
                `${Number(world.currentDate.slice(0, 4)) - 40}-01-01`,
              ),
              homeJurisdictionId: input.jurisdictionId,
            });
            subjectPersonId = characterHistoryContextPersonId(world, stableKey);
          }
          world = ensureStateExecutiveIncumbent(
            world,
            subjectPersonId,
            pack.jurisdictionKey.replace(/^US-/, ""),
          );
        }
        const originalControl = world.control;
        const holder = governorOfficeForJurisdiction(
          world,
          pack.jurisdictionKey,
        )!.holderPersonId;
        world = enactThroughDesk(world, measure.id, {
          effectiveAt,
        });
        if (
          originalControl.kind !== "person" ||
          originalControl.personId !== holder
        ) {
          // The signing consequence can open implementation work. Restore the
          // fixture's control through the existing handoff writer, leaving that
          // work with the actual officeholder rather than awaiting this player.
          const controlled: World = {
            ...world,
            control: { kind: "person", personId: holder },
          };
          const required = playerRequiredWorkIds(controlled, holder);
          if (required.length > 0) {
            const stableKey = `${input.stableKey}:executive-control-restored`;
            const handoff = recordWorldEvent(controlled, {
              stableKey,
              type: "test.control-moved",
              occurredAt: world.currentDate,
              recordedAt: world.currentDate,
              jurisdictionId: input.jurisdictionId,
              involvedEntityIds: [holder, ...required],
              participants: [],
              personFactConstraints: [],
              visibility: "private",
              tags: [],
              summary:
                "The cost fixture returns temporary executive control while the office retains its implementation work.",
              context: {
                location: null,
                socialContext: null,
                pressure: null,
                choice: null,
                motivation: null,
                immediateReaction: null,
              },
            });
            world = {
              ...releasePlayerRequiredWork(handoff, {
                personId: holder,
                stableKeyPrefix: `${stableKey}:released`,
                outcomeEventId: handoff.history.events.at(-1)!.id,
              }),
              control: originalControl,
            };
          }
        }
      }
      const phase = measurePosition(world, measure.id).phase;
      if (phase === "awaiting-enactment")
        world = recordEnactment(world, {
          stableKey: input.stableKey + ":law",
          measureId: measure.id,
          effectiveAt,
        });
      if (measurePosition(world, measure.id).phase === "enacted") continue;
      const sessionEnd = applyInstitutionSessionEnd(world, measure.id);
      if (sessionEnd) {
        if (sessionEnd.kind === "ended") world = sessionEnd.world;
        throw new Error(
          sessionEnd.kind === "blocked"
            ? sessionEnd.reason
            : `The cost fixture measure ${measure.id} cannot proceed: ${sessionEnd.kind === "ended" ? "the bill died when the session adjourned" : sessionEnd.kind}.`,
        );
      }
      const step = availableMeasureSteps(world, measure.id).find(
        (candidate) => candidate !== "offer-amendment",
      );
      if (!step)
        throw new Error(
          `Unsupported fixture phase: ${measurePosition(world, measure.id).phase}`,
        );
      if (step === "request-committee-hearing") {
        const pending = world.history.futureDueItems.find(
          (item) =>
            item.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
            item.entityIds.includes(measure.id) &&
            futureDueItemStateAt(world, item.id, {
              asOfDate: world.currentDate,
              historySequenceExclusive: world.history.nextSequence,
            })?.status === "scheduled",
        );
        const until =
          pending?.dueAt ??
          nextSessionCalendarDate(calendar, world.currentDate, "hearing");
        if (!pending)
          world = scheduleCommitteeHearing(world, {
            stableKey: `${input.stableKey}:hearing:${measurePosition(world, measure.id).chamberKey}:${steps}`,
            measureId: measure.id,
            hearingDate: until,
          });
        waits.push({ context, step, until });
      } else if (step === "await-next-legislative-day") {
        const until = measurePosition(world, measure.id).earliestNextFloorDate;
        if (!until)
          throw new Error("The bill is not waiting on a legislative day.");
        waits.push({ context, step, until });
      } else {
        world = applyLegislativeStep(context, world, step).world;
      }
    }
    if (
      measures.every(
        (measure) => measurePosition(world, measure.id).phase === "enacted",
      )
    ) {
      if (options.advanceToObservation !== false) {
        const currentDate =
          world.currentDate > makeIsoDate("2026-06-01")
            ? world.currentDate
            : makeIsoDate("2026-06-01");
        if (currentDate > world.currentDate)
          world = passOrdinaryDays(
            world,
            daysBetween(world.currentDate, currentDate),
          );
        if (world.currentDate < currentDate)
          throw new Error(
            "The cost fixture stopped at a commitment before its end date.",
          );
      }
      return isList ? { measures, world } : { measure: measures[0]!, world };
    }
    // Schedule all ready peers before the earliest wait moves the shared clock.
    // Every measure's position and next step are read again in the next round.
    const wait = waits.sort((a, b) => a.until.localeCompare(b.until))[0];
    if (wait)
      world = applyLegislativeStep(wait.context, world, wait.step).world;
  }
  throw new Error("The authored cost fixture did not reach enactment.");
}
