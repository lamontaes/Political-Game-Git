import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays } from "../dates";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import { juryCountyForPlace } from "./jury-catchment";
import { courtFor } from "../judiciary/court-for";
import {
  buildOpeningCourtCatalog,
  seatJudge,
  seatsForCourt,
} from "../judiciary/courts";
import { pickDistinct, SeededRng } from "../rng";
import { personName } from "../people";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import type { World } from "../types";
import * as reasoning from "./court-reasoning";
import {
  advanceProsecutions,
  enterPlea,
  referForProsecution,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";

const SEED = "team9-a100-saved-court-finder-20261001";
const receipts: unknown[] = [];
afterEach(() => vi.restoreAllMocks());
afterAll(() => {
  if (process.env.A105_PROOF_PATH)
    writeFileSync(
      process.env.A105_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});
const states = pickDistinct(new SeededRng(SEED), lifePlaceStateIdentities(), 5);

describe("incomplete actual-person panels leave trials pending", () => {
  it.each(states)(
    "keeps the original case pending in $jurisdictionKey",
    (state) => {
      const opening = smallWorld({
        place: state.jurisdictionKey,
        people: 40,
        seed: SEED,
        date: "2026-01-01",
      });
      let base = buildOpeningCourtCatalog(opening.world);
      const court = courtFor(
        base,
        opening.jurisdictionId,
        "local-general-trial",
        "criminal",
      )!;
      expect(court).toBeDefined();
      const judgeId = base.personOrder.at(-1)!;
      const seat = seatsForCourt(base, court.courtId)[0]!;
      base = seatJudge(base, {
        seatId: seat.seatId,
        personId: judgeId,
        startedAt: base.currentDate,
        selection: {
          path: "initial-world",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: "Authored small-world court fixture; actual generated resident seated through seatJudge.",
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
      for (const item of base.history.futureDueItems)
        if (
          futureDueItemStateAt(base, item.id, currentLifeCutoff(base))
            ?.status === "scheduled"
        )
          base = cancelFutureDueItem(base, {
            stableKey: `a105-isolate:${item.id}`,
            dueItemId: item.id,
            effectiveAt: base.currentDate,
            reasonKey: "fixture:isolated-court",
            context:
              "Preserve unrelated commitments while isolating this existing trial.",
          });
      const personId = base.personOrder[0]!;
      const referred = referForProsecution(base, {
        stableKey: `a105:${state.jurisdictionKey}`,
        subjectPersonId: personId,
        jurisdictionId: opening.jurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary",
        standingFindings: 6,
        basisEventIds: [],
        referredBy: { kind: "police", label: "police", personId: null },
      });
      const chargedAt = addDays(
        base.currentDate,
        prosecutionTimingFor(state.jurisdictionKey).chargeDecisionDays,
      );
      const charged = resolveFutureDueItemsThrough(
        referred.world,
        chargedAt,
        createProsecutionTransitionRegistry(),
      );
      const plea = enterPlea(charged, {
        personId,
        referralId: referred.referralId,
        plea: "not-guilty",
      });
      expect(plea.ok).toBe(true);
      const trialAt = addDays(
        chargedAt,
        prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
      );
      // Restrict the real eligible panel at the existing selector boundary. No
      // person, residence, eligibility or trial result is manufactured.
      const original = reasoning.empanelJury;
      let panelSize = 7;
      let selected: readonly string[] = [];
      const spy = vi
        .spyOn(reasoning, "empanelJury")
        .mockImplementation((w, c, n) => {
          const eligible = original(w, c, n);
          expect(eligible).toHaveLength(reasoning.JURY_PANEL_ESTIMATE.size);
          selected = eligible.slice(0, panelSize);
          return eligible.slice(0, panelSize);
        });
      const pending = resolveFutureDueItemsThrough(
        plea.world,
        trialAt,
        createProsecutionTransitionRegistry(),
      );
      expect(spy).toHaveBeenCalled();
      expect(selected).toHaveLength(7);
      const belongs = (e: World["history"]["events"][number]) =>
        e.tags.includes(`justice.referral:${referred.referralId}`);
      const trialEvents = (w: World) =>
        w.history.events.filter(
          (e) =>
            belongs(e) &&
            [
              "justice.case-ended",
              "justice.sentenced",
              "justice.mistrial",
            ].includes(e.type),
        );
      expect(trialEvents(pending)).toEqual([]);
      expect(
        pending.history.decisionTraces.filter((d) =>
          d.context.stableKey.includes(`:trial:`),
        ),
      ).toEqual([]);
      assertWorldIntegrity(pending);
      const reopened = deserializeWorld(serializeWorld(pending));
      const repeated = advanceProsecutions(reopened);
      expect(repeated.history.events).toEqual(pending.history.events);
      panelSize = 0;
      const empty = advanceProsecutions(repeated);
      expect(trialEvents(empty)).toEqual([]);
      expect(empty.history.events).toEqual(pending.history.events);
      // A real complete panel resumes the original saved case without a new
      // referral, fake verdict, timing rule or polling schedule.
      panelSize = reasoning.JURY_PANEL_ESTIMATE.size;
      const resumed = advanceProsecutions(empty);
      expect(trialEvents(resumed).length).toBeGreaterThan(0);
      assertWorldIntegrity(resumed);
      receipts.push({
        seed: SEED,
        state: state.jurisdictionKey,
        name: personName(base.people[personId]!),
        personId,
        referralId: referred.referralId,
        trialAt,
        sevenPersonPending: true,
        emptyPanelPending: true,
        replayPreservesCase: true,
        completePanelResumed: true,
        panelContract: reasoning.JURY_PANEL_ESTIMATE,
        controlledSelector: true,
        smallWorldPeople: opening.world.personOrder.length,
        judgeId,
        courtId: court.courtId,
      });
    },
    30_000,
  );
});

describe("small towns summon a complete estimated county jury", () => {
  it.each(states)(
    "tries the smallest sourced town in $jurisdictionKey",
    (state) => {
      const smallest = searchLifePlaces("", 50000, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      })
        .flatMap((place) => {
          const population = place.sourceGeoid
            ? placeReferencePopulation(place.sourceGeoid)?.value
            : null;
          return population && population > 0 ? [{ ...place, population }] : [];
        })
        .sort(
          (a, b) => a.population - b.population || a.key.localeCompare(b.key),
        )[0]!;
      expect(smallest).toBeDefined();
      const opening = smallWorld({
        place: smallest.key,
        people: 3,
        seed: SEED,
        date: "2026-01-01",
      });
      let base = buildOpeningCourtCatalog(opening.world);
      const court = courtFor(
        base,
        opening.jurisdictionId,
        "local-general-trial",
        "criminal",
      )!;
      expect(court).toBeDefined();
      const judgeId = base.personOrder.at(-1)!;
      const seat = seatsForCourt(base, court.courtId)[0]!;
      base = seatJudge(base, {
        seatId: seat.seatId,
        personId: judgeId,
        startedAt: base.currentDate,
        selection: {
          path: "initial-world",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: "Authored small-world court fixture; actual generated resident seated through seatJudge.",
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
      for (const item of base.history.futureDueItems)
        if (
          futureDueItemStateAt(base, item.id, currentLifeCutoff(base))
            ?.status === "scheduled"
        )
          base = cancelFutureDueItem(base, {
            stableKey: `a105-isolate:${item.id}`,
            dueItemId: item.id,
            effectiveAt: base.currentDate,
            reasonKey: "fixture:isolated-court",
            context:
              "Preserve unrelated commitments while isolating this existing trial.",
          });
      const personId = base.personOrder[0]!;
      const referred = referForProsecution(base, {
        stableKey: `a105-county:${state.jurisdictionKey}`,
        subjectPersonId: personId,
        jurisdictionId: opening.jurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary",
        standingFindings: 6,
        basisEventIds: [],
        referredBy: { kind: "police", label: "police", personId: null },
      });
      const chargedAt = addDays(
        base.currentDate,
        prosecutionTimingFor(state.jurisdictionKey).chargeDecisionDays,
      );
      const charged = resolveFutureDueItemsThrough(
        referred.world,
        chargedAt,
        createProsecutionTransitionRegistry(),
      );
      const plea = enterPlea(charged, {
        personId,
        referralId: referred.referralId,
        plea: "not-guilty",
      });
      expect(plea.ok).toBe(true);
      const trialAt = addDays(
        chargedAt,
        prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
      );

      const tried = resolveFutureDueItemsThrough(
        plea.world,
        trialAt,
        createProsecutionTransitionRegistry(),
      );
      const trialTraces = tried.history.decisionTraces.filter(
        (trace) =>
          trace.context.stableKey.includes(`:trial:`) &&
          trace.context.stableKey.includes(`:juror:`),
      );
      const jurors = [
        ...new Set(trialTraces.map((trace) => trace.context.actorPersonId)),
      ];
      expect(jurors).toHaveLength(reasoning.JURY_PANEL_ESTIMATE.size);
      const county = juryCountyForPlace(opening.jurisdictionId);
      expect(county).not.toBeNull();
      for (const id of jurors) {
        expect(id).not.toBeNull();
        expect(juryCountyForPlace(tried.people[id!]!.homeJurisdictionId)).toBe(
          county,
        );
      }
      const outcome = tried.history.events.find(
        (event) =>
          event.tags.includes(`justice.referral:${referred.referralId}`) &&
          [
            "justice.case-ended",
            "justice.sentenced",
            "justice.mistrial",
          ].includes(event.type),
      );
      expect(outcome).toBeDefined();
      expect(outcome!.tags).toContain(`justice.jury-catchment:${county}`);
      expect(outcome!.tags).toContain(
        "justice.jury-catchment-basis:estimated-county-default",
      );
      expect(outcome!.tags).toContain(
        `justice.jury-panel-basis:${reasoning.JURY_PANEL_ESTIMATE.provenance}`,
      );
      expect(tried.personOrder.length).toBeGreaterThan(base.personOrder.length);
      assertWorldIntegrity(tried);
      const reopened = deserializeWorld(serializeWorld(tried));
      const repeated = advanceProsecutions(reopened);
      expect(repeated.history.events).toEqual(tried.history.events);
      expect(repeated.personOrder).toEqual(tried.personOrder);
      receipts.push({
        state: state.jurisdictionKey,
        town: smallest.key,
        population: smallest.population,
        county,
        catchmentBasis: "estimated-county-catchment",
        personId,
        name: personName(tried.people[personId]!),
        referralId: referred.referralId,
        trialAt,
        outcomeId: outcome!.id,
        outcomeType: outcome!.type,
        jurors,
        panelContract: reasoning.JURY_PANEL_ESTIMATE,
        generatedPeople: tried.personOrder.length - base.personOrder.length,
      });
    },
    30_000,
  );
});
