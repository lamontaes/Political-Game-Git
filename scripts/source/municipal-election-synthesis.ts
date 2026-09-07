import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE_RELATIVE_PATH =
  "data/municipal-elections/raw/92O_NATIONAL_MUNICIPAL_ELECTIONS_DIRECT_DEMOCRACY_COMPLETION.md.gz";
const OUTPUT_RELATIVE_PATH =
  "data/municipal-elections/92O-national-state-baseline.json";
const SOURCE_PATH = resolve(ROOT, SOURCE_RELATIVE_PATH);
const OUTPUT_PATH = resolve(ROOT, OUTPUT_RELATIVE_PATH);

const COMPILER_CONFLICTS = [
  {
    id: "recall-grounds-on-prohibited-states",
    affects: ["*"],
    summary:
      "Every jurisdiction whose recall doctrine is `prohibited` is also serialized with `Grounds Required: True`.",
    resolution:
      "Read as a serializer artifact. A mechanism that does not exist cannot require grounds, so the compiled pack records `recallGroundsRequired` as not-applicable wherever the doctrine is prohibited rather than compiling `true`.",
  },
  {
    id: "iowa-virginia-recall-authorized-false-with-threshold",
    affects: ["IA", "VA"],
    summary:
      "Iowa and Virginia are serialized `Authorized: False` with doctrine `judicial_cause_removal_trial`, yet still carry a petition threshold (Iowa 20% of votes cast for the office, Virginia 10%).",
    resolution:
      "Section 1.2 states both are judicial-removal-only. The doctrine is compiled as the resolved value; the percentage gates a judicial removal petition, not a recall election, so the recall-election petition threshold is compiled not-applicable and the number is preserved in this register rather than asserted as a recall threshold.",
  },
  {
    id: "connecticut-initiative-authorized-false-with-form",
    affects: ["CT"],
    summary:
      "Connecticut is serialized `Authorized: False` for municipal initiative while also carrying the form `town_meeting_warrant` and a list of exempt subjects.",
    resolution:
      "Section 4.1 records that New England town warrant articles are real. The compiled pack carries no redundant authorized boolean: the form value itself is the availability claim, and `town-meeting-warrant` is compiled as the resolved form.",
  },
  {
    id: "new-york-protest-referendum-window-without-mechanism",
    affects: ["NY"],
    summary:
      "New York is serialized with no referendum and no protest referendum, yet carries a 45-day window.",
    resolution:
      "A window without a mechanism resolves nothing. The protest referendum is compiled `prohibited` under general municipal law and the window not-applicable. New York town law's permissive referendum is a different instrument that this packet does not resolve.",
  },
  {
    id: "section-6-timing-enum-narrower-than-profiles",
    affects: ["*"],
    summary:
      "The packet's section 6 `MunicipalTimingModel` enum omits seven timing values its own state profiles use: spring_annual, odd_year_autumn, autumn_gubernatorial, town_meeting_day_spring, even_year_june_consolidated, even_year_august_consolidated and even_year_may_consolidated.",
    resolution:
      "The state profiles are the more specific layer and govern. The compiled vocabulary is the union of the values the profiles actually use.",
  },
  {
    id: "section-1-2-recall-prohibition-count",
    affects: ["IL", "MA", "MN", "NC", "WV"],
    summary:
      "Section 1.2 names 14 states where recall is prohibited or judicial-removal-only. The state profiles serialize 17 as `prohibited` plus 2 as `judicial_cause_removal_trial`, adding Illinois, Massachusetts, Minnesota, North Carolina and West Virginia.",
    resolution:
      "The profiles govern as the more specific layer, and their claim is about state general law only. The packet itself notes a Chicago mayoral recall statute (10 ILCS 5/21A), which is consistent with general law being silent while a named local instrument is not. Charter-level recall in these states stays unresolved.",
  },
  {
    id: "kentucky-option-family-is-a-metro-family",
    affects: ["KY"],
    summary:
      "Kentucky's statewide option family is serialized `consolidated_city_county`, a family the packet otherwise uses for individual metro governments rather than for a state baseline.",
    resolution:
      "Carried verbatim because it is the source's own classification, and flagged here. The family value is descriptive metadata and no compiled electoral rule depends on it.",
  },
  {
    id: "ohio-ballot-default-vs-citation-text",
    affects: ["OH"],
    summary:
      "Ohio's ballot structure is serialized `partisan_default_nonpartisan_optional` while the same line's citation text reads 'MANDATORY PARTISAN ELECTIONS in statutory cities'.",
    resolution:
      "Both are true of different layers and the enum resolves them: statutory cities are partisan by state law, and section 1.2 records that charter cities opt nonpartisan under the 1912 Home Rule Amendment. Which layer a given Ohio municipality sits in is local variation and stays unresolved.",
  },
  {
    id: "locally-selectable-runoff-carries-a-trigger",
    affects: ["AK", "FL", "IA", "NJ", "NC", "SC"],
    summary:
      "Six jurisdictions serialize a runoff rule of `locally_selectable` together with a concrete majority trigger.",
    resolution:
      "The trigger is conditional on the local option actually being adopted, which state law does not resolve. The runoff rule compiles as locally-selectable and the trigger is carried as the conditional threshold that applies only under the majority option, never as the jurisdiction's operative rule.",
  },
  {
    id: "new-hampshire-warrant-article-threshold-is-not-a-percentage",
    affects: ["NH"],
    summary:
      "New Hampshire's initiative form is `town_meeting_warrant` with no percentage threshold.",
    resolution:
      "Section 4.1 records that a warrant article is placed by an absolute count of signers (10 to 50 registered voters), not a share of an electorate. A percentage threshold is compiled not-applicable rather than unknown.",
  },
] as const;

