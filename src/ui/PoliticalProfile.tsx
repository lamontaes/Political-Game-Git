import {
  campaignCommitmentHistory,
  factsForPerson,
  principleHistory,
  privateBeliefHistory,
  propositionExposureHistory,
  publicPositionHistory,
  resolveEntityLabel,
  subjectKnowledgeHistory,
  subjectKnowledgeProfilesForPerson,
} from "../simulation";
import type {
  BeliefFormationContext,
  EntityId,
  Person,
  PropositionExposureProvenance,
  SubjectKnowledgeProvenance,
  World,
} from "../simulation";

interface PoliticalProfileProps {
  readonly world: World;
  readonly person: Person;
}

function subjectKnowledgeProvenanceLabel(
  world: World,
  factsById: ReadonlyMap<EntityId, string>,
  provenance: SubjectKnowledgeProvenance,
): string {
  switch (provenance.kind) {
    case "person-facts":
      return `Biography facts · ${provenance.factIds
        .map((factId) => resolvedReference(factId, factsById.get(factId)))
        .join("; ")}`;
    case "historical-events":
      return `Lived events · ${provenance.eventIds
        .map((eventId) => eventReference(world, eventId))
        .join("; ")}`;
    case "study":
      return `Study · ${provenance.reference}`;
    case "trusted-report":
      return `Trusted report · ${resolvedEntityReference(world, provenance.sourcePersonId)}${
        provenance.reference ? ` · ${provenance.reference}` : ""
      }`;
    case "manual":
      return `Authored record · ${provenance.note}`;
  }
}

function exposureProvenanceLabel(
  world: World,
  provenance: PropositionExposureProvenance,
): string {
  switch (provenance.kind) {
    case "direct-experience":
      return `Direct experience · ${eventReference(world, provenance.eventId)}`;
    case "told-by": {
      const claim = provenance.claimId
        ? world.history.claims.find(
            (candidate) => candidate.id === provenance.claimId,
          )
        : undefined;
      return `Told by ${resolvedEntityReference(world, provenance.sourcePersonId)}${
        provenance.claimId
          ? ` · claim ${resolvedReference(provenance.claimId, claim?.statement)}`
          : ""
      }`;
    }
    case "public-record":
      return `Public record · ${provenance.reference}`;
    case "media":
      return `Media · ${provenance.outlet}${
        provenance.reference ? ` · ${provenance.reference}` : ""
      }`;
    case "organization":
      return `Organization · ${provenance.organizationLabel}${
        provenance.reference ? ` · ${provenance.reference}` : ""
      }`;
    case "manual":
      return `Authored record · ${provenance.note}`;
  }
}

function formationDetails(
  world: World,
  factsById: ReadonlyMap<EntityId, string>,
  formation: BeliefFormationContext,
): readonly string[] {
  const lines: string[] = [`Formation reason: ${formation.reason}`];

  if (formation.cue) {
    lines.push(
      `Cue: ${formation.cue.kind} · ${formation.cue.sourceLabel}${
        formation.cue.sourcePersonId
          ? ` · ${resolvedEntityReference(world, formation.cue.sourcePersonId)}`
          : ""
      }`,
    );
  }
  for (const eventId of formation.relevantEventIds) {
    lines.push(`Event: ${eventReference(world, eventId)}`);
  }
  for (const factId of formation.sourceFactIds) {
    lines.push(
      `Biography fact: ${resolvedReference(factId, factsById.get(factId))}`,
    );
  }
  for (const exposureId of formation.propositionExposureIds) {
    const exposure = world.history.propositionExposures.find(
      (candidate) => candidate.id === exposureId,
    );
    const propositionName = exposure
      ? nameFor(world.policyCatalog.propositions, exposure.propositionId)
      : undefined;
    lines.push(
      `Proposition exposure: ${resolvedReference(
        exposureId,
        exposure
          ? `${propositionName} · ${exposure.encounteredAt} · ${exposure.summary}`
          : undefined,
      )}`,
    );
  }
  for (const memoryId of formation.memoryIds) {
    const memory = world.history.memories.find(
      (candidate) => candidate.id === memoryId,
    );
    lines.push(
      `Memory: ${resolvedReference(
        memoryId,
        memory ? `${memory.formedAt} · ${memory.rememberedSummary}` : undefined,
      )}`,
    );
  }
  for (const knowledgeId of formation.eventKnowledgeIds) {
    const knowledge = world.history.knowledge.find(
      (candidate) => candidate.id === knowledgeId,
    );
    lines.push(
      `Event knowledge: ${resolvedReference(
        knowledgeId,
        knowledge
          ? `${knowledge.learnedAt} · ${knowledge.believedSummary}`
          : undefined,
      )}`,
    );
  }
  for (const claimId of formation.claimIds) {
    const claim = world.history.claims.find(
      (candidate) => candidate.id === claimId,
    );
    lines.push(
      `Claim: ${resolvedReference(
        claimId,
        claim
          ? `${resolvedEntityReference(world, claim.speakerPersonId)} · ${claim.madeAt} · ${claim.statement}`
          : undefined,
      )}`,
    );
  }
  for (const interactionId of formation.relationshipInteractionIds) {
    const interaction = world.history.relationshipInteractions.find(
      (candidate) => candidate.id === interactionId,
    );
    lines.push(
      `Relationship interaction: ${resolvedReference(
        interactionId,
        interaction
          ? `${interaction.personIds
              .map((personId) => resolveEntityLabel(world, personId))
              .join(
                " and ",
              )} · ${interaction.occurredAt} · ${interaction.summary}`
          : undefined,
      )}`,
    );
  }
  for (const knowledgeId of formation.subjectKnowledgeIds) {
    const knowledge = world.history.subjectKnowledge.find(
      (candidate) => candidate.id === knowledgeId,
    );
    lines.push(
      `Subject knowledge: ${resolvedReference(
        knowledgeId,
        knowledge
          ? `${nameFor(world.policyCatalog.subjects, knowledge.subjectId)} · ${knowledge.recordedAt}`
          : undefined,
      )}`,
    );
  }
  if (formation.evidenceReference) {
    lines.push(`Evidence reference: ${formation.evidenceReference}`);
  }
  if (formation.note) {
    lines.push(`Formation note: ${formation.note}`);
  }
  return lines;
}

