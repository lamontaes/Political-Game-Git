import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { projectPersonDossier } from "../../presentation/person-dossier";
import { addDays } from "../dates";
import {
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import {
  livedOutcomeReflectionKey,
  OFFICIAL_VIEW_TRANSITION_KEY,
} from "../law-exposure";
import { viewOfOfficial } from "../official-view-reads";
import { officialViewReflectionHandler } from "../living-world/official-views";
import {
  ensureCountyRowOfficersForUnit,
  sittingCountyRowOfficers,
} from "../living-world/local-government-seats";
import { countyElectedRowOffices } from "../nationwide-world/county-row-offices";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, HistoricalEvent, World } from "../types";
import { recordWorldEvent } from "../world";
import { countyUnitForJurisdiction } from "./county-offices";
import { countyOfficeHolderWorkEventIds } from "./county-office-work";
import {
  countyOfficeAffectedPeople,
  countyOfficeOutcomeForReflection,
  scheduleCountyOfficeReflections,
} from "./county-office-reflection";

const states = lifePlaceStateIdentities();
const handlers = createFutureTransitionHandlerRegistry([
  [OFFICIAL_VIEW_TRANSITION_KEY, officialViewReflectionHandler],
]);

function seated(state: string) {
  const places = searchLifePlaces("", 100, {
    stateJurisdictionKey: state,
    scope: "locality",
  });
  for (const place of places) {
    const fixture = smallWorld({
      place: place.key,
      seed: `county-work:${state}`,
      household: true,
    });
    let world: World = { ...fixture.world, control: { kind: "observer" } };
    const unit = countyUnitForJurisdiction(fixture.jurisdictionId);
    if (unit)
      world = ensureCountyRowOfficersForUnit(
        world,
        unit,
        fixture.jurisdictionId,
        world.personOrder,
      );
    const expected = unit ? countyElectedRowOffices(unit) : [];
    if (
      !unit ||
      sittingCountyRowOfficers(world, unit).length === expected.length
    )
      return { ...fixture, world, unit };
  }
  throw new Error(`No county roster available for ${state}`);
}