function requiredMatch(
  text: string,
  pattern: RegExp,
  label: string,
): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error(`92O extraction failed: ${label}.`);
  return match;
}

function numberOrNull(raw: string): number | null {
  if (raw === "None") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid 92O number: ${raw}`);
  return value;
}

function booleanValue(raw: string): boolean {
  if (raw === "True") return true;
  if (raw === "False") return false;
  throw new Error(`Invalid 92O boolean: ${raw}`);
}

function csv(raw: string): string[] {
  return raw.split(",").map((value) => value.trim());
}

function parseProfile(usps: string, stateName: string, body: string) {
  const optionFamily = requiredMatch(
    body,
    /- \*\*Option Family:\*\* `([^`]+)`/,
    `${usps} option family`,
  )[1]!;
  const homeRule = requiredMatch(
    body,
    /- \*\*Home Rule Foundation:\*\* `([^`]+)` \| Authority: `([^`]+)`/,
    `${usps} home rule`,
  );
  const ballot = requiredMatch(
    body,
    / {2}- `Ballot Type:` `([^`]+)` \(Statute: `([^`]+)`\)/,
    `${usps} ballot`,
  );
  const timing = requiredMatch(
    body,
    / {2}- `Election Timing:` `([^`]+)` \(Statute: `([^`]+)`\)/,
    `${usps} election timing`,
  );
  const runoff = requiredMatch(
    body,
    / {2}- `Runoff \/ Voting Rule:` `([^`]+)` \| Trigger: `([^`]+)%` \| Statute: `([^`]+)`/,
    `${usps} runoff`,
  );
  const seats = requiredMatch(
    body,
    / {2}- `District \/ Ward \/ At-Large:` Options: `([^`]+)` \| Default: `([^`]+)` \(Statute: `([^`]+)`\)/,
    `${usps} seats`,
  );
  const mayor = requiredMatch(
    body,
    / {2}- `Mayor Selection:` `([^`]+)` \| Strong vs\. Weak: ([^\n]+)/,
    `${usps} mayor selection`,
  );
  const administration = requiredMatch(
    body,
    / {2}- `Administration:` `([^`]+)` \| Authority: `([^`]+)` \| Cost Rule: ([^\n]+)/,
    `${usps} administration`,
  );
  const vacancy = requiredMatch(
    body,
    / {2}- `Rule Type:` `([^`]+)` \| Special Election Cutoff: `([^`]+) months` \| Party Caucus Succession: `([^`]+)` \| Citizen Override: `([^`]+)`/,
    `${usps} vacancy`,
  );
  const vacancyCitation = requiredMatch(
    body,
    / {2}- `Statutes:` `([^`]+)`/,
    `${usps} vacancy citation`,
  )[1]!;
  const recall = requiredMatch(
    body,
    / {2}- `Municipal Recall:` Authorized: `([^`]+)` \| Type: `([^`]+)` \| Grounds Required: `([^`]+)` \| Threshold: `([^`]+)%` of `([^`]+)` \| Window: `([^`]+) days`\n {4}- `Authority:` `([^`]+)`\n {4}- `Mechanics:` ([^\n]+)/,
    `${usps} recall`,
  );
  const initiative = requiredMatch(
    body,
    / {2}- `Municipal Initiative:` Authorized: `([^`]+)` \| Type: `([^`]+)` \| Threshold: `([^`]+)%` \| Exempt Subjects: `([^`]+)`\n {4}- `Authority:` `([^`]+)` \| Notes: ([^\n]+)/,
    `${usps} initiative`,
  );
  const referendum = requiredMatch(
    body,
    / {2}- `Municipal Referendum:` Authorized: `([^`]+)` \| Protest Referendum Available: `([^`]+)` \| Window: `([^`]+) days` \| Suspends Ordinance: `([^`]+)` \| Threshold: `([^`]+)%`\n {4}- `Authority:` `([^`]+)` \| Notes: ([^\n]+)/,
    `${usps} referendum`,
  );

  return {
    usps,
    stateName,
    optionFamily,
    homeRuleFoundation: homeRule[1]!,
    homeRuleAuthority: homeRule[2]!,
    ballotStructure: ballot[1]!,
    ballotCitation: ballot[2]!,
    electionTimingOptions: csv(timing[1]!),
    electionTimingCitation: timing[2]!,
    runoffRule: runoff[1]!,
    runoffTriggerPercent: numberOrNull(runoff[2]!),
    runoffCitation: runoff[3]!,
    seatStructureOptions: csv(seats[1]!),
    seatStructureDefault: seats[2]!,
    seatStructureCitation: seats[3]!,
    mayorSelectionOptions: csv(mayor[1]!),
    mayorSelectionNote: mayor[2]!,
    electionAdministration: administration[1]!,
    electionAdministrationCitation: administration[2]!,
    electionCostRule: administration[3]!,
    vacancyRule: vacancy[1]!,
    vacancySpecialElectionCutoffMonths: numberOrNull(vacancy[2]!),
    vacancyPartyCaucusSuccession: booleanValue(vacancy[3]!),
    vacancyCitizenOverride: booleanValue(vacancy[4]!),
    vacancyCitation,
    recallAuthorized: booleanValue(recall[1]!),
    recallDoctrine: recall[2]!,
    recallGroundsRequired: booleanValue(recall[3]!),
    recallPetitionPercent: numberOrNull(recall[4]!),
    recallPetitionBase: recall[5]!,
    recallCirculationWindowDays: numberOrNull(recall[6]!),
    recallCitation: recall[7]!,
    recallMechanics: recall[8]!,
    initiativeAuthorized: booleanValue(initiative[1]!),
    initiativeForm: initiative[2]!,
    initiativePetitionPercent: numberOrNull(initiative[3]!),
    initiativeExemptSubjects: csv(initiative[4]!),
    initiativeCitation: initiative[5]!,
    initiativeNotes: initiative[6]!,
    referendumAuthorized: booleanValue(referendum[1]!),
    protestReferendumAvailable: booleanValue(referendum[2]!),
    protestReferendumWindowDays: numberOrNull(referendum[3]!),
    protestReferendumSuspendsOrdinance: booleanValue(referendum[4]!),
    protestReferendumPercent: numberOrNull(referendum[5]!),
    referendumCitation: referendum[6]!,
    referendumNotes: referendum[7]!,
  };
}

