import { federalRulePackById } from "./congress-rule-pack";
import { legislatureProfilePackById } from "./legislature-game-profile";
import { municipalRulePackById } from "./municipal-rule-registry";
import { townCouncilProfilePackById } from "./town-council-profile";
import { withCommitteeStandIns } from "./standing-committee";
import { withMinorityPartyProcedureRows } from "./minority-party-procedure";
import type { LegislativeRulePack } from "./legislature-rules";
import { researchRuleTable } from "./research-rule-tables";

/** Source citations and unresolved fields are retained verbatim in the JSON rows. */
const rows = researchRuleTable("legislativePacks");
const packs = rows as Readonly<{
  [Key in keyof typeof rows]: LegislativeRulePack;
}>;
export const ALASKA_RULE_PACK: LegislativeRulePack = packs.ALASKA_RULE_PACK;
export const ILLINOIS_RULE_PACK: LegislativeRulePack = packs.ILLINOIS_RULE_PACK;
export const KENTUCKY_RULE_PACK: LegislativeRulePack = packs.KENTUCKY_RULE_PACK;
export const MARYLAND_RULE_PACK: LegislativeRulePack = packs.MARYLAND_RULE_PACK;
export const MINNESOTA_RULE_PACK: LegislativeRulePack =
  packs.MINNESOTA_RULE_PACK;
export const MISSOURI_RULE_PACK: LegislativeRulePack = packs.MISSOURI_RULE_PACK;
export const NEBRASKA_RULE_PACK: LegislativeRulePack = packs.NEBRASKA_RULE_PACK;
export const NEVADA_RULE_PACK: LegislativeRulePack = packs.NEVADA_RULE_PACK;
export const OHIO_RULE_PACK: LegislativeRulePack = packs.OHIO_RULE_PACK;

export const LEGISLATIVE_RULE_PACKS: readonly LegislativeRulePack[] = [
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
  ALASKA_RULE_PACK,
  MINNESOTA_RULE_PACK,
  ILLINOIS_RULE_PACK,
  MARYLAND_RULE_PACK,
  MISSOURI_RULE_PACK,
  NEVADA_RULE_PACK,
  OHIO_RULE_PACK,
].map(withMinorityPartyProcedureRows);

/**
 * One registered rule pack, by id.
 *
 * `LEGISLATIVE_RULE_PACKS` above is the state legislatures, and it stays that:
 * a city council is not a state legislature and putting one in that array would
 * make the Content Browser list it as one. Municipal packs are a second
 * registry, derived from the compiled municipal-governance corpus rather than
 * written here, and they are resolvable by id because the engine that moves a
 * bill is the engine that moves an ordinance. A caller still cannot hand the
 * engine a pack object — the id is the only handle — so a fabricated council
 * with a plausible id resolves to nothing.
 */
type RulePackResolver = (packId: string) => LegislativeRulePack | null;

const RULE_PACK_SOURCES: readonly RulePackResolver[] = [
  (packId) => {
    const researched = LEGISLATIVE_RULE_PACKS.find(
      (candidate) => candidate.packId === packId,
    );
    return researched ? withCommitteeStandIns(researched) : null;
  },
  federalRulePackById,
  municipalRulePackById,
  townCouncilProfilePackById,
  legislatureProfilePackById,
];

export function rulePackById(packId: string): LegislativeRulePack;
export function rulePackById(
  packId: string,
  required: false,
): LegislativeRulePack | null;
export function rulePackById(
  packId: string,
  required = true,
): LegislativeRulePack | null {
  for (const source of RULE_PACK_SOURCES) {
    const pack = source(packId);
    if (pack) return pack;
  }
  if (required)
    throw new Error(`No legislative rule pack is registered as '${packId}'.`);
  return null;
}