function resolvedEntityReference(world: World, id: EntityId): string {
  return resolvedReference(id, resolveEntityLabel(world, id));
}

function eventReference(world: World, id: EntityId): string {
  const event = world.history.events.find((candidate) => candidate.id === id);
  return resolvedReference(id, event?.summary);
}

function resolvedReference(id: EntityId, label?: string): string {
  return label && label !== id ? `${label} [${id}]` : id;
}

function nameFor(
  records: Readonly<Record<string, { readonly name: string }>>,
  id: EntityId,
): string {
  return records[id]?.name ?? id;
}

export function PoliticalProfile({ world, person }: PoliticalProfileProps) {
  const beliefs = privateBeliefHistory(world, person.id);
  const currentBeliefByProposition = new Map<EntityId, EntityId>();
  for (const belief of beliefs) {
    currentBeliefByProposition.set(belief.propositionId, belief.id);
  }
  const currentBeliefIds = new Set(currentBeliefByProposition.values());
  const exposures = propositionExposureHistory(world, person.id);
  const publicPositions = publicPositionHistory(world, person.id);
  const commitments = campaignCommitmentHistory(world, person.id);
  const principles = principleHistory(world, person.id);
  const factsById = new Map(
    factsForPerson(person).map((fact) => [fact.id, fact.summary]),
  );
  const knowledgeProfiles = subjectKnowledgeProfilesForPerson(world, person.id);

  return (
    <>
      <section
        className="inspector-section"
        aria-labelledby="belief-history-title"
      >
        <div className="subheading-row">
          <h3 id="belief-history-title">Private belief history</h3>
          <span>{beliefs.length}</span>
        </div>
        {beliefs.length === 0 ? (
          <p className="empty-copy">No private beliefs have been formed.</p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {beliefs.map((belief) => (
              <li key={belief.id}>
                <time dateTime={belief.formedAt}>{belief.formedAt}</time>
                <p>
                  <strong>
                    {nameFor(
                      world.policyCatalog.propositions,
                      belief.propositionId,
                    )}
                  </strong>
                  {" · "}
                  {belief.position}
                </p>
                <span>
                  {currentBeliefIds.has(belief.id) ? "current" : "historical"} ·{" "}
                  {belief.conviction} conviction · {belief.salience} salience ·{" "}
                  {belief.flexibility}
                </span>
                <span>Record ID: {belief.id}</span>
                {belief.supersedesBeliefId ? (
                  <span>Supersedes: {belief.supersedesBeliefId}</span>
                ) : null}
                {formationDetails(world, factsById, belief.formation).map(
                  (line, lineIndex) => (
                    <span key={`${belief.id}:formation:${lineIndex}`}>
                      {line}
                    </span>
                  ),
                )}
                {belief.rationale ? <span>{belief.rationale}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="exposure-title">
        <div className="subheading-row">
          <h3 id="exposure-title">Proposition encounters</h3>
          <span>{exposures.length}</span>
        </div>
        {exposures.length === 0 ? (
          <p className="empty-copy">No proposition encounters recorded.</p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {exposures.map((exposure) => (
              <li key={exposure.id}>
                <time dateTime={exposure.encounteredAt}>
                  {exposure.encounteredAt}
                </time>
                <p>
                  <strong>
                    {nameFor(
                      world.policyCatalog.propositions,
                      exposure.propositionId,
                    )}
                  </strong>
                </p>
                <span>{exposure.summary}</span>
                <span>
                  Provenance:{" "}
                  {exposureProvenanceLabel(world, exposure.provenance)}
                </span>
                <span>Record ID: {exposure.id}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="public-position-title"
      >
        <div className="subheading-row">
          <h3 id="public-position-title">Public positions</h3>
          <span>{publicPositions.length}</span>
        </div>
        {publicPositions.length === 0 ? (
          <p className="empty-copy">No public positions recorded.</p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {publicPositions.map((position) => (
              <li key={position.id}>
                <time dateTime={position.statedAt}>{position.statedAt}</time>
                <p>
                  <strong>
                    {nameFor(
                      world.policyCatalog.propositions,
                      position.propositionId,
                    )}
                  </strong>
                  {" · "}
                  {position.stance}
                </p>
                <span>
                  {position.audience}
                  {position.venue ? ` · ${position.venue}` : ""}
                </span>
                <span>{position.statement}</span>
                <span>
                  Source event:{" "}
                  {position.sourceEventId
                    ? eventReference(world, position.sourceEventId)
                    : "none recorded"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="commitment-title">
        <div className="subheading-row">
          <h3 id="commitment-title">Campaign commitments</h3>
          <span>{commitments.length}</span>
        </div>
        {commitments.length === 0 ? (
          <p className="empty-copy">No campaign commitments recorded.</p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {commitments.map((commitment) => (
              <li key={commitment.id}>
                <time dateTime={commitment.madeAt}>{commitment.madeAt}</time>
                <p>
                  <strong>
                    {nameFor(
                      world.policyCatalog.propositions,
                      commitment.propositionId,
                    )}
                  </strong>
                  {" · "}
                  {commitment.stance}
                </p>
                <span>{commitment.level}</span>
                <span>{commitment.statement}</span>
                {commitment.conditions ? (
                  <span>Conditions: {commitment.conditions}</span>
                ) : null}
                <span>
                  Source event:{" "}
                  {commitment.sourceEventId
                    ? eventReference(world, commitment.sourceEventId)
                    : "none recorded"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="principle-title">
        <div className="subheading-row">
          <h3 id="principle-title">Broad principles</h3>
          <span>{principles.length}</span>
        </div>
        {principles.length === 0 ? (
          <p className="empty-copy">No broad principles recorded.</p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {principles.map((principle) => (
              <li key={principle.id}>
                <time dateTime={principle.formedAt}>{principle.formedAt}</time>
                <p>
                  <strong>
                    {nameFor(
                      world.policyCatalog.principles,
                      principle.principleId,
                    )}
                  </strong>
                  {" · "}
                  {principle.stance}
                </p>
                <span>
                  {principle.conviction} conviction · {principle.flexibility}
                </span>
                <span>Record ID: {principle.id}</span>
                {principle.supersedesPrincipleRecordId ? (
                  <span>
                    Supersedes: {principle.supersedesPrincipleRecordId}
                  </span>
                ) : null}
                {formationDetails(world, factsById, principle.formation).map(
                  (line, lineIndex) => (
                    <span key={`${principle.id}:formation:${lineIndex}`}>
                      {line}
                    </span>
                  ),
                )}
                {principle.qualification ? (
                  <span>{principle.qualification}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="expertise-title">
        <div className="subheading-row">
          <h3 id="expertise-title">Knowledge and expertise</h3>
          <span>{knowledgeProfiles.length}</span>
        </div>
        {knowledgeProfiles.length === 0 ? (
          <p className="empty-copy">
            No structured subject knowledge or fact-derived expertise.
          </p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {knowledgeProfiles.map((profile) => {
              const records = subjectKnowledgeHistory(
                world,
                person.id,
                profile.subjectId,
              );
              return (
                <li key={profile.subjectId}>
                  <p>
                    <strong>
                      {nameFor(world.policyCatalog.subjects, profile.subjectId)}
                    </strong>
                  </p>
                  <span>
                    {profile.familiarity} familiarity · {profile.understanding}{" "}
                    understanding · {profile.expertise} expertise ·{" "}
                    {profile.practicalExperience} practical experience
                  </span>
                  {profile.supportingFactIds.map((factId) => (
                    <span key={factId}>
                      Derived from biography:{" "}
                      {resolvedReference(factId, factsById.get(factId))}
                    </span>
                  ))}
                  {records.length === 0 ? (
                    <span>No explicit subject-knowledge records.</span>
                  ) : null}
                  {records.flatMap((record) => [
                    <span key={`${record.id}:record`}>
                      Record {record.recordedAt}: {record.familiarity}{" "}
                      familiarity · {record.understanding} understanding ·{" "}
                      {record.expertise} expertise ·{" "}
                      {record.practicalExperience} practical experience
                    </span>,
                    <span key={`${record.id}:provenance`}>
                      Provenance:{" "}
                      {subjectKnowledgeProvenanceLabel(
                        world,
                        factsById,
                        record.provenance,
                      )}
                    </span>,
                    <span key={`${record.id}:id`}>
                      Record ID: {record.id}
                      {record.supersedesKnowledgeId
                        ? ` · supersedes ${record.supersedesKnowledgeId}`
                        : ""}
                    </span>,
                  ])}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