function saveAct(
  world: World,
  personId: EntityId,
  type: string,
  officialId: EntityId | null,
) {
  return recordWorldEvent(world, {
    stableKey: `county-work:test:${type}:${personId}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId, ...(officialId ? [officialId] : [])],
    participants: [
      { personId, role: "focus:defendant", detail: null },
      ...(type === "justice.charged" && officialId
        ? [
            {
              personId: officialId,
              role: "agency:decided" as const,
              detail: "prosecutor",
            },
          ]
        : []),
      ...(type === "crime.arrest-made" && officialId
        ? [
            {
              personId: officialId,
              role: "other:arresting-officer" as const,
              detail: null,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: type === "crime.arrest-made" ? [`crime:offender:${personId}`] : [],
    summary: `county-work:test:${type}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("recorded county work reaches residents through the shared reflection", () => {
  it("covers all 56 state and territory records", () =>
    expect(states).toHaveLength(56));

  it.each(states)(
    "names the actual official and work in $jurisdictionKey",
    (state) => {
      const { world, personId, unit } = seated(state.jurisdictionKey);
      const officers = unit ? sittingCountyRowOfficers(world, unit) : [];
      const expected = unit
        ? countyElectedRowOffices(unit).filter(
            (row) => row.office === "sheriff" || row.office === "prosecutor",
          )
        : [];
      expect(
        officers.filter(
          (row) => row.office === "sheriff" || row.office === "prosecutor",
        ),
      ).toHaveLength(expected.length);
      const cases = [
        ["justice.held-before-trial", "sheriff"],
        ["crime.arrest-made", "sheriff"],
        ["justice.charged", "prosecutor"],
      ] as const;
      for (const [type, office] of cases) {
        const officialId =
          officers.find((row) => row.office === office)?.personId ?? null;
        const recorded = saveAct(world, personId, type, officialId);
        const event = recorded.history.events.at(-1)!;
        const scheduled = scheduleCountyOfficeReflections(recorded, event.id);
        const due = scheduled.history.futureDueItems.find(
          (row) =>
            row.stableKey === livedOutcomeReflectionKey(personId, event.id),
        );
        if (!officialId) {
          expect(
            due,
            `${state.jurisdictionKey}:${office}:unsupported`,
          ).toBeUndefined();
          expect(scheduled).toBe(recorded);
          continue;
        }
        expect(due).toBeDefined();
        expect(scheduleCountyOfficeReflections(scheduled, event.id)).toBe(
          scheduled,
        );
        expect(countyOfficeHolderWorkEventIds(scheduled, officialId)).toContain(
          event.id,
        );
        expect(
          projectPersonDossier(
            scheduled,
            personId,
            officialId,
          )!.publicCareer.map((row) => row.eventId),
        ).toContain(event.id);
        const loaded = deserializeWorld(serializeWorld(scheduled));
        const reflected = resolveFutureDueItemsThrough(
          loaded,
          due!.dueAt,
          handlers,
        );
        for (const affectedId of countyOfficeAffectedPeople(scheduled, event)) {
          const view = viewOfOfficial(reflected, affectedId, officialId);
          expect(
            view.belief,
            `${state.jurisdictionKey}:${type}:${affectedId}`,
          ).not.toBeNull();
          const traces = reflected.history.decisionTraces.filter((row) =>
            view.belief!.formation.decisionTraceIds.includes(row.id),
          );
          expect(
            traces.some((trace) =>
              trace.context.considerations.some((reason) =>
                reason.sourceRefs.some(
                  (ref) =>
                    ref.kind === "historical-event" && ref.eventId === event.id,
                ),
              ),
            ),
          ).toBe(true);
        }
        expect(
          resolveFutureDueItemsThrough(reflected, due!.dueAt, handlers).history
            .events,
        ).toEqual(reflected.history.events);
      }
    },
    30_000,
  );

  it("does not disclose private work or turn an unrelated event into a county outcome", () => {
    const supported = states
      .map((state) => seated(state.jurisdictionKey))
      .find(
        ({ world, unit }) =>
          unit &&
          sittingCountyRowOfficers(world, unit).some(
            (row) => row.office === "sheriff",
          ),
      )!;
    const { world, personId, unit } = supported;
    const sheriff = sittingCountyRowOfficers(world, unit!).find(
      (row) => row.office === "sheriff",
    )!;
    const recorded = saveAct(
      world,
      personId,
      "justice.held-before-trial",
      sheriff.personId,
    );
    const event = recorded.history.events.at(-1)!;
    const hidden: World = {
      ...recorded,
      history: {
        ...recorded.history,
        events: recorded.history.events.map((row) =>
          row.id === event.id
            ? { ...row, visibility: "private" as const }
            : row,
        ),
      },
    };
    expect(
      projectPersonDossier(
        hidden,
        personId,
        sheriff.personId,
      )!.publicCareer.map((row) => row.eventId),
    ).not.toContain(event.id);
    const unrelated = saveAct(
      world,
      personId,
      "justice.case-ended",
      sheriff.personId,
    );
    expect(
      scheduleCountyOfficeReflections(
        unrelated,
        unrelated.history.events.at(-1)!.id,
      ),
    ).toBe(unrelated);
    const scheduled = scheduleCountyOfficeReflections(recorded, event.id);
    const due = scheduled.history.futureDueItems.find(
      (row) => row.stableKey === livedOutcomeReflectionKey(personId, event.id),
    )!;
    expect(
      countyOfficeOutcomeForReflection(
        { ...scheduled, currentDate: addDays(event.occurredAt, -1) },
        due,
      ),
    ).toBeNull();
    const noSubject: HistoricalEvent = { ...event, participants: [] };
    expect(countyOfficeAffectedPeople(recorded, noSubject)).toEqual([]);
  }, 30_000);
});
