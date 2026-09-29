import { legislatureProfilePack } from "../../src/simulation/legislature-game-profile";
import { registerRulePackResolver } from "../../src/simulation/legislature-rule-packs";
import {
  knownRule,
  assertRulePackIntegrity,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "../../src/simulation/legislature-rules";

/** Explicit experimental profiles, not an assertion that territorial procedure has been fully sourced. */
const bodies: Readonly<
  Record<
    string,
    {
      name: string;
      chambers: readonly { key: string; name: string; seats: number }[];
      source: string;
    }
  >
> = {
  "US-GU": {
    name: "Guam Legislature",
    chambers: [{ key: "senate", name: "Guam Legislature", seats: 15 }],
    source: "https://guamlegislature.gov/senators-2/",
  },
  "US-VI": {
    name: "Legislature of the Virgin Islands",
    chambers: [{ key: "senate", name: "Legislature", seats: 15 }],
    source: "https://legvi.org/functions-and-structure/",
  },
  "US-MP": {
    name: "Northern Marianas Commonwealth Legislature",
    chambers: [
      { key: "house", name: "House of Representatives", seats: 20 },
      { key: "senate", name: "Senate", seats: 9 },
    ],
    source: "https://cnmileg.net/members.asp?legsID=24&secID=1",
  },
  "US-AS": {
    name: "American Samoa Fono",
    chambers: [
      { key: "house", name: "House of Representatives", seats: 20 },
      { key: "senate", name: "Senate", seats: 18 },
    ],
    source: "https://asbar.org/revised-constitution-of-american-samoa/",
  },
};
const packs = new Map<string, LegislativeRulePack>();
export function territorialProofPack(
  stateKey: string,
): LegislativeRulePack | null {
  const body = bodies[stateKey];
  if (!body) return null;
  const id = `${stateKey.toLowerCase()}-laws-proof-profile-v1`;
  if (packs.has(id)) return packs.get(id)!;
  const template = legislatureProfilePack(
    "nonstate-proof-baseline",
    "Experimental territorial procedure",
  )!;
  const source: RuleSourceRef = {
    authority: "research-reference",
    citation: "Recorded chamber membership",
    sourceTitle: body.name,
    sourceUrl: body.source,
    retrievedAt: "2026-09-29",
    verification: "partial",
    note: "Body shape and member counts are read; procedural gaps retain the disclosed shared game profile. American Samoa's 20-vote House excludes the constitution's nonvoting Swains delegate; later amendment implementation remains to be verified.",
  };
  const chambers = body.chambers.map((c) => ({
    ...template.chambers.find((t) => t.chamberKey === c.key)!,
    chamberKey: c.key,
    name: c.name,
    seats: knownRule(c.seats, source),
  }));
  const pack: LegislativeRulePack = {
    ...template,
    packId: id,
    jurisdictionKey: stateKey,
    displayName: body.name,
    structure: chambers.length === 1 ? "unicameral" : "bicameral",
    chambers,
    chamberOrder: chambers.map((c) => c.chamberKey),
    origination: {
      ...template.origination,
      generalOrigination: knownRule(
        chambers.map((c) => c.chamberKey),
        template.origination.source,
      ),
    },
    interChamber:
      chambers.length === 1
        ? {
            kind: "not-applicable",
            note: "This territorial legislature has one chamber.",
          }
        : template.interChamber,
  };
  assertRulePackIntegrity(pack);
  packs.set(id, pack);
  return pack;
}
registerRulePackResolver((id) => packs.get(id) ?? null);
