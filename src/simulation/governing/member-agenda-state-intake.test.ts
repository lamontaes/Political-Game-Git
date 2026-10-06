import { beforeAll, describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { stateJurisdictionForKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { fileMemberAgendaBills, fileMemberAgendaBill } from "./member-agenda";
import { createFormationContext, recordPrinciples } from "../politics";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import {
  US_STATE_USPS,
  stateExecutiveIdentity,
} from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { seatedChamberForPack } from "./chamber-votes";
import { principledLeaning } from "./officeholder-principles";
import { governingSeasonHandler } from "./state-governing";
import {
  scheduleNationwideStateBillSeasons,
  GOVERNING_SEASON,
} from "./governing-calendar";
import { regularSessionYearForWorld } from "../legislative-procedure-world";
import type { World } from "../types";

let world: World;
beforeAll(() => {
  const demo = createDemoWorld("g1-state-intake-parity");
  const jurisdictions = new Map(
    demo.jurisdictionOrder.map((id) => [id, demo.jurisdictions[id]!]),
  );
  for (const place of CHIEF_EXECUTIVE_JURISDICTIONS) {
    const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
    jurisdictions.set(jurisdiction.id, jurisdiction);
  }
  world = createWorld({
    seed: "g1-state-intake-parity",
    currentDate: makeIsoDate("2026-02-01"),
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: createProductionPolicyCatalog(),
  });
});

describe("state intake requires an actual seated sponsor, everywhere", () => {
  expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "never invents a sponsor in %s",
    (place) => {
      const jurisdictionId = stateJurisdictionForKey(`US-${place}`)!.id;
      const next = fileMemberAgendaBills(world, {
        jurisdictionId,
        intakeKey: `g1-state-intake:${place}`,
      });
      expect(next).toBe(world);
      expect(next.history.legislativeMeasures ?? []).toHaveLength(0);
      expect(next.personOrder).toEqual(world.personOrder);
    },
  );
  it("the actual state intake files exactly the shared agenda with named seated sponsors", () => {
    const demo = createDemoWorld("g1-real-state-sponsor");
    let start = createWorld({
      seed: "g1-real-state-sponsor",
      currentDate: makeIsoDate("2026-02-14"),
      people: demo.personOrder.map((id) => demo.people[id]!),
      jurisdictions: world.jurisdictionOrder.map(
        (id) => world.jurisdictions[id]!,
      ),
      policyCatalog: createProductionPolicyCatalog(),
    });
    start = ensureWorldStartingConditions(start, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    const active = US_STATE_USPS.filter((place) =>
      regularSessionYearForWorld(
        start,
        stateJurisdictionForKey(`US-${place}`)!.id,
        2026,
      ),
    );
    const place = new SeededRng("g1-real-state-sponsor").pick(active);
    const jurisdictionId = stateJurisdictionForKey(`US-${place}`)!.id;
    const officeKey = stateExecutiveIdentity(place)!.officeKey;
    const scheduled = scheduleNationwideStateBillSeasons(start, [place]);
    // Controlled saved-world snapshot on the already scheduled bill date.
    const onDate = makeIsoDate("2026-02-15");
    start = {
      ...scheduled,
      currentDate: onDate,
      currentMoment: { ...scheduled.currentMoment, date: onDate },
    };
    start = ensureStateLegislatureOpening(start, start.personOrder[0]!, place);
    const pack = legislativePackForJurisdiction(jurisdictionId)!;
    const members = pack.chambers.flatMap((chamber) =>
      seatedChamberForPack(
        start,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      )!.body.members.flatMap((member) =>
        member.personId ? [member.personId] : [],
      ),
    );
    start = recordPrinciples(
      start,
      members.flatMap((personId) =>
        start.policyCatalog.principleOrder.map((principleId) => ({
          stableKey: `g1-state-proof:${personId}:${principleId}`,
          personId,
          principleId,
          formedAt: start.currentDate,
          stance: "endorses",
          strength: 1,
          conviction: "settled",
          flexibility: "firm",
          qualification: null,
          formation: createFormationContext("experience:life", {
            note: "Explicit saved principles for this controlled filing fixture.",
          }),
          supersedesPrincipleRecordId: null,
        })),
      ),
    );

    const due = start.history.futureDueItems.find(
      (row) =>
        row.transitionKey === GOVERNING_SEASON &&
        row.dueAt === start.currentDate &&
        row.stableKey.includes(":bill:"),
    )!;
    expect(due).toBeDefined();
    const next = governingSeasonHandler(start, due).world;
    const expected = fileMemberAgendaBill(start, {
      jurisdictionId,
      intakeKey: `${officeKey}:${due.dueAt}`,
    });
    expect(next.history.legislativeMeasures).toEqual(
      expected.history.legislativeMeasures,
    );
    const bills = next.history.legislativeMeasures ?? [];
    expect(bills.length).toBeGreaterThan(0);
    expect(next.personOrder).toEqual(start.personOrder);
    for (const bill of bills) {
      expect(members).toContain(bill.sponsorPersonId);
      const answer = bill.propositionAnswers![0]!;
      const reasons = principledLeaning(
        start,
        bill.sponsorPersonId!,
        answer.propositionId,
      );
      expect(reasons.recordIds.length).toBeGreaterThan(0);
      expect(Math.abs(reasons.score)).toBeGreaterThanOrEqual(3);
    }
    expect(
      governingSeasonHandler(next, due).world.history.legislativeMeasures,
    ).toEqual(bills);
  });
});
