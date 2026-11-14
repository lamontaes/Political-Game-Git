/**
 * What a funeral may say, from the record that caused it (`life.death`, the
 * health engine's death record) and the records around the person who died:
 * their name as each mourner says it, who they were to the player, and what
 * they cared about, as strongly as the records show it (something they did on
 * record, else their own strongest drive). Each fact is cited to the records
 * it came from; a fact with no record behind it is left out, so the lines that
 * need it never play: a death with nothing on record about what the person
 * cared for plays no request to carry anything on. Before this file nothing
 * wrote `deceased`, every line that states the funeral's request needs it, and
 * the scene could never be worded.
 */
import { familyFactsOf } from "../core2/closeness";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { kinAddress, relationPhrase } from "../english/journal-words";
import { topicInSentence } from "../english/policy-names";
import type { NewsFact } from "./life-news";
import { organizationName } from "./words";

/** The situation type that reads these facts. */
export const FUNERAL_TYPE = "funeral";

/** The core record kind a death leaves. */
const DEATH_KIND = "life.death";

/** A government's name said with its article ("the Town of Smithtown"); any other name as it stands. */
const WITH_ARTICLE =
  /^(?:town|city|village|borough|township|county|state|commonwealth|territory|district) of /i;

/** What the dead person did on record about a cause, and the fact that says it. */
const DEEDS: Readonly<Record<string, string>> = {
  "initiative.organizing-started": "cause-organized",
  "office.approached": "cause-approached",
  "association.requested": "cause-joined",
};

/**
 * The facts for `askerId`, a mourner, speaking to `askedId`, whose loss it
 * is. Empty for any other type, or a cause that is not a death.
 */
export function funeralFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, NewsFact> {
  if (typeKey !== FUNERAL_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== DEATH_KIND) return {};
  const goneId = record.personIds.at(P.zero);
  const gone = goneId ? core.people.get(goneId) : undefined;
  if (!goneId || !gone) return {};
  const gender = gone.looks?.gender ?? "other";
  const name: NewsFact = {
    text: gone.givenName,
    sourceRecordIds: [causeId, goneId],
  };
  const facts: Record<string, NewsFact> = { deceased: name };
  // How the player's own records name the tie ("your father"), and what the
  // player calls them ("Dad"); never guessed, and a relation with no word
  // is said by first name.
  const kin = familyFactsOf(core.people.get(askedId)).get(goneId);
  const phrase = kin
    ? relationPhrase(kin.relation, gender, "scene")
    : undefined;
  if (kin && phrase)
    facts["deceased-tie"] = {
      text: phrase,
      sourceRecordIds: [causeId, kin.factId],
    };
  const own = kin ? kinAddress(kin.relation, gender) : undefined;
  facts["deceased-address"] =
    kin && own ? { text: own, sourceRecordIds: [causeId, kin.factId] } : name;
  // What the mourner calls them: "Dad" for one who has the same word, else
  // the first name.
  const theirs = familyFactsOf(core.people.get(askerId)).get(goneId);
  const said = theirs ? kinAddress(theirs.relation, gender) : undefined;
  facts["deceased-said"] =
    theirs && said
      ? { text: said, sourceRecordIds: [causeId, theirs.factId] }
      : name;
  // What they cared about. Best is a deed on record (organized around it,
  // approached an office about it, joined a group for it): the latest, by
  // date and id. The fallback is their own strongest drive, said as a thing
  // they cared about and never as something they asked for.
  const deeds = [...(core.logByPerson.get(goneId) ?? [])]
    .flatMap((id) => {
      const row = core.durableLog.get(id);
      return row && row.personIds.at(P.zero) === goneId && DEEDS[row.kind]
        ? [row]
        : [];
    })
    .filter((row) => (row.topic ? topicInSentence(row.topic) : null) !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const deed = deeds[P.zero];
  if (deed) {
    facts.cause = {
      text: topicInSentence(deed.topic!)!,
      sourceRecordIds: [causeId, deed.id],
    };
    facts[DEEDS[deed.kind]!] = {
      text: "yes",
      sourceRecordIds: [causeId, deed.id],
    };
    // The office or group the deed was about, when the record names it.
    const organizationId = (deed.facts as Record<string, unknown> | undefined)
      ?.organizationId;
    const org =
      typeof organizationId === "string"
        ? (core.publicOrganizations.get(organizationId) ??
          core.organizations.get(organizationId))
        : undefined;
    const named = org ? organizationName(org) : "";
    const slot =
      DEEDS[deed.kind] === "cause-approached" ? "office-said" : "group-said";
    if (named && DEEDS[deed.kind] !== "cause-organized")
      facts[slot] = {
        text: WITH_ARTICLE.test(named) ? `the ${named}` : named,
        sourceRecordIds: [causeId, deed.id, org!.id],
      };
    return facts;
  }
  const drive = [...(gone.drives?.values() ?? [])].sort(
    (a, b) => b.strength - a.strength || a.id.localeCompare(b.id),
  )[P.zero];
  const topic = drive ? topicInSentence(drive.topic) : null;
  if (drive && topic) {
    facts.cause = { text: topic, sourceRecordIds: [causeId, goneId, drive.id] };
    facts["cause-cared"] = {
      text: "yes",
      sourceRecordIds: [causeId, goneId, drive.id],
    };
  }
  return facts;
}
