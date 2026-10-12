/** Test-only same-World raw-fact and separately owned rule-receipt collector. */

import { STATES } from "../../../simulation/state-reference";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../../simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../../simulation/national-election-geography";
import { chiefExecutiveJurisdictionId } from "../../../simulation/nationwide-world/government-jurisdiction";
import { unincorporatedCountyJurisdictionIds } from "../../../simulation/nationwide-world/local-governments";

import { mayAnswerQuestion } from "../../../simulation/governing/question-authority";
import * as constitution from "../../../simulation/constitutional-process";

import type { makeIsoDate } from "../../../simulation/dates";
import startingLaw from "../../../../data/research/laws/starting-law-2026/index";
import sessions from "../../../../data/research/laws/state-session-calendars-2026.json";
import { authorityReceiptKey, type LawFacts } from "../dated-law";

import type {
  EntityId,
  HistoricalCutoff,
  World,
} from "../../../simulation/types";
import type { StatuteFacts } from "../../legislatures/statute-date-dependency";
export function lawFacts(
  world: World,
  questions: readonly EntityId[],
  dates: readonly ReturnType<typeof makeIsoDate>[],
  cutoffs: readonly (HistoricalCutoff | undefined)[],
): LawFacts {
  const states = new Map(
    Object.keys(STATES).flatMap((usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`);
      return state ? [[`US-${usps}`, state] as const] : [];
    }),
  );
  const ids = [
    ...new Set([
      ...world.jurisdictionOrder,
      ...[...states.values()].map((s) => s.id),
      NATIONAL_ELECTION_JURISDICTION.id,
    ]),
  ];
  const authority = new Map<string, boolean>();
  // Authority belongs to the separately lifted legislature shelf. This is its dated upstream receipt, not preselected controlling law.
  for (const id of ids)
    for (const question of questions)
      for (const date of dates)
        for (const cutoff of cutoffs)
          authority.set(
            authorityReceiptKey(id, question, date, cutoff),
            mayAnswerQuestion(world, id, question, date, cutoff),
          );
  const measures = world.history.constitutionalMeasures ?? [];
  return {
    onDate: world.currentDate,
    nextSequence: world.history.nextSequence,
    measures: world.history.legislativeMeasures ?? [],
    enactments: world.history.legislativeEnactments ?? [],
    provisions: world.history.legislativeProvisions ?? [],
    itemVetoes: world.history.itemVetoes ?? [],
    events: world.history.events,
    adjournments: world.history.sessionAdjournments ?? [],
    constitutionalMeasures: measures,
    policyCatalog: world.policyCatalog,
    startingLaw: startingLaw as unknown as LawFacts["startingLaw"],
    statute: {
      rules: startingLaw.effectiveDates.rules as StatuteFacts["rules"],
      sessionEnds: sessions.sessionEnds as StatuteFacts["sessionEnds"],
    },
    federalId: NATIONAL_ELECTION_JURISDICTION.id,
    stateKeys: Object.keys(STATES),
    states,
    startingPlaceKeys: new Map([
      [NATIONAL_ELECTION_JURISDICTION.id, "US"],
      ...[...states].map(([key, s]) => [s.id, key] as const),
    ]),
    placeContexts: new Map(
      ids.flatMap((id) => {
        const row = lifePlaceByJurisdictionId(id);
        return row
          ? [[id, { stateJurisdictionKey: row.stateJurisdictionKey }] as const]
          : [];
      }),
    ),
    wholeGovernmentIds: new Map(
      Object.keys(STATES).flatMap((usps) => {
        const id = chiefExecutiveJurisdictionId(usps);
        return id ? [[usps, id] as const] : [];
      }),
    ),
    counties: new Map(
      ids.map((id) => [id, unincorporatedCountyJurisdictionIds(id)]),
    ),
    authority,
    constitutional: {
      onDate: world.currentDate,
      policyCatalog: world.policyCatalog,
      measures,
      positions: new Map(
        measures.map((measure) => [
          measure.id,
          {
            onDate: world.currentDate,
            measure,
            actions: world.history.constitutionalActions ?? [],
            enactments: world.history.legislativeEnactments ?? [],
            articleVStateKeys: constitution.ARTICLE_V_STATE_KEYS,
            conventionBodyKey: constitution.ARTICLE_V_CONVENTION_BODY,
            stateProfile: constitution.stateAmendmentProfile(
              measure.jurisdictionKey,
            ),
          },
        ]),
      ),
    },
  };
}
