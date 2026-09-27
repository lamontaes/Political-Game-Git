import type { EntityId, World } from "../simulation";

/**
 * A reader's headline for a saved publication.
 *
 * The saved publication keeps its copy exactly as it was written; for a
 * living-world development that copy is the record's own full sentence, used
 * as both headline and body, so the News showed the same sentence twice. This
 * writes the short headline a paper would print above that sentence, from
 * facts the record already carries: its stage, its subject and the government
 * named in it. Nothing is added that the record does not say. A publication
 * this does not recognize keeps its saved headline.
 */

const STAGE_TAG = "stage:";
const FAMILY_TAG = "family:";

/**
 * Short nouns for the authored local subjects, found by the subject's own
 * words in the record so a reordered or added subject is never misnamed.
 */
const LOCAL_SUBJECT_NOUNS: readonly (readonly [string, string])[] = [
  ["operating hours at a public facility", "public facility hours"],
  ["the repair schedule for several local roads", "road repair schedule"],
  ["the rules for reserving a public park shelter", "park shelter reservation"],
  ["the location of a recycling drop-off site", "recycling drop-off site"],
];

const LOCAL_STAGE_HEADLINES: Readonly<
  Record<string, (actor: string, noun: string) => string>
> = {
  "proposal-posted": (actor, noun) => `${actor} seeks comment on ${noun} plan`,
  "comment-period-extended": (actor, noun) =>
    `${actor} extends comment on ${noun} plan`,
  "revised-proposal-posted": (actor, noun) => `${actor} revises ${noun} plan`,
  "proposal-adopted": (actor, noun) => `${actor} adopts ${noun} plan`,
  "proposal-withdrawn": (actor, noun) => `${actor} drops ${noun} plan`,
};

/** The authored international subjects, found by a word of their own. */
const INTERNATIONAL_HEADLINES: readonly (readonly [
  RegExp,
  Readonly<Record<string, string>>,
])[] = [
  [
    /\bshipping\b/i,
    {
      reported: "Shipping delays hit busy trade route",
      persisted: "Trade route delays drag on",
      eased: "Shipping picks up on trade route",
    },
  ],
  [
    /\bfishing\b/i,
    {
      reported: "Governments open talks on shared fishing waters",
      persisted: "Fishing-rights talks continue without a deal",
      eased: "Fishing-rights talks reach interim arrangement",
    },
  ],
];

function tagValue(tags: readonly string[], prefix: string): string | null {
  const tag = tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** The government a local development names, as its record's summary does. */
function localActor(summary: string): string | null {
  const match =
    /^(.+?) (?:posted|adopted|withdrew|extended) /.exec(summary) ?? null;
  return match?.[1] ?? null;
}

export function readerHeadline(
  world: World,
  item: { readonly sourceEventId: EntityId; readonly headline: string },
): string {
  const event = world.history.events.find(
    (candidate) => candidate.id === item.sourceEventId,
  );
  if (!event) return item.headline;
  const family = tagValue(event.tags, FAMILY_TAG);
  const stage = tagValue(event.tags, STAGE_TAG);
  if (!stage) return item.headline;
  if (family === "local-matter") {
    const noun = LOCAL_SUBJECT_NOUNS.find(([words]) =>
      event.summary.includes(words),
    )?.[1];
    const actor = localActor(event.summary);
    const write = LOCAL_STAGE_HEADLINES[stage];
    return noun && actor && write ? write(actor, noun) : item.headline;
  }
  if (family === "international") {
    const headlines = INTERNATIONAL_HEADLINES.find(([pattern]) =>
      pattern.test(event.summary),
    )?.[1];
    return headlines?.[stage] ?? item.headline;
  }
  return item.headline;
}
