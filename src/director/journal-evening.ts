/**
 * The Journal's first evening (the Story lead's brief, Nov 24, 2026: "the
 * first Journal page"; owner, Nov 23, P43: "The journal is still a list of
 * facts"). The night the game opens, the player and their household watched
 * the President's address on the news (the director's opening, recorded as a
 * public event with them as witnesses). Until now no Journal row read it, so
 * the evening was never written. It is told here as one diary entry through
 * the outline planner (row `journal-evening`): who watched, what the speech
 * was about, where the player stands on it by their own recorded view, and a
 * close that looks ahead, the way a diary entry ends.
 */
import type { EntityId } from "../core2/kernel/brands";
import { P } from "../core2/parameters";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreState, IsoDate, PersonId } from "../core2/types";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { JOURNAL_EVENING, tell } from "../english/outline-planner";
import speechOutlines from "./data/speech-outlines.json" with { type: "json" };
import { addressPointFor } from "./conversation";
import type { JournalChapter } from "./journal";
import type { Director } from "./ledger";
import { addressPoints } from "./opening-facts";
import { spoken } from "./words";

/** The most housemates a diary entry names one by one before it says "the whole house". */
const WATCHERS_NAMED = JOURNAL_EVENING.watchersNamed;
/** The player in a list of watchers, as subject and as object. */
const SELF = JOURNAL_EVENING.self;

const THEME = speechOutlines as unknown as {
  themeNames: Record<string, string>;
  themeShort: Record<string, string>;
};

/** A list of names as a sentence says it: "Ann", "Ann and Joe", "Ann, Joe and Lee". */
function namesSaid(names: readonly string[]): string {
  if (names.length <= P.one) return names.join("");
  return `${names.slice(P.zero, -P.one).join(", ")} and ${names.at(-P.one)}`;
}

/**
 * The opening evening as one Journal chapter, or null when the person did
 * not watch it or it is past the page's last day.
 */
export function eveningChapter(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  through: IsoDate,
): JournalChapter | null {
  const story = director.ledger.opening;
  if (!story || story.date > through) return null;
  if (!story.home.memberIds.includes(personId)) return null;
  const me = core.people.get(personId);
  if (!me) return null;
  const ids = [story.id as EntityId];
  const fact = (text: string, from: readonly string[] = ids) => ({
    text,
    sourceRecordIds: from as EntityId[],
  });
  const facts: Record<string, GroundedEnglishFact> = {
    "president-name": fact(story.president.name),
  };
  const others = story.home.memberIds
    .filter((id) => id !== personId)
    .map((id) => core.people.get(id))
    .filter((person) => !!person?.alive);
  // Everyone else at home watched it with them: past a few, "the whole
  // house" is how a diarist says it.
  const named = [story.id, ...others.map((person) => person!.id)];
  const many = others.length > WATCHERS_NAMED.value;
  if (many) facts["watched-many"] = fact("yes", named);
  else if (others.length) {
    const first = others.map((person) => person!.givenName);
    facts.we = fact(namesSaid([...first, SELF.subject]), named);
    facts.us = fact(namesSaid([...first, SELF.object]), named);
  } else facts.alone = fact("yes", [story.id, personId]);
  if (story.theme && THEME.themeNames[story.theme]) {
    facts["theme-name"] = fact(THEME.themeNames[story.theme]!);
    if (THEME.themeShort[story.theme])
      facts["theme-short"] = fact(THEME.themeShort[story.theme]!);
  }
  const point = addressPoints(story).find((row) => row.kind === "policy");
  if (point) {
    facts.about = fact(point.about, [story.id, ...point.sourceRecordIds]);
    if (point.stance)
      facts[`president-${point.stance}`] = fact("yes", point.sourceRecordIds);
    const mine = addressPointFor(core, personId, [point]);
    if (mine) facts[`stand-${mine.stand}`] = fact("yes", [personId]);
  }
  const home = corePlaceByJurisdictionId(me.placeId as never);
  if (home) facts.place = fact(spoken(home), [me.householdId]);
  const told = tell({
    kind: "journal-evening",
    facts,
    momentKey: `journal:${story.id}:${personId}`,
    worldSeed: core.seed,
    sourceRecordIds: ids,
    knower: personId as EntityId,
    traits: me.traits,
  });
  if (!told) return null;
  const title = new Date(`${story.date}T00:00:00Z`).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" },
  );
  return {
    key: `evening:${story.date}`,
    title,
    from: story.date as IsoDate,
    through: story.date as IsoDate,
    lines: told.paragraphs.map((text, at) => ({
      id: `journal:${story.id}:${personId}:${at}`,
      date: story.date as IsoDate,
      text,
      momentIds: [story.id],
      sourceRecordIds: [
        ...new Set(
          told.sentences
            .filter((row) => row.paragraph === at)
            .flatMap((row) => row.sourceRecordIds),
        ),
      ],
    })),
  };
}
