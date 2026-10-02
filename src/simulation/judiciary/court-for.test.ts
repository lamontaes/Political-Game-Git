import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { addDays } from "../dates";
import { currentLifeCutoff } from "../life-queries";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
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
import {
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  enterPlea,
  UNRESEARCHED_PROSECUTION,
} from "../justice/prosecution";
import { sentencingJudge, type CourtCase } from "../justice/court-reasoning";
import { createProsecutionTransitionRegistry } from "../justice/prosecution-transitions";
import { courtFor } from "./court-for";
import {
  courtsForJurisdiction,
  seatHolderAt,
  seatsForCourt,
  vacateJudicialSeat,
} from "./courts";
import { reviewingCourt } from "./judicial-review";

const SEED = "team9-a100-saved-court-finder-20261001";
let opened: World | null = null;
function world(): World {
  opened ??= openObserverWorld(observerSetup(SEED)).world;
  return opened;
}
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A100_PROOF_PATH)
    writeFileSync(
      process.env.A100_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("one finder reads saved courts", () => {
  it("routes a recorded county to its sourced federal district and circuit, never residence or ID order", () => {
    const base = world();
    const venue = searchLifePlaces("San Francisco", 100, {
      stateJurisdictionKey: "US-CA",
      scope: "county",
    })[0]!;
    expect(venue).toBeDefined();
    const district = courtFor(
      base,
      venue.context.jurisdiction.id,
      "federal-district",
      "criminal",
    );
    expect(district?.sourceRecordId).toBe("d-california-northern");
    const circuit = courtFor(
      base,
      venue.context.jurisdiction.id,
      "federal-appellate",
      "criminal",
    );
    expect(circuit?.courtId).toBe(district?.parentCourtId);
    expect(circuit?.level).toBe("federal-appellate");
    expect(
      courtFor(
        base,
        stateJurisdictionForKey("US-CA")!.id,
        "federal-district",
        "criminal",
      ),
    ).toBeNull();
    const absent = {
      ...base,
      judiciary: {
        ...base.judiciary!,
        courts: Object.fromEntries(
          Object.entries(base.judiciary!.courts).filter(
            ([, court]) => court.courtId !== district!.courtId,
          ),
        ),
      },
    };
    expect(
      courtFor(
        absent,
        venue.context.jurisdiction.id,
        "federal-district",
        "criminal",
      ),
    ).toBeNull();
    const oneWrongDistrict = {
      ...base,
      judiciary: {
        ...base.judiciary!,
        courts: Object.fromEntries(
          Object.entries(base.judiciary!.courts).filter(
            ([, court]) =>
              court.level !== "federal-district" ||
              court.sourceRecordId === "d-california-southern",
          ),
        ),
      },
    };
    expect(
      courtFor(
        oneWrongDistrict,
        venue.context.jurisdiction.id,
        "federal-district",
        "criminal",
      ),
    ).toBeNull();
  });
  it("leaves qualified county portions unresolved without saved boundary evidence", () => {
    const base = world();
    for (const name of ["Moore", "Scotland"]) {
      const venue = searchLifePlaces(name, 100, {
        stateJurisdictionKey: "US-NC",
        scope: "county",
      })[0]!;
      expect(venue).toBeDefined();
      expect(
        courtFor(
          base,
          venue.context.jurisdiction.id,
          "federal-district",
          "criminal",
        ),
      ).toBeNull();
    }
  });

  it("retains the existing trial court family in all 56 places", () => {
    const base = world();
    for (const state of lifePlaceStateIdentities()) {
      const id = stateJurisdictionForKey(state.jurisdictionKey)!.id;
      const old = courtsForJurisdiction(
        base,
        chiefExecutiveJurisdiction(state.jurisdictionKey.slice(3))!.id,
      ).filter((court) => court.level === "local-general-trial");
      expect(old, state.jurisdictionKey).toHaveLength(1);
      expect(courtFor(base, id, "local-general-trial", "criminal")).toBe(
        old[0],
      );
      expect(courtFor(base, id, "local-general-trial", "civil")).toBe(old[0]);
      expect(
        courtFor(
          base,
          old[0]!.jurisdictionId!,
          "local-general-trial",
          "criminal",
        ),
        `${state.jurisdictionKey}: saved court venue`,
      ).toBe(old[0]);
    }
  });

  it("routes national review to the saved Supreme Court without assigning a district", () => {
    const base = world();
    const supreme = Object.values(base.judiciary!.courts).filter(
      (court) => court.level === "federal-supreme",
    );
    expect(supreme).toHaveLength(1);
    expect(reviewingCourt(base, NATIONAL_ELECTION_JURISDICTION.id)).toBe(
      supreme[0],
    );
    expect(
      courtFor(
        base,
        NATIONAL_ELECTION_JURISDICTION.id,
        "federal-district",
        "criminal",
      ),
    ).toBeNull();
    expect(
      courtFor(
        base,
        NATIONAL_ELECTION_JURISDICTION.id,
        "local-general-trial",
        "criminal",
      ),
    ).toBeNull();
    const absent: World = {
      ...base,
      judiciary: {
        ...base.judiciary!,
        courts: Object.fromEntries(
          Object.entries(base.judiciary!.courts).filter(
            ([, court]) => court.level !== "federal-supreme",
          ),
        ),
      },
    };
    expect(
      reviewingCourt(absent, NATIONAL_ELECTION_JURISDICTION.id),
    ).toBeNull();
  });

  const states = pickDistinct(
    new SeededRng(SEED),
    lifePlaceStateIdentities(),
    5,
  );
  it.each(states)(
    "the actual saved venue owns the criminal judge in $jurisdictionKey",
    (state) => {
      let base = world();
      for (const item of base.history.futureDueItems) {
        if (
          futureDueItemStateAt(base, item.id, currentLifeCutoff(base))
            ?.status !== "scheduled"
        )
          continue;
        base = cancelFutureDueItem(base, {
          stableKey: `a100-isolate:${item.id}`,
          dueItemId: item.id,
          effectiveAt: base.currentDate,
          reasonKey: "fixture:isolated-court",
          context:
            "Retain unrelated commitments while isolating this saved case.",
        });
      }
      const place = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      })[0]!;
      const court = courtFor(
        base,
        stateJurisdictionForKey(state.jurisdictionKey)!.id,
        "local-general-trial",
        "criminal",
      )!;
      expect(court).toBeDefined();
      const venue = court.jurisdictionId!;
      expect(base.jurisdictions[venue]).toBeDefined();
      const defendantId = base.personOrder.find(
        (id) =>
          !seatsForCourt(base, court.courtId).some(
            (seat) => seatHolderAt(base, seat.seatId)?.personId === id,
          ),
      )!;
      const referred = referForProsecution(base, {
        stableKey: `a100:${state.jurisdictionKey}`,
        subjectPersonId: defendantId,
        jurisdictionId: venue,
        offenseKey: "crime:robbery",
        evidence: "documentary",
        standingFindings: 6,
        basisEventIds: [],
        referredBy: { kind: "police", label: "police", personId: null },
      });
      const referral = referred.world.history.events.find(
        (event) => event.id === referred.referralId,
      )!;
      const input: CourtCase = {
        caseKey: referral.stableKey,
        defendantId,
        offenseKey: "crime:robbery",
        offenseLabel: "robbery",
        evidence: "documentary",
        standingFindings: 6,
        venueJurisdictionId: referral.jurisdictionId,
        stateKey: null,
      };
      const judge = sentencingJudge(referred.world, input, 0);
      expect(judge).not.toBeNull();
      expect(
        seatsForCourt(base, court.courtId).some(
          (seat) => seatHolderAt(base, seat.seatId)?.personId === judge,
        ),
      ).toBe(true);
      expect(
        sentencingJudge(
          referred.world,
          {
            ...input,
            venueJurisdictionId: null,
            stateKey: state.jurisdictionKey,
          },
          0,
        ),
      ).toBeNull();
      let unseated = referred.world;
      for (const seat of seatsForCourt(base, court.courtId)) {
        if (!seatHolderAt(unseated, seat.seatId)) continue;
        unseated = vacateJudicialSeat(unseated, {
          seatId: seat.seatId,
          vacatedAt: unseated.currentDate,
          reason: "resignation",
        });
      }
      expect(sentencingJudge(unseated, input, 0)).toBeNull();
      const dueAt = addDays(
        base.currentDate,
        UNRESEARCHED_PROSECUTION.chargeDecisionDays,
      );
      const charged = resolveFutureDueItemsThrough(
        referred.world,
        dueAt,
        createProsecutionTransitionRegistry(),
      );
      const charges = charged.history.events.filter(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT &&
          event.involvedEntityIds.includes(defendantId),
      );
      expect(charges).toHaveLength(1);
      const pending = resolveFutureDueItemsThrough(
        unseated,
        dueAt,
        createProsecutionTransitionRegistry(),
      );
      const chargedPlea = enterPlea(charged, {
        personId: defendantId,
        referralId: referral.id,
        plea: "guilty",
      });
      const pendingPlea = enterPlea(pending, {
        personId: defendantId,
        referralId: referral.id,
        plea: "guilty",
      });
      expect(chargedPlea.ok).toBe(true);
      expect(pendingPlea.ok).toBe(true);
      const trialAt = addDays(dueAt, UNRESEARCHED_PROSECUTION.resolveAfterDays);
      const sentenced = resolveFutureDueItemsThrough(
        chargedPlea.world,
        trialAt,
        createProsecutionTransitionRegistry(),
      );
      const stillPending = resolveFutureDueItemsThrough(
        pendingPlea.world,
        trialAt,
        createProsecutionTransitionRegistry(),
      );
      const sentences = sentenced.history.events.filter(
        (event) =>
          event.type === PROSECUTION_SENTENCED_EVENT &&
          event.involvedEntityIds.includes(defendantId),
      );
      expect(sentences).toHaveLength(1);
      const sentenceJudgeId = sentences[0]!.participants.find(
        (participant) => participant.role === "agency:decided",
      )?.personId;
      expect(sentenceJudgeId).toBeDefined();
      expect(
        seatsForCourt(sentenced, court.courtId, trialAt).some(
          (seat) =>
            seatHolderAt(sentenced, seat.seatId, trialAt)?.personId ===
            sentenceJudgeId,
        ),
      ).toBe(true);
      expect(
        stillPending.history.events.filter(
          (event) =>
            event.type === PROSECUTION_SENTENCED_EVENT &&
            event.involvedEntityIds.includes(defendantId),
        ),
      ).toHaveLength(0);
      const saved = deserializeWorld(serializeWorld(sentenced));
      assertWorldIntegrity(saved);
      expect(
        resolveFutureDueItemsThrough(
          saved,
          trialAt,
          createProsecutionTransitionRegistry(),
        ).history.events,
      ).toEqual(sentenced.history.events);
      receipts.push({
        seed: SEED,
        place: place.key,
        state: state.jurisdictionKey,
        defendantId,
        name: personName(charged.people[defendantId]!),
        courtId: court.courtId,
        judgeId: judge,
        judgeName: personName(charged.people[judge!]!),
        referralId: referral.id,
        chargeId: charges[0]!.id,
        sentenceId: sentences[0]!.id,
        sentenceJudgeId,
        sentenceJudgeName: personName(sentenced.people[sentenceJudgeId!]!),
        sentenceSummary: sentences[0]!.summary,
        sentenceMotivation: sentences[0]!.context.motivation,
        trialAt,
        venueJurisdictionId: venue,
        dueAt,
        missingJudgePending: true,
        missingVenueSelectorNull: true,
        repeatReload: true,
      });
    },
  );
});
