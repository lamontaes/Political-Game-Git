import { governorOfficeForJurisdiction } from "./governing/state-governing";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import {
  seatBodyForPack,
  authoredScenarioSeatCount,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { chamberByKey } from "./legislature-rules";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { addDays } from "./dates";
import { introduceMeasure } from "./legislation";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { operativeDateForEnactment } from "./legislative-effective-date";
import { enactmentOperative, lawInForce } from "./governing/law-in-force";
import {
  enactedRuleChanges,
  enactedRuleChangeAt,
  fileRuleChangeProvision,
  enactmentStatuteDateContext,
} from "./enacted-rule-changes";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { stateJurisdictionForKey } from "./life-places";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { LegislativeEnactmentRecord } from "./types";

const seed = "a83-rule-change-date-all56-20261001";
const places = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((usps) => {
  const key = `US-${usps}`;
  const jurisdiction = stateJurisdictionForKey(key);
  const pack = jurisdiction && legislativePackForJurisdiction(jurisdiction.id);
  return pack
    ? [
        {
          key,
          pack,
          rank: createHash("sha256").update(`${seed}:${key}`).digest("hex"),
        },
      ]
    : [];
})
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function fixture(
  key: string,
  pack: NonNullable<ReturnType<typeof legislativePackForJurisdiction>>,
  dateFields: Partial<LegislativeEnactmentRecord>,
) {
  let world = smallWorld({ place: key, seed, offices: ["governor"] }).world;
  const jurisdiction = stateJurisdictionForKey(key)!;
  const holder = governorOfficeForJurisdiction(world, key)?.holderPersonId;
  if (!holder)
    throw new Error("Missing saved governor for date-reader fixture");
  world = { ...world, control: { kind: "person", personId: holder } };
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) =>
      row.stableKey ===
      "us-policy-positions:labor-workforce.raise-minimum-wage",
  );
  if (!proposition)
    throw new Error("Missing saved date-reader policy question");
  const chamber = chamberByKey(pack, pack.chamberOrder[0]!);
  world = introduceMeasure(world, {
    stableKey: "date-reader:bill",
    jurisdictionId: jurisdiction.id,
    rulePackId: pack.packId,
    designation: "Date reader bill",
    shortTitle: "Authored term change",
    summary: "Authored saved-record reader proof.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: null,
    originChamberKey: chamber.chamberKey,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const officeKey = `${pack.packId}:${chamber.chamberKey}`;
  world = fileRuleChangeProvision(world, {
    stableKey: "date-reader:term",
    measureId: measure.id,
    officeKey,
    field: "term.years",
    value: 3,
  });
  const bodies = pack.chambers.map((row) =>
    seatBodyForPack(
      row.chamberKey,
      row.name,
      authoredScenarioSeatCount(pack, row.chamberKey),
      [],
      true,
    ),
  );
  const votePlan: Record<string, { yea: number }> = {};
  for (const row of pack.chambers) {
    for (const committee of row.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 7,
      };
    for (const stage of row.floorStages)
      votePlan[votePlanKeyForFloor(row.chamberKey, stage.stageKey)] = {
        yea: bodies.find((body) => body.chamberKey === row.chamberKey)!.members
          .length,
      };
  }
  world = enactThroughDesk(world, measure.id, {
    context: {
      pack,
      measureId: measure.id,
      bodies,
      committeeMemberCount: 7,
      votePlan,
      governorAction: "signed",
      governorRationale:
        "Explicit authored passage fixture for the saved-date reader.",
    },
  });
  const recorded = world.history.legislativeEnactments!.at(-1)!;
  // Received date fields are authored; the passage and event history are canonical.
  const enactment: LegislativeEnactmentRecord = {
    ...recorded,
    ...dateFields,
    ...(dateFields.effectiveDateBasis === "game-default" &&
    dateFields.effectiveDateGameProfile
      ? {
          effectiveAt: addDays(
            recorded.resolvedAt,
            dateFields.effectiveDateGameProfile.days,
          ),
        }
      : {}),
    ...(dateFields.effectiveDateBasis === "source-default" ||
    dateFields.effectiveDateGameProfile?.version === ""
      ? { effectiveAt: null }
      : {}),
  };
  world = {
    ...world,
    history: {
      ...world.history,
      legislativeEnactments: world.history.legislativeEnactments!.map((row) =>
        row.id === recorded.id ? enactment : row,
      ),
    },
  };
  return {
    world,
    enactment,
    officeKey,
    jurisdictionId: jurisdiction.id,
    propositionId: proposition.id,
  };
}

describe("institutional rule changes share the saved enactment date", () => {
  it.each(places)(
    "honors profiles, explicit dates, missing dates and Continue in $key",
    ({ key, pack }) => {
      expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
      expect(places).toHaveLength(5);
      for (const days of [0, 11]) {
        const { world, enactment, officeKey, jurisdictionId, propositionId } =
          fixture(key, pack, {
            effectiveDateBasis: "game-default",
            effectiveDateGameProfile: {
              version: "authored-reader-profile/v1",
              days,
            },
          });
        const canonical = operativeDateForEnactment(
          enactment,
          key,
          enactmentStatuteDateContext(world, enactment),
        )!;
        const measure = world.history.legislativeMeasures!.find(
          (row) => row.id === enactment.measureId,
        )!;
        expect(enactmentOperative(world, measure, enactment)).toEqual({
          operativeAt: canonical.date,
          operativeBasis: canonical.basis,
        });
        expect(
          lawInForce(
            world,
            jurisdictionId,
            propositionId,
            canonical.date,
            "enacted-only",
          ),
        ).toMatchObject({
          measureId: measure.id,
          answer: "yes",
          operativeAt: canonical.date,
          operativeBasis: canonical.basis,
        });
        if (days > 0)
          expect(
            lawInForce(
              world,
              jurisdictionId,
              propositionId,
              addDays(canonical.date, -1),
              "enacted-only",
            ),
          ).toBeNull();
        expect(enactedRuleChanges(world)).toHaveLength(1);
        expect(enactedRuleChanges(world)[0]).toMatchObject({
          operativeAt: canonical.date,
          operativeBasis: canonical.basis,
        });
        if (days > 0)
          expect(
            enactedRuleChangeAt(world, {
              stateUsps: key.slice(3),
              officeKey,
              field: "term.years",
              onDate: addDays(canonical.date, -1),
            }),
          ).toBeNull();
        expect(
          enactedRuleChangeAt(world, {
            stateUsps: key.slice(3),
            officeKey,
            field: "term.years",
            onDate: canonical.date,
          })?.value,
        ).toBe(3);
        const saved = serializeWorld(world);
        const resumed = deserializeWorld(saved);
        expect(enactmentOperative(resumed, measure, enactment)).toEqual(
          enactmentOperative(world, measure, enactment),
        );
        expect(
          lawInForce(
            resumed,
            jurisdictionId,
            propositionId,
            canonical.date,
            "enacted-only",
          ),
        ).toEqual(
          lawInForce(
            world,
            jurisdictionId,
            propositionId,
            canonical.date,
            "enacted-only",
          ),
        );
        expect(enactedRuleChanges(deserializeWorld(saved))).toEqual(
          enactedRuleChanges(world),
        );
        expect(serializeWorld(world)).toBe(saved);
      }
      const explicit = fixture(key, pack, {
        effectiveAt: addDays(
          smallWorld({ place: key, seed }).world.currentDate,
          31,
        ),
      });
      expect(enactedRuleChanges(explicit.world)[0]).toMatchObject({
        operativeAt: explicit.enactment.effectiveAt,
        operativeBasis: "enacted-date",
      });
      expect(
        enactmentOperative(
          explicit.world,
          explicit.world.history.legislativeMeasures!.find(
            (row) => row.id === explicit.enactment.measureId,
          )!,
          explicit.enactment,
        ),
      ).toEqual({
        operativeAt: explicit.enactment.effectiveAt,
        operativeBasis: "enacted-date",
      });
      const unresolved = fixture(key, pack, {
        effectiveDateBasis: "source-default",
      });
      expect(
        operativeDateForEnactment(
          unresolved.enactment,
          key,
          enactmentStatuteDateContext(unresolved.world, unresolved.enactment),
        ),
      ).toBeNull();
      expect(
        lawInForce(
          unresolved.world,
          unresolved.jurisdictionId,
          unresolved.propositionId,
          addDays(unresolved.enactment.resolvedAt, 366),
          "enacted-only",
        ),
      ).toBeNull();
      expect(enactedRuleChanges(unresolved.world)).toEqual([]);
      expect(
        enactmentOperative(
          unresolved.world,
          unresolved.world.history.legislativeMeasures!.find(
            (row) => row.id === unresolved.enactment.measureId,
          )!,
          unresolved.enactment,
        ),
      ).toBeNull();
      const malformed = fixture(key, pack, {
        effectiveDateGameProfile: { version: "", days: -1 },
      });
      expect(() => enactedRuleChanges(malformed.world)).toThrow(
        "invalid effective-date game profile",
      );
      expect(() =>
        enactmentOperative(
          malformed.world,
          malformed.world.history.legislativeMeasures!.find(
            (row) => row.id === malformed.enactment.measureId,
          )!,
          malformed.enactment,
        ),
      ).toThrow("invalid effective-date game profile");
      console.info(
        "[a83-rule-change-date]",
        JSON.stringify({
          seed,
          key,
          packId: pack.packId,
          profiles: [0, 11],
          explicitDate: true,
          unresolvedRefused: true,
          invalidRejected: true,
        }),
      );
    },
  );
});
