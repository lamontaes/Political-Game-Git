import {
  kinshipRelationshipsAt,
  personName,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import { speakerTraits } from "./speaker-traits";
import {
  projectWorld39Journal,
  type World39BiographyEntry,
} from "./world39-journal";

export interface JournalChapter {
  readonly key: string;
  readonly title: string;
  readonly entries: readonly World39BiographyEntry[];
  readonly from: IsoDate;
  readonly through: IsoDate;
  readonly firstMentionKin: readonly {
    readonly entryId: string;
    readonly personId: EntityId;
    readonly name: string;
    readonly relation: string;
  }[];
}

const TITLE_BANK: ComposedLineBank = {
  key: "journal-chapter-title",
  version: "1",
  surface: "journal",
  act: "tell",
  parts: {
    core: {
      variants: [
        {
          key: "recorded-turn",
          kind: "template",
          text: "{{turn}}",
        },
      ],
    },
  },
};

function lifeTurn(
  world: World,
  entry: World39BiographyEntry,
  eventsById: ReadonlyMap<string, World["history"]["events"][number]>,
): string | null {
  if (entry.id.startsWith("education:")) {
    const state = world.history.educationEnrollmentStates.find(
      (record) => record.id === entry.sourceId,
    );
    const enrollment = state
      ? world.history.educationEnrollments.find(
          (record) => record.id === state.enrollmentId,
        )
      : null;
    return `school:${enrollment?.programKind ?? entry.sourceId}`;
  }
  if (entry.id.startsWith("work:")) {
    const state = world.history.workStatuses.find(
      (record) => record.id === entry.sourceId,
    );
    return `work:${state?.workRelationshipId ?? entry.sourceId}`;
  }
  if (
    entry.id.startsWith("fact:") &&
    /\bYou (?:live|lived) in\b/i.test(entry.text)
  )
    return "move";
  const event = eventsById.get(entry.sourceId);
  if (
    event?.tags.includes("vitality.death") ||
    /\b(?:died|death|lost|loss|grief)\b/i.test(entry.text)
  )
    return "loss";
  if (
    event?.type === "world.office-tenure" ||
    event?.type.includes("officeholder") ||
    /\b(?:elected|appointed|sworn in|took office|served as)\b/i.test(entry.text)
  )
    return "office";
  return null;
}

function titleFor(
  world: World,
  personId: EntityId,
  entry: World39BiographyEntry,
  ordinal: number,
): string {
  const sourceRecordIds = [entry.sourceId];
  const facts = { turn: { text: entry.text, sourceRecordIds } };
  const packet: GroundedEnglishPacket = {
    surface: "journal",
    momentKey: `journal-chapter:${personId}:${entry.id}:${ordinal}`,
    worldSeed: world.seed,
    bankVersion: TITLE_BANK.version,
    stage: "journal",
    sourceRecordIds,
    facts,
    viewer: { personId, traits: speakerTraits(world, personId) },
    knowledge: [{ personId, factKey: "turn", sourceRecordIds }],
  };
  const rendered = composeGroundedLine(packet, TITLE_BANK);
  return rendered.kind === "rendered" ? rendered.text : entry.text;
}

/** Projects one life through a caller-supplied date, directly from saved records. */
export function composeChapters(
  world: World,
  personId: EntityId,
  through: IsoDate,
): readonly JournalChapter[] {
  if (!world.people[personId]) return [];
  const entries = projectWorld39Journal(world, personId).entries.filter(
    (entry) => entry.at <= through,
  );
  const eventsById = new Map(
    world.history.events.map((event) => [event.id, event]),
  );
  const firstMentionKin = new Map<
    string,
    { personId: EntityId; name: string; relation: string }
  >();
  for (const relationship of kinshipRelationshipsAt(world, personId)
    .filter((record) => record.establishedAt <= through)
    .sort(
      (a, b) =>
        a.establishedAt.localeCompare(b.establishedAt) ||
        a.sequence - b.sequence,
    )) {
    const relativeId = relationship.personIds.find((id) => id !== personId);
    const relative = relativeId ? world.people[relativeId] : null;
    if (!relativeId || !relative || firstMentionKin.has(relativeId)) continue;
    const relationKind = relationship.kind.includes("parent-child")
      ? relationship.personIds[0] === personId
        ? "child"
        : "parent"
      : relationship.kind.includes("sibling")
        ? "sibling"
        : "relative";
    const gender = relative.identity?.gender;
    const relation =
      relationKind === "parent"
        ? gender === "female"
          ? "mother"
          : gender === "male"
            ? "father"
            : "parent"
        : relationKind === "child"
          ? gender === "female"
            ? "daughter"
            : gender === "male"
              ? "son"
              : "child"
          : relationKind === "sibling"
            ? gender === "female"
              ? "sister"
              : gender === "male"
                ? "brother"
                : "sibling"
            : "relative";
    firstMentionKin.set(relativeId, {
      personId: relativeId,
      name: personName(relative),
      relation,
    });
  }
  const groups: {
    turn: World39BiographyEntry;
    entries: World39BiographyEntry[];
  }[] = [];
  let currentTurn: string | null = null;
  for (const entry of entries) {
    const turn = lifeTurn(world, entry, eventsById);
    const turnKind = turn?.split(":", 1)[0];
    if (
      turn &&
      (turn !== currentTurn ||
        turnKind === "move" ||
        turnKind === "office" ||
        turnKind === "loss")
    ) {
      groups.push({ turn: entry, entries: [] });
      currentTurn = turn;
    }
    if (groups.length === 0) groups.push({ turn: entry, entries: [] });
    groups[groups.length - 1]!.entries.push(entry);
  }
  return groups.map((group, ordinal) => {
    const first = group.entries[0]!;
    const last = group.entries[group.entries.length - 1]!;
    return {
      key: `${first.id}:${ordinal}`,
      title: titleFor(world, personId, group.turn, ordinal),
      entries: group.entries,
      from: first.at,
      through: last.at,
      firstMentionKin: group.entries.flatMap((entry) => {
        if (!entry.id.startsWith("kinship:")) return [];
        const relationship = world.history.kinshipRelationships.find(
          (candidate) => candidate.id === entry.sourceId,
        );
        const relativeId = relationship?.personIds.find(
          (id) => id !== personId,
        );
        const kin = relativeId ? firstMentionKin.get(relativeId) : undefined;
        if (!kin) return [];
        firstMentionKin.delete(relativeId!);
        return [{ ...kin, entryId: entry.id }];
      }),
    };
  });
}