function parseSourceFrontiers(source: string) {
  const section = requiredMatch(
    source,
    /## 7\. CATALOG OF UNRESOLVED SOURCE CONFLICTS & FRONTIER FIELDS\n\n([\s\S]*?)\n\n---\n\n## 8\./,
    "section 7 frontier catalogue",
  )[1]!;
  const items = [
    ...section.matchAll(/^(\d+)\. \*\*(.+):\*\*\n {3}- ([^\n]+)$/gm),
  ].map((match) => ({
    id: match[2]!
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    verbatim: match[0]!,
  }));
  if (items.length !== 4) {
    throw new Error(`Expected 4 source frontiers, found ${items.length}.`);
  }
  return items;
}

export function compileMunicipalElectionSynthesis(source: string) {
  const heading = requiredMatch(
    source,
    /^# 92O_NATIONAL_MUNICIPAL_ELECTIONS_DIRECT_DEMOCRACY_COMPLETION — (\d{4}-\d{2}-\d{2})$/m,
    "document heading/date",
  );
  const profilesSection = requiredMatch(
    source,
    /## 5\. MASTER 50-STATE \+ DC JURISDICTIONAL PROFILES\n([\s\S]*?)\n## 6\./,
    "section 5 profiles",
  )[1]!;
  const profiles = [
    ...profilesSection.matchAll(
      /### US-([A-Z]{2}) — ([^\n]+)\n([\s\S]*?)(?=\n### US-|$)/g,
    ),
  ].map((match) => parseProfile(match[1]!, match[2]!, match[3]!));
  if (profiles.length !== 51) {
    throw new Error(
      `Expected 51 jurisdiction profiles, found ${profiles.length}.`,
    );
  }
  const unique = new Set(profiles.map((profile) => profile.usps));
  if (unique.size !== 51) throw new Error("92O repeats a USPS profile code.");

  const sourceBytes = Buffer.from(source, "utf8");
  return {
    meta: {
      packetId: "92O_NATIONAL_MUNICIPAL_ELECTIONS_DIRECT_DEMOCRACY_COMPLETION",
      packetDate: heading[1]!,
      driveFileId: "1dfhiTj8FM4vUOYud7kbyU_B3ZDKnZQJ9",
      researchLane: "Antigravity (Google DeepMind)",
      asOf: heading[1]!,
      readOn: "2026-09-06",
      sourceTier: "secondary-synthesis-only",
      scope:
        "State general-law baseline for municipal elections and municipal direct democracy across the 50 states and the District of Columbia. Local charter variation is out of scope and is never inferred.",
      jurisdictionCount: 51,
      sourceSnapshot: {
        path: SOURCE_RELATIVE_PATH,
        bytes: sourceBytes.length,
        sha256: createHash("sha256").update(sourceBytes).digest("hex"),
        storageEncoding: "gzip",
        extraction: "deterministic-markdown-profile-parser-v1",
        replayCommand:
          "node --import tsx scripts/source/municipal-election-synthesis.ts",
      },
    },
    sourceFrontiers: parseSourceFrontiers(source),
    compilerConflicts: COMPILER_CONFLICTS,
    jurisdictions: profiles.sort((a, b) => a.usps.localeCompare(b.usps)),
  };
}

function generatedJson(): string {
  const source = gunzipSync(readFileSync(SOURCE_PATH)).toString("utf8");
  return `${JSON.stringify(compileMunicipalElectionSynthesis(source), null, 2)}\n`;
}

function main(): void {
  const generated = generatedJson();
  if (process.argv.includes("--write")) {
    writeFileSync(OUTPUT_PATH, generated, "utf8");
    console.log(`municipal-election: wrote ${OUTPUT_RELATIVE_PATH}`);
    return;
  }
  const tracked = readFileSync(OUTPUT_PATH, "utf8");
  if (tracked !== generated) {
    throw new Error(
      `${OUTPUT_RELATIVE_PATH} does not match deterministic extraction from ${SOURCE_RELATIVE_PATH}. Run node --import tsx scripts/source/municipal-election-synthesis.ts --write.`,
    );
  }
  console.log(
    "municipal-election: replay clean; the 51-profile JSON regenerates byte-identically from the pinned 92O secondary-synthesis snapshot.",
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  main();
}
