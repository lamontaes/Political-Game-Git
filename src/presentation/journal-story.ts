import {
  ageOnDate,
  describePersonContext,
  personName,
  type EntityId,
  type World,
} from "../simulation";
import {
  journalChronicleInFirstPerson,
  journalInFirstPerson,
} from "./journal-first-person";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";
import { proseMonthYear } from "./prose-dates";
import {
  projectWorld39Journal,
  type World39BiographyEntry,
} from "./world39-journal";

export interface JournalStoryParagraph {
  readonly text: string;
  readonly entries: readonly World39BiographyEntry[];
  readonly sourceRecordIds: readonly EntityId[];
}
export interface JournalStoryChapter {
  readonly key: string;
  readonly heading: string;
  readonly paragraphs: readonly JournalStoryParagraph[];
}

const STORY_BANK: AuthoredEnglishBank = {
  key: "journal-life-stretch",
  version: "1",
  surface: "journal",
  variants: [
    { key: "recorded-paragraph", kind: "template", text: "{{story}}" },
  ],
};
// These engine descriptions do not tell a person's life. Omit them rather
// than invent the incident, diagnosis, reason for being home or a reply.
const ENGINE_TEXT =
  /work schedule has no shift|learned about a health episode|as I heard it|the day .+ suggested passed without an answer|going (?:is|was) optional|\b[a-z-]+:us-[a-z]{2}\b/i;

function stretch(
  world: World,
  personId: EntityId,
  entry: World39BiographyEntry,
) {
  const age = ageOnDate(world.people[personId]!.birthDate, entry.at);
  if (entry.at.slice(0, 4) === world.currentDate.slice(0, 4))
    return { key: "this-year", heading: "This year" };
  if (age < 6) return { key: "early-years", heading: "My early years" };
  if (age < 18) return { key: "growing-up", heading: "Growing up" };
  if (age < 25) return { key: "starting-out", heading: "Starting out" };
  return { key: "years-since", heading: "The years since" };
}

function backgroundOrder(entry: World39BiographyEntry) {
  return entry.id.startsWith("birth:")
    ? -1
    : entry.id.startsWith("fact:")
      ? 0
      : 1;
}

