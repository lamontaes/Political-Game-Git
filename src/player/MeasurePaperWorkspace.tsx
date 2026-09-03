import { useEffect, useRef } from "react";

import {
  assessCommitment,
  commitmentsKnownTo,
  currentMeasureProvisions,
  measureAmendments,
  measureNegotiations,
  measurePosition,
  personName,
  type World,
} from "../simulation";
import {
  playerHasReadFiscalNote,
  type LegislativeBargainingFixture,
} from "../presentation/legislative-bargaining-fixture";
import type { LegislativeBargainingProgress } from "../presentation/run-b-conversation-progress";
import type { MemberAccount } from "../presentation/legislative-bargaining-actions";

/**
 * The bill, on paper.
 *
 * It reads as a bill: numbered sections in the order they print, the proposed
 * language shown against the language it would change, and the record of what
 * the chamber actually did underneath. There is no support meter and no vote
 * count to watch tick over, because those would answer the question the player
 * is supposed to be working out for themselves.
 */

export type PaperPanel = "none" | "proposal" | "fiscal-note" | "record";

export interface MeasurePaperWorkspaceProps {
  readonly world: World;
  readonly fixture: LegislativeBargainingFixture;
  readonly progress: LegislativeBargainingProgress;
  readonly panel: PaperPanel;
  readonly proposalVariant: "as-asked" | "capped";
  readonly memberAccounts: readonly MemberAccount[];
  readonly message: string | null;
  readonly onOpenPanel: (panel: PaperPanel) => void;
  readonly onChooseVariant: (variant: "as-asked" | "capped") => void;
  readonly onReadFiscalNote: () => void;
  readonly onOfferAmendment: () => void;
  readonly onTakeFloorVote: () => void;
  readonly onClose: () => void;
}

