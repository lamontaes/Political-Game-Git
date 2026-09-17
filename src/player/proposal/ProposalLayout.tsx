import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { ProposalLayout } from "../../presentation/shell-navigation";
import "./proposal-layout.css";

/** Below this width, Auto reads the proposal instead of squeezing two columns. */
const NARROW_QUERY = "(max-width: 900px)";

interface ProposalLayoutChoice {
  readonly layout: ProposalLayout;
  readonly onLayoutChange: (layout: ProposalLayout) => void;
}

/** The saved choice, supplied by the shell; absent, a view keeps its own. */
export const ProposalLayoutContext = createContext<ProposalLayoutChoice | null>(
  null,
);

function useProposalLayout(): ProposalLayoutChoice {
  const saved = useContext(ProposalLayoutContext);
  const [local, setLocal] = useState<ProposalLayout>("auto");
  return saved ?? { layout: local, onLayoutChange: setLocal };
}

export interface ProposalReadingRow {
  readonly key: string;
  readonly heading: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly changed: boolean;
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window === "undefined" || !window.matchMedia
      ? false
      : window.matchMedia(NARROW_QUERY).matches,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

/**
 * Compare / Read for one proposal (OCD-UI-004). Both views read the same
 * rows of the same measure, version and working copy; the unsaved values live
 * in the caller, so switching never discards an edit. Auto compares side by
 * side on a wide window and reads on a narrow one.
 */
export function ProposalView({
  rows,
  beforeLabel,
  afterLabel,
  testId,
  compare,
}: {
  readonly rows: readonly ProposalReadingRow[];
  readonly beforeLabel: string;
  readonly afterLabel: string;
  readonly testId: string;
  readonly compare: ReactNode;
}) {
  const { layout, onLayoutChange } = useProposalLayout();
  const narrow = useNarrow();
  const shown = layout === "auto" ? (narrow ? "read" : "compare") : layout;
  return (
    <div
      className="pg-proposal"
      data-testid={testId}
      data-layout={layout}
      data-shown={shown}
    >
      <div
        className="pg-proposal-switch"
        role="group"
        aria-label="How to show the proposal"
      >
        {(
          [
            ["compare", "Compare"],
            ["read", "Read"],
            ["auto", "Fit window"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={layout === key}
            data-testid={`${testId}-${key}`}
            onClick={() => onLayoutChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {shown === "compare" ? (
        compare
      ) : (
        <ProposalReading
          rows={rows}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          testId={`${testId}-reading`}
        />
      )}
    </div>
  );
}

function ProposalReading({
  rows,
  beforeLabel,
  afterLabel,
  testId,
}: {
  readonly rows: readonly ProposalReadingRow[];
  readonly beforeLabel: string;
  readonly afterLabel: string;
  readonly testId: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="pg-proposal-empty" data-testid={`${testId}-empty`}>
        There is no text to read yet.
      </p>
    );
  }
  return (
    <div className="pg-proposal-reading" data-testid={testId}>
      <p className="pg-proposal-note">
        {afterLabel}. Changed sections are marked; the earlier wording is one
        click away.
      </p>
      {rows.map((row) => (
        <section
          key={row.key}
          className={row.changed ? "pg-proposal-changed" : undefined}
          data-testid={`${testId}-section`}
          data-changed={row.changed ? "true" : "false"}
        >
          <h5>
            {row.heading}
            {row.changed ? (
              <span className="pg-proposal-flag">Changed</span>
            ) : null}
          </h5>
          <p>
            {row.after ??
              "This section has no text in this version of the proposal."}
          </p>
          {row.changed ? (
            <details>
              <summary>{beforeLabel}</summary>
              <p>
                {row.before ??
                  "This section had no text in the earlier version."}
              </p>
            </details>
          ) : null}
        </section>
      ))}
    </div>
  );
}
