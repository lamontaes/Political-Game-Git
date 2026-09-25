import {
  personName,
  workRoleAt,
  type EntityId,
  type World,
} from "../simulation";
import type { JournalView } from "./shell-navigation";
import { projectJournalView, type JournalViewModel } from "./journal-views";
import {
  groupWorld39Chapters,
  type World39BiographyEntry,
} from "./world39-journal";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";
import { proseDate } from "./prose-dates";
import {
  buildSavedWorkStartJournalPacket,
  WORK_START_JOURNAL_BANK,
} from "./work-start-journal-english";

/** A separate, selective first-person projection over the same saved history. */
const MY_LIFE_BANK: AuthoredEnglishBank = {
  key: "my-life-milestones",
  version: "1",
  surface: "journal",
  variants: [
    {
      key: "birth",
      kind: "template",
      stages: ["birth"],
      text: "I was born on {{date}}.",
    },
    {
      key: "district-seat-start",
      kind: "template",
      stages: ["district-seat-start"],
      text: "I began serving District {{district}} in the {{chamber}}.",
    },
    {
      key: "office-start",
      kind: "template",
      stages: ["office-start"],
      text: "I began serving as {{office-role}}.",
    },
    {
      key: "governor-began-serving",
      kind: "template",
      stages: ["governor-start"],
      text: "I began serving as {{office-role}}.",
    },
    {
      key: "governor-became",
      kind: "template",
      stages: ["governor-start"],
      text: "I became {{office-role}}.",
    },
    {
      key: "governor-term-began",
      kind: "template",
      stages: ["governor-start"],
      text: "My term as {{office-role}} began.",
    },
  ],
};

/**
 * The main Journal tells this person's life in their own voice. The dated
 * Record continues to carry the unabridged history. A missing or unreviewed
 * phrase is omitted here, rather than fabricated from a second-person line.
 */
