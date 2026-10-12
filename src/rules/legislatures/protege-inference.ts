import type {
  EntityId,
  IsoDate,
  World,
  HistoricalEvent,
  EventKnowledgeRecord,
} from "../../simulation/types";
export interface ProtegeFacts {
  readonly onDate: IsoDate;
  readonly people: Readonly<Record<EntityId, { readonly birthDate: IsoDate }>>;
  readonly interactions: World["history"]["relationshipInteractions"];
  readonly events: readonly HistoricalEvent[];
  readonly knowledge: readonly EventKnowledgeRecord[];
}
export interface InferredProtege {
  readonly elderPersonId: EntityId;
  readonly interactionIds: readonly EntityId[];
}

export function inferredProtegeOf(
  facts: ProtegeFacts,
  observerId: EntityId,
  personId: EntityId,
  asOfDate: IsoDate = facts.onDate,
): InferredProtege | null {
  const person = facts.people[personId];
  if (!person) return null;
  const eventsByElder = new Map<EntityId, Map<EntityId, EntityId>>();
  for (const interaction of facts.interactions) {
    if (interaction.occurredAt > asOfDate || !interaction.eventId) continue;
    if (!interaction.personIds.includes(personId)) continue;
    const elderId = interaction.personIds.find((id) => id !== personId);
    const elder = elderId ? facts.people[elderId] : undefined;
    if (!elder || elder.birthDate >= person.birthDate) continue;
    const kind = interaction.kind.toLowerCase();
    const description =
      `${interaction.kind} ${interaction.summary} ${interaction.tags.join(" ")}`.toLowerCase();
    const carriedAlong =
      kind.startsWith("experience:shared") ||
      kind.startsWith("contact:") ||
      /campaign|appointment|introduc|brought along/.test(description);
    if (!carriedAlong) continue;
    const event = facts.events.find((row) => row.id === interaction.eventId);
    if (!event || event.occurredAt > asOfDate) continue;
    const observerWitnessed = event.participants.some(
      (participant) => participant.personId === observerId,
    );
    const observerHeard = facts.knowledge.some(
      (knowledge) =>
        knowledge.personId === observerId &&
        knowledge.eventId === interaction.eventId &&
        knowledge.learnedAt <= asOfDate &&
        knowledge.accuracy !== "inaccurate",
    );
    if (!observerWitnessed && !observerHeard) continue;
    const events = eventsByElder.get(elderId!) ?? new Map<EntityId, EntityId>();
    events.set(interaction.eventId, interaction.id);
    eventsByElder.set(elderId!, events);
  }
  const inferred = [...eventsByElder.entries()]
    .filter(([, events]) => events.size >= 2)
    .sort(([first], [second]) => first.localeCompare(second))[0];
  return inferred
    ? {
        elderPersonId: inferred[0],
        interactionIds: [...inferred[1].values()],
      }
    : null;
}

// stopgapId: "SG-P14-legislatures-protege-hearsay"
