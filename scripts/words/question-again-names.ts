/**
 * A second-mention name for every question (words builder, Nov 12: "the
 * subject is said once, then varied"; the composed check speech-has-one-theme
 * broke on one subject word said four times in a speech, "money", "power",
 * "clean", from the questions' own wordings). `again` is what a speech says
 * after the question has been named once: a short noun phrase that leaves
 * out the subject's words ("a clean electricity standard" is "the
 * standard"). The join says it (opening-story.ts composeBlocks); this script
 * only writes the field, from the head noun of `about` (the noun before its
 * first preposition) unless the table below gives a better one. A second
 * name must still say what the thing is (the lead, Nov 12: "Together we can
 * say no to the oversight." "Let us say no to the higher age."): one that is
 * bare, a single word after its article or a head that names no thing of its
 * own (`BARE_HEADS`: "the change", "the increase", "that right"), is the
 * question's law name instead ("the bigger police budget", "the higher age
 * to buy a handgun") where that name does not presume the law passed ("the
 * law ending cash bail"), else its own name ("ending cash bail"). Adds only; run again and it
 * changes nothing.
 *
 *   node --import tsx scripts/words/question-again-names.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/english/question-names.json";
const OWN: Record<string, string> = {
  "fare-free-transit": "free rides",
  "public-broadband": "a public network",
  "shift-highway-funds-to-transit": "the shift",
  "expand-medicaid-eligibility": "the expansion",
  "universal-preschool": "that program",
  "public-funds-for-private-schooling": "that money",
  "raise-teacher-minimum-salary": "the raise",
  "exempt-groceries-from-sales-tax": "the exemption",
  "fund-pensions-to-schedule": "full payments",
  "rent-stabilization": "the rent rules",
  "right-to-counsel-in-eviction": "that right",
  "raise-federal-minimum-wage": "the raise",
  "raise-minimum-wage": "the raise",
  "local-minimum-wage-authority": "that power",
  "paid-family-leave": "that benefit",
  "public-sector-collective-bargaining": "bargaining rights",
  "ban-the-box-public-hiring": "that question",
  "legalize-cannabis-sales": "legal sales",
  "ban-new-gas-hookups": "the ban",
  "allow-retail-electric-choice": "that choice",
  "partner-with-federal-immigration-enforcement": "that partnership",
  "end-cash-bail": "the change",
  "restore-voting-after-sentence": "that right",
  "raise-juvenile-court-age": "the change",
  "child-access-prevention": "those rules",
  "raise-handgun-purchase-age": "the higher age",
  "all-mail-voting": "mail ballots",
  "automatic-voter-registration": "the change",
  "independent-redistricting": "the commission",
  "require-photo-id-to-vote": "the ID rule",
  "same-day-voter-registration": "the change",
  "broaden-local-authority": "that power",
  "restrict-abortion": "those limits",
  "protect-farmland-from-development": "the protection",
  "pay-for-a-higher-debt-limit": "that condition",
  "raise-top-income-tax-rate": "the higher rate",
  "grow-defense-spending": "the increase",
  "increase-foreign-aid": "the increase",
  "admit-more-immigrants": "the increase",
  "medicare-drug-price-negotiation": "those talks",
  "raise-retirement-age": "the higher age",
  "forgive-student-loans": "the forgiveness",
  "expand-passenger-rail": "the new lines",
  "cut-farm-subsidies": "the cuts",
  "states-share-disaster-costs": "the cost sharing",
  "reduce-mandatory-minimums": "the shorter sentences",
  "statehood-for-dc": "statehood",
};
const LEAD = new Set(["a", "an", "the", "more", "any"]);
/** Heads that name no thing of their own: a second name ending on one says nothing of what is meant. */
const BARE_HEADS = new Set(
  "change increase right question power program money benefit choice condition protection forgiveness expansion shift raise oversight requirement partnership payments funding cuts talks sharing age rate sentences balance apartments statehood law rule".split(
    " ",
  ),
);
const ARTICLES = new Set(["a", "an", "the", "that", "those", "this", "these"]);
/** A second name that says what the thing is: its head names a thing ("the standard", "the cap"), not a placeholder for one ("the change", "the oversight", "the higher age"). */
const saysWhat = (name: string): boolean => {
  const words = name.split(" ").filter((word) => !ARTICLES.has(word));
  return words.length > 0 && !BARE_HEADS.has(words.at(-1)!.toLowerCase());
};
const PREPOSITIONS = new Set(
  "on of for to in from against at with after before by between into over under when that who so instead without about as".split(
    " ",
  ),
);
const json = JSON.parse(readFileSync(FILE, "utf8")) as {
  names: Record<string, { about: string; law?: string; again?: string }>;
};
let written = 0;
for (const [question, row] of Object.entries(json.names)) {
  const tail = question.split(/[.:]/).at(-1)!;
  // A local budget's line said again is the change asked for.
  const own = question.startsWith("budget-line:") ? "the increase" : OWN[tail];
  let words = row.about.split(" ");
  while (words.length > 1 && LEAD.has(words[0]!.toLowerCase()))
    words = words.slice(1);
  const cut = words.findIndex((word) => PREPOSITIONS.has(word));
  if (cut > 0) words = words.slice(0, cut);
  const short = own ?? `the ${words.at(-1)}`;
  // A law's name that only says "the law ..." presumes it passed; an open
  // question is then said by its own name.
  // Its own name, with "the" where it began on an article or a word of
  // amount ("a higher age ..." is "the higher age ..."), else as it is.
  const [first, ...rest] = row.about.split(" ");
  const full = LEAD.has(first!.toLowerCase())
    ? `the ${rest.join(" ")}`
    : row.about;
  const again = saysWhat(short)
    ? short
    : row.law && !row.law.startsWith("the law ")
      ? row.law
      : full;
  if (row.again === again) continue;
  row.again = again;
  written += 1;
}
writeFileSync(FILE, `${JSON.stringify(json, null, 2)}\n`);
console.log(`second-mention names written: ${written}`);