export function MeasurePaperWorkspace({
  world,
  fixture,
  progress,
  panel,
  proposalVariant,
  memberAccounts,
  message,
  onOpenPanel,
  onChooseVariant,
  onReadFiscalNote,
  onOfferAmendment,
  onTakeFloorVote,
  onClose,
}: MeasurePaperWorkspaceProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const facts = progress.subjectFacts;
  const provisions = currentMeasureProvisions(world, fixture.measureId);
  const position = measurePosition(world, fixture.measureId);
  const amendments = measureAmendments(world, fixture.measureId);
  const sectionInBill = provisions.some(
    (provision) => provision.provisionKey === facts.requestedProvisionKey,
  );
  const noteRead = playerHasReadFiscalNote(world, fixture);
  const votes = (world.history.legislativeVotes ?? []).filter(
    (vote) => vote.measureId === fixture.measureId,
  );
  const finalVote = votes.find((vote) => vote.purpose === "floor-stage");
  const proposedText =
    proposalVariant === "capped" ? facts.cappedText : facts.requestedText;
  const proposedAmount =
    proposalVariant === "capped"
      ? facts.cappedAmountLabel
      : facts.requestedAmountLabel;

  return (
    <section
      className="measure-paper-workspace"
      data-testid="measure-paper-workspace"
      data-panel={panel}
      data-section-in-bill={sectionInBill ? "true" : "false"}
      data-measure-phase={position.phase}
      data-proposal-variant={proposalVariant}
      aria-label={`${facts.designation}, as it now reads`}
    >
      <header className="measure-paper-header">
        <div>
          <p className="measure-eyebrow">
            {facts.chamberName}
            {position.phase === "on-floor"
              ? " · on the floor"
              : position.terminal
                ? " · finished"
                : " · moving on"}
          </p>
          <h2>
            {facts.designation} — {facts.shortTitle}
          </h2>
          <p className="measure-standing" data-testid="measure-standing">
            {position.phase === "on-floor"
              ? `The text can still change until ${facts.nextStepLabel}.`
              : "The text is settled here. What was in the bill when it was called is what carried."}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="measure-close"
          onClick={onClose}
        >
          Back to the room
        </button>
      </header>

      {message ? (
        <p
          className="measure-message"
          role="status"
          data-testid="measure-message"
        >
          {message}
        </p>
      ) : null}

      <article className="measure-paper" data-testid="measure-paper">
        <p className="measure-paper-stamp">
          AS IT NOW READS · NOT ENACTED · NOT IN EFFECT
        </p>
        {provisions.map((provision) => (
          <section
            key={provision.id}
            className="measure-section"
            data-testid={`measure-section-${provision.provisionKey}`}
            data-beneficiary={provision.beneficiary.kind}
          >
            <h3>
              Section {provision.sectionNumber}. {provision.heading}
            </h3>
            <p>{provision.text}</p>
            <p className="measure-section-reach">
              {provision.beneficiary.kind === "particularized"
                ? `Written for ${provision.beneficiary.beneficiaryLabel}${
                    provision.beneficiary.placeLabel
                      ? ` in ${provision.beneficiary.placeLabel}`
                      : ""
                  }. Stated ground: ${provision.beneficiary.statedGround}`
                : `Reaches ${provision.beneficiary.appliesToLabel}.`}
            </p>
          </section>
        ))}
      </article>

      <nav
        className="measure-actions"
        aria-label="What you can do with the bill"
      >
        <button
          type="button"
          data-testid="open-proposal"
          onClick={() => onOpenPanel("proposal")}
        >
          {sectionInBill
            ? `Read ${facts.requestedSectionLabel} as adopted`
            : `Read the proposed ${facts.requestedSectionLabel}`}
        </button>
        <button
          type="button"
          data-testid="open-fiscal-note"
          onClick={() => onOpenPanel("fiscal-note")}
        >
          Fiscal note
        </button>
        <button
          type="button"
          data-testid="open-record"
          onClick={() => onOpenPanel("record")}
        >
          What has happened so far
        </button>
      </nav>

      {panel === "proposal" ? (
        <aside
          className="measure-panel"
          data-testid="proposal-panel"
          aria-label="Proposed section"
        >
          <h3>
            {facts.requestedSectionLabel}. {facts.requestedHeading}
          </h3>
          <p className="measure-panel-note">
            {sectionInBill
              ? "This is in the bill. The chamber adopted it."
              : "Preview only. Nothing here is in the bill until the chamber adopts an amendment carrying it."}
          </p>
          {!sectionInBill ? (
            <div
              className="measure-variant-choice"
              role="radiogroup"
              aria-label="Which version to offer"
            >
              <button
                type="button"
                role="radio"
                aria-checked={proposalVariant === "as-asked"}
                data-testid="variant-as-asked"
                onClick={() => onChooseVariant("as-asked")}
              >
                {facts.requestedAmountLabel} — as asked
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={proposalVariant === "capped"}
                data-testid="variant-capped"
                onClick={() => onChooseVariant("capped")}
              >
                {facts.cappedAmountLabel} — capped
              </button>
            </div>
          ) : null}
          <p className="measure-proposed-text" data-testid="proposed-text">
            {sectionInBill
              ? provisions.find(
                  (provision) =>
                    provision.provisionKey === facts.requestedProvisionKey,
                )!.text
              : proposedText}
          </p>
          <p className="measure-section-reach">
            Written for {facts.requestedBeneficiaryLabel} in{" "}
            {facts.requestedPlaceLabel}. Stated ground:{" "}
            {facts.requestedStatedGround}
          </p>
          {!sectionInBill && position.phase === "on-floor" ? (
            <button
              type="button"
              className="measure-primary-action"
              data-testid="offer-amendment"
              onClick={onOfferAmendment}
            >
              Offer it to the {facts.chamberName} at {proposedAmount}
            </button>
          ) : null}
          <button
            type="button"
            data-testid="close-panel"
            onClick={() => onOpenPanel("none")}
          >
            Close
          </button>
        </aside>
      ) : null}

      {panel === "fiscal-note" ? (
        <aside
          className="measure-panel"
          data-testid="fiscal-note-panel"
          aria-label="Fiscal note"
        >
          <h3>Fiscal note</h3>
          {noteRead ? (
            <>
              <p data-testid="fiscal-note-body">
                {
                  world.history.events.find(
                    (event) =>
                      event.stableKey === facts.fiscalNoteEventStableKey,
                  )!.summary
                }
              </p>
              <p className="measure-panel-note">
                Prepared by {personName(world.people[facts.analystPersonId]!)}.
                A forecast on the bill as filed, not an appropriation and not a
                guarantee of what any agency will manage to do.
              </p>
            </>
          ) : (
            <>
              <p
                className="measure-panel-note"
                data-testid="fiscal-note-unread"
              >
                A note was filed with the bill. You have not read it.
              </p>
              <button
                type="button"
                className="measure-primary-action"
                data-testid="read-fiscal-note"
                onClick={onReadFiscalNote}
              >
                Read it
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="close-panel"
            onClick={() => onOpenPanel("none")}
          >
            Close
          </button>
        </aside>
      ) : null}

      {panel === "record" ? (
        <aside
          className="measure-panel"
          data-testid="record-panel"
          aria-label="What has happened so far"
        >
          <h3>What has happened so far</h3>
          <ul data-testid="record-amendments">
            {amendments.length === 0 ? (
              <li>No amendment has been offered.</li>
            ) : (
              amendments.map((amendment) => (
                <li key={amendment.id}>
                  {amendment.description}{" "}
                  <strong>
                    {amendment.status === "adopted" ? "Adopted." : "Rejected."}
                  </strong>
                </li>
              ))
            )}
          </ul>
          <h4>What people have said</h4>
          <ul data-testid="record-commitments">
            {commitmentsKnownTo(
              world,
              fixture.playerPersonId,
              fixture.measureId,
            ).length === 0 ? (
              <li>Nobody has told you anything yet.</li>
            ) : (
              commitmentsKnownTo(
                world,
                fixture.playerPersonId,
                fixture.measureId,
              ).map((commitment) => {
                const assessment = assessCommitment(world, commitment.id);
                return (
                  <li key={commitment.id} data-testid="record-commitment">
                    <em>
                      {personName(world.people[commitment.holderPersonId]!)}
                    </em>
                    : {commitment.statement}
                    <span className="measure-standing-line">
                      {assessment.account}
                    </span>
                    {commitment.conditions.map((condition) => (
                      <span key={condition.key} className="measure-condition">
                        Condition: {condition.description}
                      </span>
                    ))}
                  </li>
                );
              })
            )}
          </ul>
          <h4>What was asked for</h4>
          <ul data-testid="record-negotiations">
            {measureNegotiations(world, fixture.measureId).length === 0 ? (
              <li>Nobody has asked you for anything yet.</li>
            ) : (
              measureNegotiations(world, fixture.measureId).map(
                (negotiation) => (
                  <li key={negotiation.id}>{negotiation.request}</li>
                ),
              )
            )}
          </ul>
          <button
            type="button"
            data-testid="close-panel"
            onClick={() => onOpenPanel("none")}
          >
            Close
          </button>
        </aside>
      ) : null}

      <footer className="measure-floor-call">
        {finalVote ? (
          <div data-testid="floor-result">
            <p>
              The {facts.chamberName} voted {finalVote.tally.yea}–
              {finalVote.tally.nay} on the bill.
            </p>
            <ul data-testid="member-accounts">
              {memberAccounts.map((account) => (
                <li key={account.personId}>
                  <strong>
                    {personName(world.people[account.personId]!)} voted{" "}
                    {account.disposition === "present-not-voting"
                      ? "present"
                      : account.disposition}
                    .
                  </strong>{" "}
                  {account.account}
                </li>
              ))}
            </ul>
          </div>
        ) : position.phase === "on-floor" ? (
          <button
            type="button"
            className="measure-primary-action"
            data-testid="call-the-vote"
            onClick={onTakeFloorVote}
          >
            Call the vote on {facts.designation}
          </button>
        ) : null}
      </footer>
    </section>
  );
}
