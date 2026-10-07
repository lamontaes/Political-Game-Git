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
  playerHasReadFiscalNoteFor,
  type LegislativeBargainingSeat,
} from "../presentation/legislative-bargaining-brief";
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
  readonly seat: LegislativeBargainingSeat;
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
  seat,
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
  const provisions = currentMeasureProvisions(world, seat.measureId);
  const position = measurePosition(world, seat.measureId);
  const amendments = measureAmendments(world, seat.measureId);
  const negotiations = measureNegotiations(world, seat.measureId);
  const sectionInBill = provisions.some(
    (provision) => provision.provisionKey === facts.requestedProvisionKey,
  );
  const noteRead = playerHasReadFiscalNoteFor(world, seat);
  const votes = (world.history.legislativeVotes ?? []).filter(
    (vote) => vote.measureId === seat.measureId,
  );
  const finalVote = votes.find((vote) => vote.purpose === "floor-stage");
  const proposedText =
    proposalVariant === "capped" ? facts.cappedText : facts.requestedText;
  return (
    <section
      className="measure-paper-workspace"
      data-testid="measure-paper-workspace"
      data-panel={panel}
      data-section-in-bill={sectionInBill ? "true" : "false"}
      data-measure-phase={position.phase}
      data-proposal-variant={proposalVariant}
      aria-label={facts.designation}
    >
      <header className="measure-paper-header">
        <div>
          <p className="measure-eyebrow">{facts.chamberName}</p>
          <h2>
            {facts.designation} — {facts.shortTitle}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="measure-close"
          onClick={onClose}
        >
          Back
        </button>
      </header>

      {message ? (
        <p
          className="measure-message"
          role="status"
          data-testid="measure-message"
          data-reason={message}
        />
      ) : null}

      <article className="measure-paper" data-testid="measure-paper">
        {provisions.map((provision) => (
          <section
            key={provision.id}
            className="measure-section"
            data-testid={`measure-section-${provision.provisionKey}`}
            data-beneficiary={provision.beneficiary.kind}
          >
            <h3>
              {provision.sectionNumber}. {provision.heading}
            </h3>
            <p>{provision.text}</p>
            <p className="measure-section-reach">
              {provision.beneficiary.kind === "particularized"
                ? `${provision.beneficiary.beneficiaryLabel}${
                    provision.beneficiary.placeLabel
                      ? `, ${provision.beneficiary.placeLabel}`
                      : ""
                  } · ${provision.beneficiary.statedGround}`
                : provision.beneficiary.appliesToLabel}
            </p>
          </section>
        ))}
      </article>

      <nav className="measure-actions" aria-label={facts.designation}>
        <button
          type="button"
          data-testid="open-proposal"
          onClick={() => onOpenPanel("proposal")}
        >
          Continue
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
          Continue
        </button>
      </nav>

      {panel === "proposal" ? (
        <aside
          className="measure-panel"
          data-testid="proposal-panel"
          aria-label={facts.requestedHeading}
        >
          <h3>
            {facts.requestedSectionLabel}. {facts.requestedHeading}
          </h3>
          <p className="measure-panel-note">
            {sectionInBill ? "Adopted" : null}
          </p>
          {!sectionInBill ? (
            <div
              className="measure-variant-choice"
              role="radiogroup"
              aria-label={facts.designation}
            >
              <button
                type="button"
                role="radio"
                aria-checked={proposalVariant === "as-asked"}
                data-testid="variant-as-asked"
                onClick={() => onChooseVariant("as-asked")}
              >
                {facts.requestedAmountLabel}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={proposalVariant === "capped"}
                data-testid="variant-capped"
                onClick={() => onChooseVariant("capped")}
              >
                {facts.cappedAmountLabel}
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
            {facts.requestedBeneficiaryLabel}, {facts.requestedPlaceLabel} ·{" "}
            {facts.requestedStatedGround}
          </p>
          {!sectionInBill && position.phase === "on-floor" ? (
            <button
              type="button"
              className="measure-primary-action"
              data-testid="offer-amendment"
              onClick={onOfferAmendment}
            >
              Continue
            </button>
          ) : null}
          <button
            type="button"
            data-testid="close-panel"
            onClick={() => onOpenPanel("none")}
          >
            Back
          </button>
        </aside>
      ) : null}

      {panel === "fiscal-note" ? (
        <aside
          className="measure-panel"
          data-testid="fiscal-note-panel"
          aria-label="Fiscal note"
        >
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
                {personName(world.people[facts.analystPersonId]!)}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="measure-primary-action"
                data-testid="read-fiscal-note"
                onClick={onReadFiscalNote}
              >
                Continue
              </button>
            </>
          )}
          <button
            type="button"
            data-testid="close-panel"
            onClick={() => onOpenPanel("none")}
          >
            Back
          </button>
        </aside>
      ) : null}

      {panel === "record" ? (
        <aside
          className="measure-panel"
          data-testid="record-panel"
          aria-label={facts.designation}
        >
          <ul data-testid="record-amendments">
            {amendments.length === 0
              ? null
              : amendments.map((amendment) => (
                  <li key={amendment.id}>
                    {amendment.description}{" "}
                    <strong>
                      {amendment.status === "adopted" ? "Adopted" : "Rejected"}
                    </strong>
                  </li>
                ))}
          </ul>
          <ul data-testid="record-commitments">
            {commitmentsKnownTo(world, seat.playerPersonId, seat.measureId)
              .length === 0
              ? null
              : commitmentsKnownTo(
                  world,
                  seat.playerPersonId,
                  seat.measureId,
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
                          {condition.description}
                        </span>
                      ))}
                    </li>
                  );
                })}
          </ul>
          {negotiations.length > 0 ? (
            <>
              <ul data-testid="record-negotiations">
                {negotiations.map((negotiation) => (
                  <li key={negotiation.id}>{negotiation.request}</li>
                ))}
              </ul>
            </>
          ) : null}
          <button
            type="button"
            data-testid="close-panel"
            onClick={() => onOpenPanel("none")}
          >
            Back
          </button>
        </aside>
      ) : null}

      <footer className="measure-floor-call">
        {finalVote ? (
          <div data-testid="floor-result">
            <p>
              {facts.chamberName} {finalVote.tally.yea}–{finalVote.tally.nay}
            </p>
            <ul data-testid="member-accounts">
              {memberAccounts.map((account) => (
                <li key={account.personId}>
                  <strong>
                    {personName(world.people[account.personId]!)}{" "}
                    <span data-disposition={account.disposition}>
                      {account.disposition === "present-not-voting"
                        ? "present"
                        : account.disposition}
                    </span>
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
            Continue
          </button>
        ) : null}
      </footer>
    </section>
  );
}
