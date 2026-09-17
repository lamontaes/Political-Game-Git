import { useMemo, useState } from "react";

import type { EntityId, World } from "../../simulation";
import {
  GOVERNMENT_SCOPES,
  governmentScopeLabel,
  projectGovernmentBrowser,
  type GovernmentScope,
} from "../../presentation/politics-government";
import "./politics-hub.css";

/**
 * Public government for a place, by scope and branch (OCD-UI-004).
 *
 * Opens on where the character is now. Choosing home (when it differs) is an
 * explicit selection that stays visible until changed. Looking is free: it
 * grants no authority and moves no clock. A holder's name opens the one person
 * card; a place with recorded meetings offers its records surface.
 */
export function GovernmentBrowser({
  world,
  personId,
  onOpenPerson,
  onOpenLocalRecords,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (personId: EntityId) => void;
  /** The existing local government surface (meetings and records). */
  readonly onOpenLocalRecords?: () => void;
}) {
  const [scope, setScope] = useState<GovernmentScope>("local");
  const [place, setPlace] = useState<"here" | "home">("here");
  const base = useMemo(
    () => projectGovernmentBrowser(world, personId, { scope: "local" }),
    [world, personId],
  );
  const homeDiffers =
    base.home.jurisdictionId !== null &&
    base.home.jurisdictionId !== base.here.jurisdictionId;
  const chosen = place === "home" && homeDiffers ? "home" : "here";
  const view = useMemo(
    () =>
      projectGovernmentBrowser(world, personId, {
        scope,
        jurisdictionId:
          chosen === "home"
            ? base.home.jurisdictionId
            : base.here.jurisdictionId,
      }),
    [world, personId, scope, chosen, base],
  );

  return (
    <section
      className="pg-government"
      aria-labelledby="pg-government-title"
      data-testid="government-browser"
    >
      <header className="pg-government-head">
        <h2 id="pg-government-title" className="sr-only">
          Government
        </h2>
        <p className="pg-government-place" data-testid="government-place">
          <span className="pg-government-place-label">
            {chosen === "here" ? "Here" : "Selected"}
          </span>{" "}
          <strong>{view.browsing.label}</strong>
          {chosen === "home" ? (
            <span className="pg-government-place-note">
              {" "}
              · your home, not where you are now
            </span>
          ) : null}
        </p>
        {homeDiffers ? (
          <div className="pg-government-places" role="group" aria-label="Place">
            <button
              type="button"
              aria-pressed={chosen === "here"}
              data-testid="government-place-here"
              onClick={() => setPlace("here")}
            >
              Here: {base.here.label}
            </button>
            <button
              type="button"
              aria-pressed={chosen === "home"}
              data-testid="government-place-home"
              onClick={() => setPlace("home")}
            >
              Home: {base.home.label}
            </button>
          </div>
        ) : null}
      </header>

      <div
        className="pg-government-scopes"
        role="group"
        aria-label="Level of government"
      >
        {GOVERNMENT_SCOPES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === scope}
            data-testid={`government-scope-${item}`}
            onClick={() => setScope(item)}
          >
            {governmentScopeLabel(item)}
          </button>
        ))}
      </div>

      {view.governs ? (
        <p className="pg-government-governs" data-testid="government-governs">
          {view.scopeLabel} government · {view.governs}
        </p>
      ) : null}

      <div className="pg-government-branches">
        {view.branches.map((branch) => (
          <section
            key={branch.branch}
            className="pg-government-branch"
            aria-labelledby={`pg-government-${branch.branch}`}
            data-testid={`government-branch-${branch.branch}`}
          >
            <h3 id={`pg-government-${branch.branch}`}>{branch.label}</h3>
            {branch.absent ? (
              <p className="pg-government-absent">{branch.absent}</p>
            ) : (
              <ul>
                {branch.entries.map((entry) => (
                  <li key={entry.key}>
                    <span className="pg-government-entry-title">
                      {entry.title}
                    </span>
                    {entry.holderName && entry.holderPersonId ? (
                      <button
                        type="button"
                        className="pg-government-holder"
                        data-testid={`government-holder-${entry.holderPersonId}`}
                        onClick={() => onOpenPerson(entry.holderPersonId!)}
                      >
                        {entry.holderName}
                      </button>
                    ) : null}
                    {entry.detail ? (
                      <span className="pg-government-entry-detail">
                        {entry.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {view.alsoGoverning.length > 0 ? (
        <section
          className="pg-government-branch"
          aria-labelledby="pg-government-also"
          data-testid="government-also-governing"
        >
          <h3 id="pg-government-also">Also governing this place</h3>
          <ul>
            {view.alsoGoverning.map((entry) => (
              <li key={entry.key}>
                <span className="pg-government-entry-title">{entry.title}</span>
                {entry.detail ? (
                  <span className="pg-government-entry-detail">
                    {entry.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {scope === "local" && onOpenLocalRecords ? (
        <button
          type="button"
          className="pg-government-records"
          data-testid="government-open-local-records"
          onClick={onOpenLocalRecords}
        >
          Public meetings and records
        </button>
      ) : null}
      <p className="pg-government-note">
        Looking at government does not use any time or give you any power.
      </p>
    </section>
  );
}
