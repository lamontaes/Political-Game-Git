/**
 * The declared national municipal corpus.
 *
 * Every government below is one entry of the 44/45/46 Part 2 institutional
 * pass, transcribed into the declaration shape and nothing more. Where an entry
 * gave a seat count, a seat count is declared; where it gave a chamber and a
 * cadence, those are declared; where it gave a power with its own rule — Fort
 * Smith's mayor who presides without voting and can be overridden by five
 * Directors, Boise's mayor who votes only to break a tie — that power is
 * declared as a power. Everything else is absent, and absent becomes UNKNOWN.
 *
 * The three Kentucky pilots #120 landed are deliberately not here. They are
 * authored against Kentucky's statutes in `fixtures/source/municipal-governance/
 * kentucky-pilot.json` and are the deeper record; declaring them again from a
 * shallower pass would put two readings of one government in one corpus.
 *
 * Ordering is by state then key, so the generated fixture is stable.
 */

import { includeCouncilSizeReadings } from "./council-size-readings";
import { includeExistingResearch } from "./research-expansion";
import type {
  NationalResearchCorpus,
  ResearchGovernment,
} from "./national-research";

/** Retained sourced municipal facts, consumed by the shared research path. */
import records from "./national-records.generated.json" with { type: "json" };

const ATTESTED = "2026-08-25";
const GOVERNMENTS = records as unknown as readonly ResearchGovernment[];

export const NATIONAL_MUNICIPAL_RESEARCH: NationalResearchCorpus = {
  packets: [
    "44_NEXT_PHASE_MUNICIPAL_GOVERNANCE_AND_ENVIRONMENT_MATRIX",
    "45_PART_2_MUNICIPAL_AND_ENVIRONMENT_EXPANSION",
    "46_PART_2_50_STATE_MUNICIPAL_COMPLETENESS_MATRIX",
  ],
  attestedAsOf: ATTESTED,
  readOn: "2026-09-08",
  evidenceClass: "secondary-synthesis",
  governments: includeCouncilSizeReadings(includeExistingResearch(GOVERNMENTS)),
};
