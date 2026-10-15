import { rulePackById } from "./legislature-rule-packs";
import type { ExecutiveAuthorityRulePack } from "./executive-authority-rules";
import {
  executiveAuthorityGameProfileForJurisdiction,
  executiveProfileForOfficeKey,
} from "./executive-authority-game-profile";
import { researchRuleTable } from "./research-rule-tables";

/** Source fields retain the certified subset; the game-profile reader covers unread places. */
const rows = researchRuleTable("executivePacks");
const packs = rows as Readonly<{
  [Key in keyof typeof rows]: ExecutiveAuthorityRulePack;
}>;
// Presentment belongs to the live legislative registry, including its source object.
function composePresentment(
  pack: ExecutiveAuthorityRulePack,
): ExecutiveAuthorityRulePack {
  const ref = pack.presentment.legislativeRulePackId;
  if (ref.kind !== "known") return pack;
  return {
    ...pack,
    presentment: {
      legislativeRulePackId: {
        ...ref,
        source: rulePackById(ref.value).executive.source,
      },
    },
  };
}
const ALASKA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = composePresentment(
  packs.ALASKA_EXECUTIVE_PACK,
);
const ILLINOIS_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = composePresentment(
  packs.ILLINOIS_EXECUTIVE_PACK,
);
const KENTUCKY_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = composePresentment(
  packs.KENTUCKY_EXECUTIVE_PACK,
);
const MINNESOTA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = composePresentment(
  packs.MINNESOTA_EXECUTIVE_PACK,
);
const NEBRASKA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = composePresentment(
  packs.NEBRASKA_EXECUTIVE_PACK,
);
const US_FEDERAL_EXECUTIVE_PACK: ExecutiveAuthorityRulePack =
  composePresentment(packs.US_FEDERAL_EXECUTIVE_PACK);

export const EXECUTIVE_AUTHORITY_RULE_PACKS: readonly ExecutiveAuthorityRulePack[] =
  [
    US_FEDERAL_EXECUTIVE_PACK,
    KENTUCKY_EXECUTIVE_PACK,
    NEBRASKA_EXECUTIVE_PACK,
    ALASKA_EXECUTIVE_PACK,
    MINNESOTA_EXECUTIVE_PACK,
    ILLINOIS_EXECUTIVE_PACK,
  ];

export {
  US_FEDERAL_EXECUTIVE_PACK,
  KENTUCKY_EXECUTIVE_PACK,
  NEBRASKA_EXECUTIVE_PACK,
  ALASKA_EXECUTIVE_PACK,
  MINNESOTA_EXECUTIVE_PACK,
  ILLINOIS_EXECUTIVE_PACK,
};

export function executiveRulePackById(
  packId: string,
): ExecutiveAuthorityRulePack {
  const pack = EXECUTIVE_AUTHORITY_RULE_PACKS.find(
    (candidate) => candidate.packId === packId,
  );
  if (!pack) {
    throw new Error(
      `No executive-authority rule pack is registered as '${packId}'.`,
    );
  }
  return pack;
}

/** The read or estimated executive pack for a state, district or territory. */
export function executiveRulePackForJurisdiction(
  jurisdictionKey: string,
): ExecutiveAuthorityRulePack {
  return executiveAuthorityGameProfileForJurisdiction(jurisdictionKey).pack;
}

/** The read or estimated pack whose office key matches, or null for other offices. */
export function executiveRulePackForOfficeKey(
  officeKey: string,
): ExecutiveAuthorityRulePack | null {
  return executiveProfileForOfficeKey(officeKey)?.pack ?? null;
}
