import type { ReactNode } from "react";

import {
  labelForRef,
  type Access,
  type EntityRef,
  type KnownFact,
} from "./data";

/**
 * Shared prototype primitives.
 *
 * DEVELOPMENT-ONLY. These exist so that fourteen screens are not hand-authored
 * fourteen different ways: every workspace uses the same frame, every record
 * uses the same row, and every reference uses the same link. Reusable
 * primitives are what make the click-through feel like one game rather than a
 * folder of mockups.
 */

interface WorkspaceProps {
  readonly kicker: string;
  readonly title: string;
  readonly surface?: "dark" | "paper";
  readonly testId: string;
  readonly canGoBack: boolean;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly headExtra?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The one workspace frame.
 *
 * Back and close are different operations and both are always present: Back
 * walks the chain the player followed, close puts this surface away and returns
 * to the scene. Neither resets the prototype, and neither disturbs the pins.
 */
export function Workspace({
  kicker,
  title,
  surface = "dark",
  testId,
  canGoBack,
  onBack,
  onClose,
  headExtra,
  children,
}: WorkspaceProps) {
  return (
    <div className="p-workspace-scrim" data-testid="workspace-scrim">
      <section
        className="p-workspace"
        data-surface={surface}
        data-testid={testId}
        aria-label={title}
      >
        <header className="p-workspace-head">
          <div>
            <p className="p-kicker">{kicker}</p>
            <h1>{title}</h1>
          </div>
          <div className="p-workspace-head-actions">
            {headExtra}
            <button
              type="button"
              className="p-button"
              data-testid="workspace-back"
              onClick={onBack}
              disabled={!canGoBack}
            >
              Back
            </button>
            <button
              type="button"
              className="p-close"
              aria-label={`Close ${title}`}
              data-testid="workspace-close"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>
        <div className="p-workspace-body">{children}</div>
      </section>
    </div>
  );
}

interface RowProps {
  readonly title: string;
  readonly detail?: string;
  readonly aside?: string;
  readonly testId?: string;
  readonly onOpen: () => void;
}

export function Row({ title, detail, aside, testId, onOpen }: RowProps) {
  return (
    <button
      type="button"
      className="p-row"
      data-testid={testId}
      onClick={onOpen}
    >
      <span className="p-row-main">
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {aside ? <span className="p-row-aside">{aside}</span> : null}
    </button>
  );
}

interface RefLinkProps {
  readonly refValue: EntityRef;
  readonly onOpen: (ref: EntityRef) => void;
  /** Override the resolved label where the sentence needs its own wording. */
  readonly children?: string;
}

/**
 * A dotted-underlined reference to a real record.
 *
 * The affordance appears only when the reference actually resolves. An
 * unresolved reference renders as plain text that says it is unavailable rather
 * than as a link that would jump to the nearest similar record — which is the
 * failure mode the recovery report specifically warns about.
 */
export function RefLink({ refValue, onOpen, children }: RefLinkProps) {
  const resolved = labelForRef(refValue);
  if (!resolved) {
    return (
      <span className="p-faint" title="This reference is not available.">
        {children ?? "unavailable"}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="p-ref"
      data-testid={`ref-${refValue.kind}-${refValue.id}`}
      onClick={() => onOpen(refValue)}
    >
      {children ?? resolved}
    </button>
  );
}

export function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="p-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/**
 * How sure the player is of something, said in words rather than in colour.
 *
 * U03-05. The old list prefixed every line with a coloured marker, which made
 * an ordinary sentence look like a database row and carried the distinction
 * only in colour. Now what the character simply knows reads as plain prose with
 * no badge at all, and an attribution appears exactly where it changes the
 * meaning of the sentence: this is on the public record, this is only reported,
 * this is a gap.
 *
 * The distinctions themselves are untouched. Nothing became certain to make the
 * layout calmer, and no hidden fact was revealed to fill a row.
 */
function attributionFor(access: Access): string | null {
  switch (access) {
    case "known":
      return null;
    case "public":
      return "Public record";
    case "inferred":
      return "Reported, not confirmed";
    case "unknown":
      return "You do not know";
  }
}

export function FactList({
  facts,
  testId,
}: {
  readonly facts: readonly KnownFact[];
  readonly testId?: string;
}) {
  return (
    <ul className="p-facts" data-testid={testId}>
      {facts.map((fact) => {
        const attribution = attributionFor(fact.access);
        return (
          <li key={fact.id} data-access={fact.access}>
            {attribution ? (
              <span className="p-attribution">{attribution}</span>
            ) : null}
            <span>{fact.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
