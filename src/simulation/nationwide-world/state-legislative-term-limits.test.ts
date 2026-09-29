import { describe, expect, it } from "vitest";

import { stateCandidacyPack } from "../candidacy-packs";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import {
  LEGISLATIVE_TERM_LIMIT_QUESTION,
  MOST_COMMON_LEGISLATIVE_TERM_LIMIT,
  legislativeTermLimitBar,
  legislativeTermLimitInForce,
} from "./state-legislative-term-limits";
import {
  STATE_LEGISLATURE_KEYS,
  STATE_LEGISLATURE_OPENING_VERSION,
} from "./state-legislature-opening";

const PROPOSITION = "proposition_term-limits" as EntityId;

/**
 * One member seated in a state's lower chamber since `since`, and any laws on
 * term limits the state enacted in play. Only the fields the readers use.
 */
function worldWith(
  usps: string,
  since: IsoDate,
  laws: readonly { answer: "yes" | "no"; effectiveAt: IsoDate }[] = [],
) {
  const pack = stateCandidacyPack(`US-${usps}`)!;
  const officeKey = pack.offices[0]!.officeKey;
  const state = stateJurisdictionForKey(`US-${usps}`)!.id;
  const world = {
    id: "world_term-limits",
    currentDate: "2026-10-01",
    policyCatalog: {
      propositions: {
        [PROPOSITION]: {
          id: PROPOSITION,
          stableKey: LEGISLATIVE_TERM_LIMIT_QUESTION,
        },
      },
      propositionOrder: [PROPOSITION],
    },
    history: {
      nextSequence: 100,
      legislativeAmendments: [],
      legislativeMeasures: laws.map((law, index) => ({
        id: `legislative-measure_${index}`,
        sequence: 10 + index * 2,
        jurisdictionId: state,
        propositionIds: [PROPOSITION],
        propositionAnswers: [
          { propositionId: PROPOSITION, answer: law.answer },
        ],
      })),
      legislativeEnactments: laws.map((law, index) => ({
        id: `legislative-enactment_${index}`,
        sequence: 11 + index * 2,
        measureId: `legislative-measure_${index}`,
        outcome: "enacted",
        resolvedAt: law.effectiveAt,
        effectiveAt: law.effectiveAt,
      })),
      workRelationships: [
        {
          id: "work-relationship_member",
          stableKey: `${STATE_LEGISLATURE_OPENING_VERSION}:${officeKey}:seat:1:tenure`,
          personId: "person_member",
          organizationId: createStableId(
            "organization",
            `world_term-limits:${STATE_LEGISLATURE_KEYS.body(pack.packId)}`,
          ),
          kind: "employment:legislative-member",
          startedAt: since,
        },
      ],
      workStatuses: [],
    },
  } as unknown as World;
  return { world, packId: pack.packId, officeKey };
}

function bar(
  usps: string,
  since: IsoDate,
  laws?: Parameters<typeof worldWith>[2],
) {
  const { world, packId, officeKey } = worldWith(usps, since, laws);
  return legislativeTermLimitBar(world, {
    stateUsps: usps,
    packId,
    officeKey,
    personId: "person_member" as EntityId,
    termStartsAt: "2027-01-01" as IsoDate,
    termEndsAt: "2029-01-01" as IsoDate,
  });
}

describe("state legislative term limits follow the law in force", () => {
  it("bars a Florida member whose next term would pass eight years in the chamber", () => {
    // Seven years served, plus a two-year term, is nine.
    expect(bar("FL", "2020-01-01")).toContain(
      "the state's limit is 8 (Fla. Const. art. VI, § 4(b))",
    );
    // Five years served, plus two, is seven: they may stand.
    expect(bar("FL", "2022-01-01")).toBeNull();
  });

  it("lifts the limit once a repeal takes effect, and imposes one where a state enacts it", () => {
    expect(
      bar("FL", "2020-01-01", [{ answer: "no", effectiveAt: "2026-07-01" }]),
    ).toBeNull();
    // Virginia began with no limit.
    expect(bar("VA", "2014-01-01")).toBeNull();
    const enacted = [
      { answer: "yes" as const, effectiveAt: "2026-07-01" as IsoDate },
    ];
    const { world } = worldWith("VA", "2014-01-01", enacted);
    expect(
      legislativeTermLimitInForce(world, "VA", "2027-01-01" as IsoDate),
    ).toBe(MOST_COMMON_LEGISLATIVE_TERM_LIMIT);
    expect(bar("VA", "2014-01-01", enacted)).toContain(
      "they have served 13 years in this chamber",
    );
    // A law not yet in force bars nobody.
    expect(
      bar("VA", "2014-01-01", [{ answer: "yes", effectiveAt: "2027-06-01" }]),
    ).toBeNull();
  });

  it("counts every year in the legislature where the limit is a lifetime total", () => {
    // Oklahoma: twelve years in the House and Senate combined.
    expect(bar("OK", "2016-01-01")).toContain(
      "they have served 11 years in the legislature, and the state's limit is 12",
    );
    expect(bar("OK", "2019-01-01")).toBeNull();
  });
});
