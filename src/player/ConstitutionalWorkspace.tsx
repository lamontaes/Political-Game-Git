import { useState } from "react";
import {
  constitutionalActions,
  constitutionalMemberBody,
  constitutionalPosition,
  constitutionalProposalRuleAt,
  proposeConstitutionalMeasure,
  recordConstitutionalPosition,
  assertWorldIntegrity,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { BudgetEconomyWorkspace } from "./BudgetEconomyWorkspace";
import "./constitutional-workspace.css";

export function ConstitutionalWorkspace({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [selected, setSelected] = useState<EntityId | null>(null);
  const [draft, setDraft] = useState<"amendment" | "revision" | null>(null);
  const [fraction, setFraction] = useState<
    "two-thirds" | "three-fourths" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const controlled =
    world.control.kind === "person" && world.control.personId === personId;
  const measures = world.history.constitutionalMeasures ?? [];
  const measure = measures.find((m) => m.id === selected);
  const p = measure ? constitutionalPosition(world, measure.id) : null;
  const ownJurisdiction = world.jurisdictionOrder.find(
    (id) =>
      ["california", "us-ca", "united-states", "us"].includes(
        world.jurisdictions[id]!.slug,
      ) && constitutionalMemberBody(world, personId, id),
  );
  const commit = (next: () => World) => {
    try {
      if (!controlled)
        throw Error("Only the controlled character can record this choice.");
      const updated = next();
      assertWorldIntegrity(updated);
      onWorldChange(updated);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This action is unavailable.");
    }
  };
  const sponsor = () => {
    if (!ownJurisdiction || !draft || !fraction) return;
    const key = ["us", "united-states"].includes(
      world.jurisdictions[ownJurisdiction]!.slug,
    )
      ? "US"
      : "US-CA";
    const threshold = constitutionalProposalRuleAt(
      world,
      key,
      world.currentDate,
    );
    const num = fraction === "two-thirds" ? 2 : 3;
    const den = fraction === "two-thirds" ? 3 : 4;
    commit(() =>
      proposeConstitutionalMeasure(world, {
        stableKey: `constitutional-player-proposal:${personId}:${measures.length}`,
        jurisdictionId: ownJurisdiction,
        jurisdictionKey: key,
        processKind:
          key === "US"
            ? "federal-amendment"
            : draft === "revision"
              ? "state-revision"
              : "state-amendment",
        designation: `Proposed constitutional measure ${measures.length + 1}`,
        shortTitle: "Proposal procedure",
        text: `Authored game proposal: For subsequent constitutional proposals, the required fraction of ${threshold.countedAgainst === "members-present" ? "members present, with a quorum" : "each house's membership"} shall be ${fraction.replaceAll("-", " ")}. Other ratification requirements remain unchanged.`,
        textVersion: "v1",
        sponsoringAuthority:
          key === "US" ? "Congress" : "California Legislature",
        sponsorPersonId: personId,
        ratificationMode:
          key === "US" ? "state-legislatures" : "statewide-electors",
        deadlineAt: null,
        delayedOperativeAt: null,
        ruleDelta: {
          kind: "proposal-threshold",
          numerator: num,
          denominatorParts: den,
        },
        ordinaryMeasureId: null,
      }),
    );
  };
  return (
    <section
      className="constitutional-workspace"
      aria-labelledby="constitutional-title"
      data-testid="constitutional-workspace"
    >
      <h3 id="constitutional-title">Constitutional &amp; charter changes</h3>
      <p>Public process record · {world.currentDate}</p>
      <details>
        <summary>How these procedures work</summary>
        <p>
          Federal amendments: Congress proposes; the designated state
          legislatures or conventions ratify. The President has no approval or
          veto step. Convention proposal details and disputed state
          reconsiderations remain unresolved.
        </p>
        <p>
          California legislative amendments and revisions: each house proposes;
          electors decide. Effectiveness is five days after filing the statement
          of the vote, with a later operative date where the measure provides
          one. Initiative qualification and conventions remain unavailable.
        </p>
        <p>
          Carson charter changes proceed through Nevada legislative measures.
          Local approval alone cannot amend the charter.
        </p>
      </details>
      <button
        type="button"
        onClick={() => {
          setDraft("amendment");
          setFraction(null);
          setError(null);
        }}
      >
        Prepare a procedural proposal
      </button>
      {draft && (
        <section aria-label="Prepared constitutional proposal">
          <h4>Prepared proposal</h4>
          <p>
            This is fictional game text changing a supported procedural rule.
            Preparation does not introduce it or change current law.
          </p>
          <fieldset>
            <legend>Proposal text</legend>
            <label>
              <input
                type="radio"
                name="constitutional-fraction"
                checked={fraction === "two-thirds"}
                onChange={() => setFraction("two-thirds")}
              />
              Two thirds
            </label>
            <label>
              <input
                type="radio"
                name="constitutional-fraction"
                checked={fraction === "three-fourths"}
                onChange={() => setFraction("three-fourths")}
              />
              Three fourths
            </label>
          </fieldset>
          <fieldset>
            <legend>California proposal kind</legend>
            <label>
              <input
                type="radio"
                name="constitutional-kind"
                checked={draft === "amendment"}
                onChange={() => setDraft("amendment")}
              />
              Amendment
            </label>
            <label>
              <input
                type="radio"
                name="constitutional-kind"
                checked={draft === "revision"}
                onChange={() => setDraft("revision")}
              />
              Revision
            </label>
          </fieldset>
          {!ownJurisdiction && (
            <p role="status">
              Sponsorship requires a recorded active seat in a supported
              proposing legislature. Public inspection or residence grants no
              seat.
            </p>
          )}
          <button
            type="button"
            disabled={!controlled || !ownJurisdiction || !fraction}
            onClick={sponsor}
          >
            Sponsor this text
          </button>
          <button type="button" onClick={() => setDraft(null)}>
            Discard prepared proposal
          </button>
        </section>
      )}
      {!measures.length && (
        <p>
          No constitutional or charter proposals have been recorded in this
          World.
        </p>
      )}
      <ul aria-label="Recorded constitutional measures">
        {measures.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              aria-pressed={selected === m.id}
              onClick={() => setSelected(m.id)}
            >
              {m.designation} · {m.shortTitle}
            </button>
          </li>
        ))}
      </ul>
      {measure && p && (
        <article aria-label="Selected constitutional measure">
          <h4>{measure.designation}</h4>
          <p>
            {measure.processKind.replaceAll("-", " ")} ·{" "}
            {measure.sponsoringAuthority} · {measure.textVersion}
          </p>
          <p className="constitutional-text">{measure.text}</p>
          <p>Process: {p.phase.replaceAll("-", " ")}</p>
          {measure.proposalRule && (
            <p>Proposal threshold: {measure.proposalRule.label}</p>
          )}
          <p>Ratification: {measure.ratificationMode.replaceAll("-", " ")}</p>
          <p>Deadline: {measure.deadlineAt ?? "No deadline recorded"}</p>
          <p>
            Effective: {p.effectiveAt ?? "Not ratified"} · Operative:{" "}
            {p.operativeAt ?? "Not established"}
          </p>
          {measure.processKind === "federal-amendment" && (
            <p>
              {p.ratifiedStates.length} distinct states ratified.{" "}
              {p.ratifiedStates.join(", ")}
            </p>
          )}
          <p>
            {measure.ruleDelta.kind === "proposal-threshold"
              ? `Modeled rule: later proposal threshold ${measure.ruleDelta.numerator}/${measure.ruleDelta.denominatorParts}, applied from the recorded operative date.`
              : `Text recorded; effect unavailable: ${measure.ruleDelta.unsupportedEffect}`}
          </p>
          <p>
            Collective rollcalls and ratification decisions come from the
            responsible bodies' recorded actions. Your position does not decide
            their outcome.
          </p>
          <div aria-label="Record your public position">
            {(["support", "oppose", "undecided"] as const).map((position) => (
              <button
                type="button"
                key={position}
                disabled={!controlled}
                onClick={() =>
                  commit(() =>
                    recordConstitutionalPosition(
                      world,
                      measure.id,
                      personId,
                      position,
                    ),
                  )
                }
              >
                Record my position: {position}
              </button>
            ))}
          </div>
          <ol aria-label="Constitutional history">
            {constitutionalActions(world, measure.id).map((a) => (
              <li key={a.id}>
                {a.occurredAt} · {a.detail.kind.replaceAll("-", " ")}
                {a.detail.kind === "proposal-vote"
                  ? ` · ${a.detail.bodyKey}: ${a.detail.vote.tally.yea} yes, ${a.detail.vote.tally.nay} no (${a.detail.vote.outcome}); required ${a.detail.vote.requiredVotes} of ${a.detail.vote.denominatorValue} ${a.detail.vote.denominatorKind.replaceAll("-", " ")}`
                  : a.detail.kind === "position"
                    ? ` · ${a.detail.position}`
                    : ""}
              </li>
            ))}
          </ol>
        </article>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
/** A's minimal Politics mount preserves the accepted Budget reader. */
export function PoliticsWorkspace({
  world,
  personId,
  jurisdictionId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [tab, setTab] = useState<"budget" | "constitution">("budget");
  return (
    <>
      <nav aria-label="Politics views">
        <button
          type="button"
          aria-pressed={tab === "budget"}
          onClick={() => setTab("budget")}
        >
          Budget &amp; economy
        </button>
        <button
          type="button"
          aria-pressed={tab === "constitution"}
          onClick={() => setTab("constitution")}
        >
          Constitutional &amp; charter changes
        </button>
      </nav>
      {tab === "budget" ? (
        <BudgetEconomyWorkspace world={world} jurisdictionId={jurisdictionId} />
      ) : (
        <ConstitutionalWorkspace
          world={world}
          personId={personId}
          onWorldChange={onWorldChange}
        />
      )}
    </>
  );
}