export function projectMyLifeJournalView(
  world: World,
  personId: EntityId,
  view: JournalView,
  year: string | null,
): JournalViewModel {
  const person = world.people[personId];
  if (!person) return projectJournalView(world, personId, view, year);

  const entries: World39BiographyEntry[] = [];
  const birth = renderGroundedEnglish(
    packet(world, personId, person.id, "birth", {
      date: { text: proseDate(person.birthDate), sourceRecordIds: [person.id] },
    }),
    MY_LIFE_BANK,
  );
  if (birth.kind === "rendered")
    entries.push({
      id: `my-life:birth:${person.id}`,
      at: person.birthDate,
      sequence: -1,
      kind: "life",
      text: birth.text,
      sourceId: person.id,
    });

  const relationships = new Map(
    world.history.workRelationships
      .filter(
        (row) =>
          row.personId === personId && row.recordedAt <= world.currentDate,
      )
      .map((row) => [row.id, row]),
  );
  const starts = world.history.workStatuses
    .filter(
      (row) =>
        row.status === "active" &&
        row.effectiveAt <= world.currentDate &&
        relationships.has(row.workRelationshipId),
    )
    .sort(
      (a, b) =>
        a.effectiveAt.localeCompare(b.effectiveAt) || a.sequence - b.sequence,
    );
  const seen = new Set<EntityId>();
  let lastWork: { employerId: EntityId | null; title: string } | null = null;
  for (const start of starts) {
    if (seen.has(start.workRelationshipId)) continue;
    seen.add(start.workRelationshipId);
    const relationship = relationships.get(start.workRelationshipId)!;
    const cutoff = {
      asOfDate: start.effectiveAt,
      historySequenceExclusive: world.history.nextSequence,
    };
    const role = workRoleAt(world, relationship.id, cutoff);
    if (!role?.title.trim()) continue;

    let text: string | null = null;
    if (isPublicOffice(relationship.kind)) {
      const districtSeat =
        /^Member of the (.+), District ([A-Za-z0-9-]+)$/.exec(role.title);
      const phrase = districtSeat ? null : publicOfficeRolePhrase(role.title);
      if (!districtSeat && !phrase) continue;
      const rendered = districtSeat
        ? renderGroundedEnglish(
            packet(world, personId, start.id, "district-seat-start", {
              chamber: { text: districtSeat[1]!, sourceRecordIds: [role.id] },
              district: { text: districtSeat[2]!, sourceRecordIds: [role.id] },
            }),
            MY_LIFE_BANK,
          )
        : renderGroundedEnglish(
            packet(
              world,
              personId,
              start.id,
              /^Governor of [A-Za-z .'-]+$/.test(role.title)
                ? "governor-start"
                : "office-start",
              {
                "office-role": { text: phrase!, sourceRecordIds: [role.id] },
              },
            ),
            MY_LIFE_BANK,
          );
      text = rendered.kind === "rendered" ? rendered.text : null;
    } else if (
      (relationship.compensation === "paid" ||
        relationship.compensation === "mixed") &&
      (!lastWork ||
        lastWork.employerId !== relationship.organizationId ||
        lastWork.title !== role.title)
    ) {
      // A first paid job and a later change of employer or role merit the
      // short story; a repeated status on the same work does not.
      const built = buildSavedWorkStartJournalPacket(
        world,
        personId,
        start.id,
        {
          establishedYear:
            view === "years" ? start.effectiveAt.slice(0, 4) : null,
        },
      );
      if (built.kind === "packet") {
        const rendered = renderGroundedEnglish(
          built.packet,
          WORK_START_JOURNAL_BANK,
        );
        text = rendered.kind === "rendered" ? rendered.text : null;
      }
      if (text)
        lastWork = {
          employerId: relationship.organizationId,
          title: role.title,
        };
    }
    if (!text) continue;
    entries.push({
      id: `my-life:work:${start.id}`,
      at: start.effectiveAt,
      sequence: start.sequence,
      kind: "life",
      text,
      sourceId: start.id,
    });
  }

  entries.sort(
    (a, b) =>
      a.at.localeCompare(b.at) ||
      a.sequence - b.sequence ||
      a.id.localeCompare(b.id),
  );
  return projectJournalView(
    world,
    personId,
    view,
    year,
    {
      name: personName(person),
      entries,
      chapters: groupWorld39Chapters(entries, person.birthDate),
    },
    false,
  );
}

function packet(
  world: World,
  personId: EntityId,
  sourceId: EntityId,
  stage: string,
  facts: GroundedEnglishPacket["facts"],
): GroundedEnglishPacket {
  return {
    surface: "journal",
    momentKey: sourceId,
    worldSeed: world.seed,
    bankVersion: MY_LIFE_BANK.version,
    stage,
    sourceRecordIds: [sourceId],
    facts,
    viewer: { personId, traits: {} },
    knowledge: Object.keys(facts).map((factKey) => ({
      personId,
      factKey,
      sourceRecordIds: [sourceId],
    })),
  };
}

function isPublicOffice(kind: string): boolean {
  return (
    kind === "employment:legislative-member" ||
    kind === "employment:executive-office" ||
    kind === "employment:executive-officeholder" ||
    kind === "employment:vice-presidential-officeholder" ||
    kind === "employment:judicial-office-practice"
  );
}

/** Only recognizable saved office titles are rephrased; others stay in Record. */
export function publicOfficeRolePhrase(title: string): string | null {
  const member =
    /^Member of the (.+?)(?:, (District \d+|At Large|Seat \d+))?$/.exec(title);
  if (member) {
    if (member[2] === "At Large")
      return `an at-large member of the ${member[1]}`;
    return `a member of the ${member[1]}${member[2] ? ` for ${member[2]}` : ""}`;
  }
  if (/^(Senator|Representative|Judge)(?:\b|$)/.test(title))
    return `a ${title[0]!.toLocaleLowerCase("en-US")}${title.slice(1)}`;
  if (/^(President|Vice President|Governor|Mayor)(?:\b|$)/.test(title))
    return title[0]!.toLocaleLowerCase("en-US") + title.slice(1);
  return null;
}
