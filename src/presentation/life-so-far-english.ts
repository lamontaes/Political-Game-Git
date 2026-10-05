import {
  describePersonContext,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  organizationProfileAt,
  personName,
  workRelationshipHistoryForPerson,
  workStatusAt,
  type EntityId,
  type World,
} from "../simulation";
import { buildLifeIntroduction } from "./life-introduction";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

const PROGRAMS: Readonly<Record<string, string>> = {
  "schooling:elementary": "elementary school",
  "schooling:middle": "middle school",
  "schooling:secondary": "high school",
  "schooling:tertiary": "college",
};

/** Saved starts, not graduation or a claim about a real historical school. */
export interface LifeJournalLine {
  readonly date: World["currentDate"];
  readonly text: string;
  readonly sourceRecordIds: readonly EntityId[];
}

export function projectLifeSoFarEnglish(
  world: World,
  personId: EntityId,
  journalLine?: (line: LifeJournalLine) => void,
) {
  const life = buildLifeIntroduction(world, personId);
  if (!life) return { sentences: [], sourceRecordIds: [] };
  const schooling = educationEnrollmentHistoryForPerson(world, personId)
    .filter(
      (record) =>
        record.startedAt <= world.currentDate &&
        educationEnrollmentStateAt(world, record.id)?.status !== "expected",
    )
    .flatMap((record) => {
      const school = organizationProfileAt(world, record.organizationId);
      const label = PROGRAMS[record.programKind];
      return school?.name && label
        ? [
            {
              text: `${label} at ${school.name} in ${record.startedAt.slice(0, 4)}`,
              sourceRecordIds: [record.id, record.organizationId],
              startedAt: record.startedAt,
            },
          ]
        : [];
    })
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const schoolSentences: string[] = [];
  for (
    let offset = 0;
    offset < schooling.length;
    offset += journalLine ? 1 : 3
  ) {
    const group = schooling.slice(offset, offset + (journalLine ? 1 : 3));
    const facts = Object.fromEntries(
      group.map((school, index) => [`school-${index}`, school]),
    );
    const core = journalLine
      ? "I began {{school-0}}."
      : group.length === 1
        ? "You began {{school-0}}."
        : group.length === 2
          ? "You began {{school-0}}, followed by {{school-1}}."
          : "You began {{school-0}}, followed by {{school-1}} and {{school-2}}.";
    const bank: ComposedLineBank = {
      key: "opening-life-so-far",
      version: "1",
      surface: journalLine ? "journal" : "scene",
      act: "tell",
      parts: {
        core: {
          variants: [
            { key: `schools-${group.length}`, kind: "template", text: core },
          ],
        },
      },
    };
    const packet: GroundedEnglishPacket = {
      surface: journalLine ? "journal" : "scene",
      momentKey: `life-so-far:${personId}:${world.currentDate}:${offset}`,
      worldSeed: world.seed,
      bankVersion: "1",
      stage: "opening",
      sourceRecordIds: group.flatMap((school) => school.sourceRecordIds),
      facts,
      viewer: { personId, traits: {} },
      knowledge: Object.entries(facts).map(([factKey, fact]) => ({
        personId,
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })),
    };
    const rendered = composeGroundedLine(packet, bank);
    if (rendered.kind === "rendered") {
      schoolSentences.push(rendered.text);
      journalLine?.({
        date: group[0]!.startedAt,
        text: rendered.text,
        sourceRecordIds: packet.sourceRecordIds,
      });
    }
  }
  // The preceding family card and each person's dossier carry kinship detail.
  // This short overview follows schooling and work, rather than listing every
  // extended relative again as a series of isolated record sentences.
  const work = workRelationshipHistoryForPerson(world, personId)
    .filter(
      (record) =>
        record.startedAt <= world.currentDate && record.organizationId !== null,
    )
    .flatMap((record) => {
      const organizationId = record.organizationId;
      const name = organizationId
        ? organizationProfileAt(world, organizationId)?.name
        : null;
      return name && organizationId
        ? [
            {
              record,
              name,
              organizationId,
              active: workStatusAt(world, record.id)?.status === "active",
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        a.record.startedAt.localeCompare(b.record.startedAt),
    );
  const workSentences = work.flatMap((entry) => {
    const sourceRecordIds = [entry.record.id, entry.organizationId];
    const facts = {
      "work-name": { text: entry.name, sourceRecordIds },
      "work-year": {
        text: entry.record.startedAt.slice(0, 4),
        sourceRecordIds,
      },
    };
    const bank: ComposedLineBank = {
      key: "opening-recorded-work",
      version: "1",
      surface: journalLine ? "journal" : "scene",
      act: "tell",
      parts: {
        core: {
          variants: [
            {
              key: entry.active ? "current-start" : "earlier-start",
              kind: "template",
              text: journalLine
                ? "I started work at {{work-name}} in {{work-year}}."
                : entry.active
                  ? "Since {{work-year}}, you've worked at {{work-name}}."
                  : "You started work at {{work-name}} in {{work-year}}.",
            },
          ],
        },
      },
    };
    const packet: GroundedEnglishPacket = {
      surface: journalLine ? "journal" : "scene",
      momentKey: `life-so-far:work:${personId}:${world.currentDate}:${entry.record.id}`,
      worldSeed: world.seed,
      bankVersion: "1",
      stage: "opening",
      sourceRecordIds,
      facts,
      viewer: { personId, traits: {} },
      knowledge: Object.keys(facts).map((factKey) => ({
        personId,
        factKey,
        sourceRecordIds,
      })),
    };
    const line = composeGroundedLine(packet, bank);
    if (line.kind !== "rendered") return [];
    journalLine?.({
      date: entry.record.startedAt,
      text: line.text,
      sourceRecordIds,
    });
    return [line.text];
  });
  return {
    sentences: [
      ...life.sentences.filter(
        (sentence) => !/^No one else is recorded/.test(sentence),
      ),
      ...schoolSentences,
      ...workSentences,
    ],
    sourceRecordIds: [
      ...schooling.flatMap((school) => school.sourceRecordIds),
      ...work.flatMap((entry) => [entry.record.id, entry.organizationId]),
    ],
  };
}

/** First-person chapters use the same saved starts and English composition path. */
export function projectLifeSoFarJournal(
  world: World,
  personId: EntityId,
): readonly LifeJournalLine[] {
  const lines: LifeJournalLine[] = [];
  projectLifeSoFarEnglish(world, personId, (line) => lines.push(line));
  const life = buildLifeIntroduction(world, personId);
  if (!life) return lines;
  // Relationship labels are canonical, not guessed from a name or portrait.
  for (const relative of life.household) {
    if (!relative.relationship) continue;
    const context = describePersonContext(world, personId, relative.personId);
    if (!context || !relative.relationship.startsWith("your ")) continue;
    const sourceRecordIds = [
      relative.personId,
      ...context.anchors.map((anchor) => anchor.recordId),
    ];
    const facts = {
      relative: {
        text: `${relative.relationship.replace(/^your /, "my ")}, ${personName(world.people[relative.personId]!)}`,
        sourceRecordIds,
      },
    };
    const packet: GroundedEnglishPacket = {
      surface: "journal",
      momentKey: `life-journal:family:${personId}:${relative.personId}:${world.currentDate}`,
      worldSeed: world.seed,
      bankVersion: "1",
      stage: "opening",
      sourceRecordIds,
      facts,
      speaker: { personId, traits: {} },
      viewer: { personId, traits: {} },
      knowledge: [{ personId, factKey: "relative", sourceRecordIds }],
    };
    const bank: ComposedLineBank = {
      key: "life-journal-family",
      version: "1",
      surface: "journal",
      act: "tell",
      parts: {
        core: {
          variants: [
            {
              key: "shared-home",
              kind: "template",
              text: "I live with {{relative}}.",
            },
          ],
        },
      },
    };
    const rendered = composeGroundedLine(packet, bank);
    if (rendered.kind === "rendered")
      lines.push({
        date: world.currentDate,
        text: rendered.text,
        sourceRecordIds,
      });
  }
  return lines.sort((a, b) => a.date.localeCompare(b.date));
}
