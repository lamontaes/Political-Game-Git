import {
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  organizationProfileAt,
  workRelationshipHistoryForPerson,
  workStatusAt,
  workStatusHistory,
  type EntityId,
  type World,
} from "../simulation";
import { journalInFirstPerson } from "./journal-first-person";
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
export function projectLifeSoFarEnglish(world: World, personId: EntityId) {
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
  for (let offset = 0; offset < schooling.length; offset += 3) {
    const group = schooling.slice(offset, offset + 3);
    const facts = Object.fromEntries(
      group.map((school, index) => [`school-${index}`, school]),
    );
    const core =
      group.length === 1
        ? "You began {{school-0}}."
        : group.length === 2
          ? "You began {{school-0}}, followed by {{school-1}}."
          : "You began {{school-0}}, followed by {{school-1}} and {{school-2}}.";
    const bank: ComposedLineBank = {
      key: "opening-life-so-far",
      version: "1",
      surface: "scene",
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
      surface: "scene",
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
    if (rendered.kind === "rendered")
      schoolSentences.push(journalInFirstPerson(rendered.text));
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
              statuses: workStatusHistory(world, record.id),
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        a.record.startedAt.localeCompare(b.record.startedAt) ||
        a.record.sequence - b.record.sequence,
    );
  const workLines = work.flatMap((entry) => {
    // An expected engagement is not a completed start.
    if (!entry.statuses.some((status) => status.status === "active")) return [];
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
      surface: "scene",
      act: "tell",
      parts: {
        core: {
          variants: [
            {
              key: entry.active ? "current-start" : "earlier-start",
              kind: "template",
              text: "You started work at {{work-name}} in {{work-year}}.",
            },
          ],
        },
      },
    };
    const packet: GroundedEnglishPacket = {
      surface: "scene",
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
    const rows = [
      {
        text: journalInFirstPerson(line.text),
        at: entry.record.startedAt,
        sequence: entry.record.sequence,
        sourceRecordIds,
      },
    ];
    let previous = "active";
    for (const status of entry.statuses) {
      const year = status.effectiveAt.slice(0, 4);
      const text =
        status.status === "ended"
          ? `My work at ${entry.name} ended in ${year}.`
          : status.status === "temporarily-inactive"
            ? `My work at ${entry.name} was on hold in ${year}.`
            : status.status === "active" && previous === "temporarily-inactive"
              ? `My work at ${entry.name} resumed in ${year}.`
              : null;
      previous = status.status;
      // These are saved transitions for this job, not proof of unemployment
      // across all jobs. Raw reasons are engine copy (as in world39-journal).
      if (text)
        rows.push({
          text,
          at: status.effectiveAt,
          sequence: status.sequence,
          sourceRecordIds: [...sourceRecordIds, status.id],
        });
    }
    return rows;
  });
  workLines.sort((a, b) => a.at.localeCompare(b.at) || a.sequence - b.sequence);
  return {
    sentences: [
      ...life.sentences
        .filter(
          (sentence) =>
            !/^(No one else is recorded|Your current household is not recorded)/.test(
              sentence,
            ),
        )
        .map((sentence) =>
          journalInFirstPerson(sentence.replace(/^You're /, "You are "))
            // Unlike a past event entry, this opening starts with who I am now.
            .replace(/^I was (\d+)/, "I'm $1")
            .replace(/\bI lived\b/g, "I live"),
        ),
      ...schoolSentences,
      ...workLines.map((line) => line.text),
      ...work
        .filter((entry) => entry.active)
        .map((entry) => `I still work at ${entry.name}.`),
    ],
    sourceRecordIds: [
      ...schooling.flatMap((school) => school.sourceRecordIds),
      ...workLines.flatMap((line) => line.sourceRecordIds),
      ...work
        .filter((entry) => entry.active)
        .map((entry) => workStatusAt(world, entry.record.id)!.id),
    ],
  };
}
