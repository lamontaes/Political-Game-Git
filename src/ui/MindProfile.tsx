import { buildSubjectivePerception } from "../simulation/perception";
import type {
  DecisionTraceRecord,
  MindRecordProvenance,
  MindSourceReference,
  PerceptionSource,
  Person,
  World,
} from "../simulation";
import { formatOpenTaxonomyKey, resolveEntityLabel } from "../simulation";

interface MindProfileProps {
  readonly world: World;
  readonly person: Person;
}

function newestFirst<T extends { readonly sequence: number }>(
  records: readonly T[],
): readonly T[] {
  return [...records].sort((left, right) => right.sequence - left.sequence);
}

function sourceReferenceLabel(reference: MindSourceReference): string {
  const identifier = Object.entries(reference).find(
    ([key]) => key !== "kind",
  )?.[1];
  return `${reference.kind} · ${String(identifier)}`;
}

function provenanceLines(provenance: MindRecordProvenance): readonly string[] {
  return [
    `Provenance: ${provenance.kind}`,
    ...provenance.sourceRefs.map(sourceReferenceLabel),
    ...(provenance.note ? [`Context: ${provenance.note}`] : []),
  ];
}

function perceptionSourceLabel(world: World, source: PerceptionSource): string {
  switch (source.kind) {
    case "person-fact":
      return `Known biography fact · ${source.factId}`;
    case "proposition-exposure":
      return `Proposition exposure · ${source.exposureId}`;
    case "subject-knowledge":
      return `Subject knowledge · ${source.subjectKnowledgeId}`;
    case "appraisal":
      return `Appraisal · ${source.appraisalId}`;
    case "event-knowledge":
      return `Event knowledge · ${source.knowledgeId}`;
    case "memory":
      return `Memory · ${source.memoryId}`;
    case "heard-claim":
      return `Heard claim · ${source.claimId} · knowledge ${source.knowledgeId}`;
    case "inference":
      return `Inference from ${source.basisPerceptionIds.length} prior perception record(s)`;
    case "trusted-cue":
      return `Trusted cue · ${source.sourceLabel} · ${resolveEntityLabel(world, source.sourcePersonId)}`;
    case "relationship-derived":
      return `Relationship-derived · ${resolveEntityLabel(world, source.sourcePersonId)}`;
    case "authored":
      return `Authored fixture · ${source.note}`;
  }
}

function decisionOptionLabel(trace: DecisionTraceRecord, optionKey: string) {
  return (
    trace.context.options.find((option) => option.key === optionKey)?.label ??
    optionKey
  );
}

function DecisionTrace({ trace }: { readonly trace: DecisionTraceRecord }) {
  const selected = trace.selectedOptionKey
    ? decisionOptionLabel(trace, trace.selectedOptionKey)
    : "No available option";

  return (
    <li>
      <time dateTime={trace.recordedAt}>{trace.recordedAt}</time>
      <p>
        <strong>{trace.context.decisionType}</strong> · selected {selected}
      </p>
      <span>
        Diagnostic trace · evaluated as of {trace.context.cutoff.asOfDate} ·{" "}
        {trace.context.retention} retention
      </span>
      <span>
        Subject: {formatOpenTaxonomyKey(trace.context.subject.kind)} ·{" "}
        {trace.context.subject.key}
      </span>
      {trace.optionEvaluations.map((option) => (
        <span key={`${trace.id}:option:${option.optionKey}`}>
          Option {decisionOptionLabel(trace, option.optionKey)} ·{" "}
          {option.available
            ? `${option.preference} preference`
            : `blocked by ${option.blockedByConstraintKeys.join(", ")}`}
          {option.randomContribution !== "none"
            ? ` · bounded variation: ${option.randomContribution}`
            : ""}
        </span>
      ))}
      {trace.context.constraints.map((constraint) => (
        <span key={`${trace.id}:constraint:${constraint.stableKey}`}>
          Hard constraint · {decisionOptionLabel(trace, constraint.optionKey)}:{" "}
          {constraint.explanation}
        </span>
      ))}
      {trace.context.considerations.map((consideration) => (
        <span key={`${trace.id}:consideration:${consideration.stableKey}`}>
          {formatOpenTaxonomyKey(consideration.sourceType)} ·{" "}
          {consideration.direction}{" "}
          {decisionOptionLabel(trace, consideration.optionKey)} ·{" "}
          {consideration.importance} importance · {consideration.confidence}
          {" confidence: "}
          {consideration.explanation}
        </span>
      ))}
      {trace.sourceSnapshots.map((snapshot, index) => (
        <span key={`${trace.id}:snapshot:${index}`}>
          Source snapshot · {snapshot.label}: {snapshot.content}
        </span>
      ))}
      <span>Trace ID: {trace.id}</span>
    </li>
  );
}

