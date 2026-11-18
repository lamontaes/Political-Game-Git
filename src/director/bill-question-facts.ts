/**
 * What a bill is about and where one person stands on it, read once for every
 * scene that says so (a donor's ask, a colleague's ask for a vote): the
 * question of the bill's first provision as the bill catalog words it
 * (`questionAbout`), and the sign of the person's view on that question
 * (`viewOn`) against the bill's own position. Read when a scene is composed,
 * never on a day tick.
 */
import { townLean } from "../core2/modules/campaigns";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  provisionStance,
} from "../core2/modules/legislature";
import { viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import { questionAbout } from "../english/question-names";

/** How far left or right a person leans (the campaign views' `personLean`, handed in so this file reaches no other engine's insides). */
export type LeanOf = (
  people: CoreState["people"],
  person: Readonly<PersonState>,
  townLean: number,
) => number;

/** The bill's question and the person's side of it. */
export interface BillQuestionRead {
  /** The question of the bill's first provision. */
  readonly question: string;
  /** The question as a noun phrase ("a higher minimum wage"). */
  readonly about: string;
  /** The bill's own direction on the question: 1 does it, -1 undoes it. */
  readonly position: number;
  /** The person's view times the bill's direction: above zero is for the bill, below is against, zero is neither. */
  readonly leaning: number;
}

/**
 * The question `billId` answers and where `personId` stands on it, or null
 * when the bill, its first provision's question or the catalog's words for
 * it are missing.
 */
export function billQuestionRead(
  core: Readonly<CoreState>,
  personId: PersonId,
  billId: string,
  leanOf: LeanOf,
): BillQuestionRead | null {
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const person = core.people.get(personId);
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  const provision = bill?.provisions[P.zero];
  const stance = provision ? provisionStance(api, provision) : null;
  const about = stance ? questionAbout(stance.question) : null;
  if (!person || !stance || !about) return null;
  const view = viewOn(
    api,
    personId,
    stance.question,
    leanOf(core.people, person, townLean(api)),
  );
  return {
    question: stance.question,
    about,
    position: stance.position,
    leaning: view * stance.position,
  };
}
