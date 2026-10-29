import { el } from "./dom.mjs";

/**
 * The one card part: a boxed unit of a screen (a law, a job, an offer, a family member,
 * an account). `kind` is the card's class in play.css (`race`, `bill-estimate`,
 * `job-offer`); `as` picks the tag, a `div` by default
 * and `details` for a card that opens. Screens call this and never write the class by hand.
 */
export function makeCard(kind, props = {}, ...children) {
  const { as = "div", ...rest } = props;
  return el(as, { ...rest, className: kind }, ...children);
}
