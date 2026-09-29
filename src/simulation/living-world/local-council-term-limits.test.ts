import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import { lifePlaceByKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import type { EntityId, IsoDate, World } from "../types";
import {
  COUNCIL_TERM_LIMIT_QUESTION,
  councilTermLimitBar,
} from "./local-council-term-limits";

const POLICY = createProductionPolicyCatalog();
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === COUNCIL_TERM_LIMIT_QUESTION,
)!;
const TOWN = lifePlaceByKey("3918000")!.context.jurisdiction.id;
const COUNCIL = "organization_council" as EntityId;
const MEMBER = "person_member" as EntityId;

/**
 * A member seated on the council for each stretch, and the town's ordinances
 * on council term limits. Only the fields the readers use.
 */
function worldWith(
  stretches: readonly { from: string; until?: string }[],
  laws: readonly { answer: "yes" | "no"; effectiveAt: string }[],
): World {
  return {
    currentDate: makeIsoDate("2027-10-01"),
    policyCatalog: POLICY,
    history: {
      nextSequence: 1000,
      organizationParticipations: stretches.map((stretch, index) => ({
        id: `participation_${index}`,
        personId: MEMBER,
        organizationId: COUNCIL,
        startedAt: stretch.from,
      })),
      organizationParticipationStates: stretches.flatMap((stretch, index) => [
        {
          id: `state_${index}_active`,
          sequence: index * 2 + 1,
          participationId: `participation_${index}`,
          effectiveAt: stretch.from,
          status: "active",
          roleKind: "leader:municipal-member",
        },
        ...(stretch.until
          ? [
              {
                id: `state_${index}_ended`,
                sequence: index * 2 + 2,
                participationId: `participation_${index}`,
                effectiveAt: stretch.until,
                status: "ended",
                roleKind: "leader:municipal-member",
              },
            ]
          : []),
      ]),
      legislativeMeasures: laws.map((law, index) => ({
        id: `measure_${index}`,
        sequence: 100 + index,
        jurisdictionId: TOWN,
        propositionIds: [QUESTION],
        propositionAnswers: [{ propositionId: QUESTION, answer: law.answer }],
      })),
      legislativeEnactments: laws.map((law, index) => ({
        id: `enactment_${index}`,
        sequence: 200 + index,
        measureId: `measure_${index}`,
        outcome: "enacted",
        resolvedAt: law.effectiveAt,
        effectiveAt: law.effectiveAt,
      })),
      legislativeAmendments: [],
    },
  } as unknown as World;
}

const bar = (world: World, termYears = 4) =>
  councilTermLimitBar(world, {
    town: TOWN,
    organizationId: COUNCIL,
    personId: MEMBER,
    termYears,
    termStartsAt: "2027-11-07" as IsoDate,
  });

describe("council term limits follow the town's own ordinance", () => {
  const limit = [{ answer: "yes" as const, effectiveAt: "2026-06-01" }];

  it("bars a member with two terms behind them, and lets a first-term member stand", () => {
    expect(bar(worldWith([{ from: "2019-11-07" }], limit))).toBe(
      "they have served 8 years in a row on the council, and the town's limit is 2 consecutive terms of 4 years.",
    );
    expect(bar(worldWith([{ from: "2023-11-07" }], limit))).toBeNull();
  });

  it("bars nobody where no ordinance limits terms, or after the town repeals its limit", () => {
    expect(bar(worldWith([{ from: "2011-11-07" }], []))).toBeNull();
    expect(
      bar(
        worldWith(
          [{ from: "2011-11-07" }],
          [...limit, { answer: "no", effectiveAt: "2027-01-01" }],
        ),
      ),
    ).toBeNull();
  });

  it("counts only unbroken service, so a member may return after a break", () => {
    // Eight years, then four years off, then back since 2023.
    const returned = worldWith(
      [{ from: "2007-11-07", until: "2015-11-07" }, { from: "2023-11-07" }],
      limit,
    );
    expect(bar(returned)).toBeNull();
  });

  it("counts shorter terms by their own length", () => {
    // Two-year terms: four years served makes two full terms.
    expect(bar(worldWith([{ from: "2023-11-07" }], limit), 2)).toContain(
      "limit is 2 consecutive terms of 2 years",
    );
  });
});