export function MindProfile({ world, person }: MindProfileProps) {
  const tendencies = newestFirst(
    world.history.personalityTendencies.filter(
      (record) => record.personId === person.id,
    ),
  );
  const values = newestFirst(
    world.history.personalValues.filter(
      (record) => record.personId === person.id,
    ),
  );
  const goals = newestFirst(
    world.history.goalStates.filter((record) => record.personId === person.id),
  );
  const appraisals = newestFirst(
    world.history.appraisals.filter((record) => record.personId === person.id),
  );
  const perceptions = newestFirst(
    world.history.perceptions.filter((record) => record.personId === person.id),
  );
  const temporaryStates = newestFirst(
    world.history.temporaryStates.filter(
      (record) => record.personId === person.id,
    ),
  );
  const allTraces = newestFirst(
    world.history.decisionTraces.filter(
      (record) => record.context.actorPersonId === person.id,
    ),
  );
  const traces = allTraces.slice(0, 5);
  const politicalTraces = allTraces
    .filter(
      (trace) => trace.context.decisionType === "political-belief-formation",
    )
    .slice(0, 5);
  const subjectiveSnapshot = buildSubjectivePerception(world, person.id);

  return (
    <>
      <aside className="materialize-callout" role="note">
        <p>
          <strong>Developer diagnostic: internal character state.</strong> These
          categorical histories and decision explanations are shown for
          simulation inspection. They are not player-facing personality,
          relationship, trust, utility, or randomness meters.
        </p>
      </aside>

      <section
        className="inspector-section"
        aria-labelledby="mind-tendency-title"
      >
        <div className="subheading-row">
          <h3 id="mind-tendency-title">Personality tendency history</h3>
          <span>{tendencies.length}</span>
        </div>
        {tendencies.length === 0 ? (
          <p className="empty-copy">No personality tendencies recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {tendencies.map((record) => {
              const definition =
                world.mindCatalog.tendencies[record.tendencyId];
              const expression = definition?.expressions.find(
                (candidate) => candidate.key === record.expressionKey,
              );
              return (
                <li key={record.id}>
                  <time dateTime={record.recordedAt}>{record.recordedAt}</time>
                  <p>
                    <strong>{definition?.name ?? record.tendencyId}</strong> ·{" "}
                    {expression?.label ?? record.expressionKey}
                  </p>
                  <span>
                    {record.strength} expression · {record.confidence}{" "}
                    confidence
                    {record.scopeTags.length > 0
                      ? ` · context: ${record.scopeTags.join(", ")}`
                      : ""}
                  </span>
                  {provenanceLines(record.provenance).map((line, index) => (
                    <span key={`${record.id}:provenance:${index}`}>{line}</span>
                  ))}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="mind-values-title"
      >
        <div className="subheading-row">
          <h3 id="mind-values-title">Personal value history</h3>
          <span>{values.length}</span>
        </div>
        {values.length === 0 ? (
          <p className="empty-copy">No personal values recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {values.map((record) => (
              <li key={record.id}>
                <time dateTime={record.recordedAt}>{record.recordedAt}</time>
                <p>
                  <strong>
                    {world.mindCatalog.values[record.valueId]?.name ??
                      record.valueId}
                  </strong>{" "}
                  · {record.orientation}
                </p>
                <span>
                  {record.strength} strength · {record.salience} salience
                </span>
                {record.qualification ? (
                  <span>Qualification: {record.qualification}</span>
                ) : null}
                {provenanceLines(record.provenance).map((line, index) => (
                  <span key={`${record.id}:provenance:${index}`}>{line}</span>
                ))}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="mind-goals-title">
        <div className="subheading-row">
          <h3 id="mind-goals-title">Goal history</h3>
          <span>{goals.length}</span>
        </div>
        {goals.length === 0 ? (
          <p className="empty-copy">No structured goals recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {goals.map((record) => (
              <li key={record.id}>
                <time dateTime={record.recordedAt}>{record.recordedAt}</time>
                <p>
                  <strong>{record.objective}</strong> · {record.status}
                </p>
                <span>
                  {record.priority} priority · {record.domain} · {record.scope}
                </span>
                <span>
                  Created {record.createdAt}
                  {record.deadline ? ` · deadline ${record.deadline}` : ""}
                  {record.targetEntityId
                    ? ` · target ${resolveEntityLabel(world, record.targetEntityId)}`
                    : ""}
                </span>
                {record.outcome ? <span>Outcome: {record.outcome}</span> : null}
                {provenanceLines(record.provenance).map((line, index) => (
                  <span key={`${record.id}:provenance:${index}`}>{line}</span>
                ))}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="mind-appraisal-title"
      >
        <div className="subheading-row">
          <h3 id="mind-appraisal-title">Personal appraisals</h3>
          <span>{appraisals.length}</span>
        </div>
        {appraisals.length === 0 ? (
          <p className="empty-copy">No personal appraisals recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {appraisals.map((record) => {
              const event = world.history.events.find(
                (candidate) => candidate.id === record.eventId,
              );
              return (
                <li key={record.id}>
                  <time dateTime={record.appraisedAt}>
                    {record.appraisedAt}
                  </time>
                  <p>
                    <strong>{record.interpretation}</strong>
                  </p>
                  <span>
                    Objective event: {event?.summary ?? record.eventId}
                  </span>
                  <span>
                    Meaning:{" "}
                    {record.meanings.length > 0
                      ? record.meanings
                          .map(
                            (meaning) =>
                              `${meaning.label} (${meaning.valence}, ${meaning.intensity})`,
                          )
                          .join("; ")
                      : "no strong meaning recorded"}
                  </span>
                  <span>{record.confidence} confidence</span>
                  {provenanceLines(record.provenance).map((line, index) => (
                    <span key={`${record.id}:provenance:${index}`}>{line}</span>
                  ))}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="mind-perception-title"
      >
        <div className="subheading-row">
          <h3 id="mind-perception-title">Explicit subjective perceptions</h3>
          <span>{perceptions.length}</span>
        </div>
        <p className="empty-copy">
          Current subjective snapshot contains {subjectiveSnapshot.items.length}{" "}
          evidence item(s), including memories and known information. Explicit
          perceptions below remain provenance-bearing and may contradict one
          another.
        </p>
        {perceptions.length === 0 ? (
          <p className="empty-copy">No explicit perception records.</p>
        ) : (
          <ol className="mini-history" role="list">
            {perceptions.map((record) => (
              <li key={record.id}>
                <time dateTime={record.perceivedAt}>{record.perceivedAt}</time>
                <p>
                  <strong>{record.assertion}</strong>
                </p>
                <span>
                  Subject: {formatOpenTaxonomyKey(record.subjectKind)} ·{" "}
                  {record.subjectKey}
                </span>
                <span>
                  {record.confidence} confidence · {record.sourceCredibility}{" "}
                  source credibility
                </span>
                <span>
                  Source: {perceptionSourceLabel(world, record.source)}
                </span>
                <span>Perception ID: {record.id}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="mind-temporary-title"
      >
        <div className="subheading-row">
          <h3 id="mind-temporary-title">Temporary internal-state history</h3>
          <span>{temporaryStates.length}</span>
        </div>
        {temporaryStates.length === 0 ? (
          <p className="empty-copy">No temporary internal states recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {temporaryStates.map((record) => {
              const stateStatus =
                world.currentDate < record.startsAt
                  ? "upcoming"
                  : world.currentDate < record.endsAt
                    ? "active"
                    : "expired";
              return (
                <li key={record.id}>
                  <time dateTime={record.startsAt}>{record.startsAt}</time>
                  <p>
                    <strong>{record.label}</strong> · {stateStatus}
                  </p>
                  <span>
                    Through {record.endsAt} · {record.intensity} intensity
                    {record.decisionTags.length > 0
                      ? ` · relevant to ${record.decisionTags.join(", ")}`
                      : ""}
                  </span>
                  {provenanceLines(record.provenance).map((line, index) => (
                    <span key={`${record.id}:provenance:${index}`}>{line}</span>
                  ))}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="decision-trace-title"
      >
        <div className="subheading-row">
          <h3 id="decision-trace-title">Recent decision traces</h3>
          <span>{traces.length}</span>
        </div>
        {traces.length === 0 ? (
          <p className="empty-copy">No durable decision traces recorded.</p>
        ) : (
          <ol className="mini-history political-history" role="list">
            {traces.map((trace) => (
              <DecisionTrace key={trace.id} trace={trace} />
            ))}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="political-reasoning-title"
      >
        <div className="subheading-row">
          <h3 id="political-reasoning-title">Political belief reasoning</h3>
          <span>{politicalTraces.length}</span>
        </div>
        {politicalTraces.length === 0 ? (
          <p className="empty-copy">
            No autonomous political-belief decision trace recorded.
          </p>
        ) : (
          <ol className="mini-history" role="list">
            {politicalTraces.map((trace) => (
              <li key={`${trace.id}:political-summary`}>
                <time dateTime={trace.recordedAt}>{trace.recordedAt}</time>
                <p>
                  <strong>
                    {trace.selectedOptionKey
                      ? decisionOptionLabel(trace, trace.selectedOptionKey)
                      : "No available political-belief outcome"}
                  </strong>
                </p>
                <span>
                  General decision engine ·{" "}
                  {trace.context.considerations.length} structured
                  consideration(s) · {trace.context.constraints.length} hard
                  constraint(s)
                </span>
                <span>Durable trace: {trace.id}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
