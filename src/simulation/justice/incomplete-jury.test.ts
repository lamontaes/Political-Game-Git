import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays } from "../dates";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceStateIdentities } from "../life-places";
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
const states = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);

describe("incomplete actual-person panels leave trials pending", () => {
  it("covers all 56 jurisdiction keys with the seeded rule", () => {
    expect(states).toHaveLength(56);
    expect(new Set(states.map((state) => state.jurisdictionKey)).size).toBe(56);
  });
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
          expect(eligible).toHaveLength(reasoning.UNRESEARCHED_JURY_PANEL.size);
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
      panelSize = reasoning.UNRESEARCHED_JURY_PANEL.size;
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
        panelContract: reasoning.UNRESEARCHED_JURY_PANEL,
        controlledSelector: true,
        smallWorldPeople: opening.world.personOrder.length,
        judgeId,
        courtId: court.courtId,
      });
    },
    30_000,
  );
});