/** Same recorded facts, read as paragraphs. No writer or inferred connective cause. */
export function projectJournalStory(
  world: World,
  personId: EntityId,
  year: string | null = null,
): readonly JournalStoryChapter[] {
  const person = world.people[personId];
  if (!person) return [];
  const events = new Map(
    world.history.events.map((event) => [event.id, event]),
  );
  const memories = new Map(
    world.history.memories.map((memory) => [memory.id, memory]),
  );
  const knowledge = new Map(
    world.history.knowledge.map((account) => [account.id, account]),
  );
  const entries = projectWorld39Journal(world, personId)
    .entries.filter(
      (entry) =>
        (!year || entry.at.slice(0, 4) === year) &&
        !ENGINE_TEXT.test(entry.text),
    )
    .sort(
      (left, right) =>
        left.at.localeCompare(right.at) ||
        backgroundOrder(left) - backgroundOrder(right) ||
        left.sequence - right.sequence ||
        left.id.localeCompare(right.id),
    );
  const groups = new Map<
    string,
    { heading: string; entries: World39BiographyEntry[] }
  >();
  for (const entry of entries) {
    const phase = stretch(world, personId, entry);
    const group = groups.get(phase.key);
    if (group) group.entries.push(entry);
    else groups.set(phase.key, { heading: phase.heading, entries: [entry] });
  }
  const mentioned = new Set<EntityId>();
  const relationshipSources = new Map<string, readonly EntityId[]>();
  return [...groups]
    .map(([key, group]) => {
      const labeled = group.entries.map((entry) => {
        const source =
          events.get(entry.sourceId) ??
          events.get(
            memories.get(entry.sourceId)?.eventId ??
              knowledge.get(entry.sourceId)?.eventId ??
              entry.sourceId,
          );
        let text = entry.text;
        for (const id of new Set([
          ...(source?.involvedEntityIds ?? []),
          ...(source?.participants.map((participant) => participant.personId) ??
            []),
        ])) {
          const other = world.people[id];
          if (!other || id === personId || mentioned.has(id)) continue;
          const name = personName(other);
          if (!text.includes(name)) continue;
          const context = describePersonContext(world, personId, id, entry.at);
          if (context?.relationship) {
            const relation = journalInFirstPerson(context.relationship);
            const label = `${relation} ${context.shortName}`;
            text = text.replace(name, label);
            relationshipSources.set(
              entry.id,
              context.anchors.map((anchor) => anchor.recordId),
            );
            if (text.startsWith(label))
              text = text.charAt(0).toUpperCase() + text.slice(1);
          }
          mentioned.add(id);
        }
        return { ...entry, text };
      });
      const told = journalChronicleInFirstPerson(labeled);
      const paragraphs: JournalStoryParagraph[] = [];
      // Duplicate views of the same dated source are said once. Separate
      // transitions remain distinct even when their wording happens to match.
      const seen = new Map<string, World39BiographyEntry[]>();
      const lines: {
        text: string;
        entries: World39BiographyEntry[];
        at: World39BiographyEntry["at"];
        lastAt?: World39BiographyEntry["at"];
      }[] = [];
      const repeatable = new Map<string, (typeof lines)[number]>();
      const original = new Map(group.entries.map((entry) => [entry.id, entry]));
      for (const line of told) {
        if (line.absorbed) {
          lines.at(-1)?.entries.push(line);
          continue;
        }
        const originalText = journalInFirstPerson(original.get(line.id)!.text);
        // Summarize repeated actions, retaining every dated source. Work and
        // school transitions are life rows, so they are never collapsed here.
        const repeatKey =
          line.kind === "event" &&
          /^I (?:met|visited|called|repaired|spoke with|talked with|attended) .+\.$/.test(
            originalText,
          ) &&
          !/\d{4}/.test(originalText)
            ? originalText
            : null;
        const repeated = repeatKey ? repeatable.get(repeatKey) : null;
        if (repeated) {
          repeated.entries.push(line);
          repeated.lastAt = line.at;
          continue;
        }
        const identity = `${line.sourceId}:${line.at}:${line.firstPerson}`;
        const existing = seen.get(identity);
        if (existing) {
          existing.push(line);
          continue;
        }
        const sources: World39BiographyEntry[] = [line];
        seen.set(identity, sources);
        const recordedLine = {
          text: line.firstPerson,
          entries: sources,
          at: line.at,
        };
        lines.push(recordedLine);
        if (repeatKey) repeatable.set(repeatKey, recordedLine);
      }
      const stretches: (typeof lines)[] = [];
      for (const line of lines) {
        const prior = stretches.at(-1);
        // Saved background and lived incidents form separate paragraphs;
        // neither becomes a dependent clause of the other.
        if (
          !prior ||
          prior.length === 4 ||
          prior[0]!.entries[0]!.kind !== line.entries[0]!.kind
        )
          stretches.push([line]);
        else prior.push(line);
      }
      for (const [offset, part] of stretches.entries()) {
        let previousYear: string | null = null;
        const prose = part
          .map((line, index) => {
            const year = line.at.slice(0, 4);
            const saysWhen =
              /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\b/.test(
                line.text,
              );
            let text = line.text;
            if (line.lastAt) {
              const later =
                line.lastAt === line.at
                  ? "again that day"
                  : line.lastAt.slice(0, 7) === line.at.slice(0, 7)
                    ? "again later that month"
                    : `again in ${proseMonthYear(line.lastAt)}`;
              text = `${text.replace(/\.$/, "")} in ${proseMonthYear(line.at)}, and ${later}.`;
            }
            if (
              !line.lastAt &&
              !saysWhen &&
              (index === 0 || year !== previousYear)
            ) {
              const lead = proseMonthYear(line.at);
              text = `In ${lead}, ${/^(My|The|A|An)\b/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text}`;
            }
            previousYear = year;
            // Two actions in the same dated stretch can share their subject.
            // "and" connects recorded actions; it supplies no motive or cause.
            if (
              index % 2 === 1 &&
              year === part[index - 1]!.at.slice(0, 4) &&
              /^I [a-z]/.test(text)
            )
              return `and ${text.slice(2)}`;
            return text;
          })
          .reduce(
            (story, line) =>
              line.startsWith("and ")
                ? `${story.replace(/\.$/, "")}, ${line}`
                : `${story}${story ? " " : ""}${line}`,
            "",
          );
        const sourceEntries = part.flatMap((line) => line.entries);
        const sourceRecordIds = [
          ...new Set(
            sourceEntries.flatMap((entry) => [
              entry.sourceId,
              ...(relationshipSources.get(entry.id) ?? []),
            ]),
          ),
        ];
        const packet: GroundedEnglishPacket = {
          surface: "journal",
          momentKey: `journal-story:${personId}:${key}:${offset}`,
          worldSeed: world.seed,
          bankVersion: "1",
          stage: "recorded",
          sourceRecordIds,
          facts: { story: { text: prose, sourceRecordIds } },
          viewer: { personId, traits: {} },
          knowledge: [{ personId, factKey: "story", sourceRecordIds }],
        };
        const rendered = renderGroundedEnglish(packet, STORY_BANK);
        if (rendered.kind === "rendered")
          paragraphs.push({
            text: rendered.text,
            entries: sourceEntries,
            sourceRecordIds,
          });
      }
      return { key, heading: group.heading, paragraphs };
    })
    .filter((chapter) => chapter.paragraphs.length > 0);
}
