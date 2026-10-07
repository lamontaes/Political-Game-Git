import type { TraitLeanRow } from "../trait-packs";

/**
 * The reason a trait gives for leaning a decision one way, composed from its
 * key and the person's recorded tendency. A reader file names the trait, the
 * decision, the option and the pole; it carries no sentence. The words live
 * here, in one reviewed bank, and are put together from the trait's own
 * recorded pole (its label and meaning) and what the option means for the
 * decision.
 */

/** `trait|decision|option|pole`: the stable key of one reason. */
export function traitReasonKey(
  lean: Pick<TraitLeanRow, "trait" | "option" | "pole">,
  decisionId: string,
): string {
  return `${lean.trait}|${decisionId}|${lean.option}|${lean.pole}`;
}

/** What taking the option means, as a clause that follows "so they". */
export const OPTION_CLAUSES: Readonly<Record<string, string>> = {
  "campaign.organizer-outreach|organization-meeting":
    "go to the organizing meeting",
  "campaign.organizer-outreach|phone-shift": "take the phone shift",
  "campaign.organizer-outreach|town-hall": "go to the town hall",
  "campaign.support-request|defer": "put off the request for support",
  "campaign.support-request|grant": "give the support asked of them",
  "career.consider-another-term|seek": "run for another term",
  "career.consider-another-term|step-down": "step aside after this term",
  "clemency.petition|petition": "press the petition",
  "clemency.petition|wait": "hold off on the petition",
  "contact.answer|accept": "accept the request",
  "contact.answer|counter": "answer with terms of their own",
  "contact.answer|decline": "turn the request down",
  "court.jury-vote|acquit": "vote to acquit",
  "court.jury-vote|convict": "vote to convict",
  "court.plea|trial": "go to trial",
  "labor.worker-quit|continue-work": "stay in the job",
  "labor.worker-quit|quit": "leave the job",
  "legislation.member-vote|vote-nay": "vote no",
  "legislation.member-vote|vote-yea": "vote yes",
  "legislation.member-vote|withhold": "hold back their vote",
  "mogul.approach|deal": "make the deal",
  "people.couple-stage|break-up": "end the relationship",
  "people.couple-stage|stay": "stay together",
  "press.adviser-assignment-response|accept": "take the assignment",
  "press.adviser-assignment-response|decline": "turn the assignment down",
  "press.reporter-request-response|accept": "answer the reporter",
  "press.reporter-request-response|decline": "turn the reporter down",
  "press.reporter-request-response|defer": "put the reporter off",
};

function sentence(text: string): string {
  const trimmed = text.trim().replace(/[.!?]+$/, "");
  return `${trimmed}.`;
}

/**
 * One sentence of reason. `poleLabel` and `poleMeaning` are the recorded
 * trait's own words for the pole the person sits on; `aboutSubject` is true
 * when the trait read is the other person's, known from dealings with them.
 */
export function composeTraitReason(input: {
  readonly key: string;
  readonly poleLabel: string;
  readonly poleMeaning: string;
  readonly aboutSubject: boolean;
}): string {
  const [, decision = "", option = ""] = input.key.split("|");
  const clause =
    OPTION_CLAUSES[`${decision}|${option}`] ?? `choose "${option}"`;
  const label = input.poleLabel.trim();
  // A pole whose recorded meaning only restates its label ("Leans outgoing.")
  // adds nothing, so the reason goes straight from the label to the choice.
  const restates = /^leans\b/i.test(input.poleMeaning.trim());
  const meaning = restates ? "" : ` ${sentence(input.poleMeaning)}`;
  const joiner = restates ? "," : ":";
  const tail = restates ? ` so they ${clause}.` : ` So they ${clause}.`;
  return input.aboutSubject
    ? `From their dealings, they read this person as ${label.toLowerCase()}${joiner}${meaning}${tail}`
    : `${label}${joiner}${meaning}${tail}`;
}
