/**
 * The knowledge keys the President's opening address is recorded with: the
 * event's facts, which the news engine teaches everyone who hears the story
 * and the core teaches everyone who saw it.
 */
export const ADDRESS_FACT = {
  event: "address:event",
  /** The offices engine's inauguration record the address was given at. */
  inauguration: "address:inauguration",
  president: "address:president",
  kind: "address:kind",
  opening: "address:opening",
  remembered: "address:remembered",
  text: "address:text",
  /** The address in its parts, one per Continue, split by ADDRESS_PART_BREAK. */
  parts: "address:parts",
} as const;

/** What separates the parts of the address in its recorded `address:parts` fact. */
export const ADDRESS_PART_BREAK = "\n\n";
