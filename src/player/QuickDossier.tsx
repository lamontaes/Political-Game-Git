import { useEffect, useRef } from "react";

import {
  EPISTEMIC_ACCESS_LABELS,
  type PlayerVisibleFact,
  type QuickDossierProjection,
} from "../presentation/run-a-projection";

interface QuickDossierProps {
  readonly dossier: QuickDossierProjection;
  readonly onClose: () => void;
}

function DossierFact({ fact }: { readonly fact: PlayerVisibleFact }) {
  return (
    <div className="dossier-fact" data-access={fact.access}>
      <div className="dossier-fact-heading">
        <dt>{fact.label}</dt>
        <span className="access-label">
          {EPISTEMIC_ACCESS_LABELS[fact.access]}
        </span>
      </div>
      <dd>{fact.value}</dd>
    </div>
  );
}

export function QuickDossier({ dossier, onClose }: QuickDossierProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <aside
      className="quick-dossier civic-glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby="dossier-name"
      data-testid="quick-dossier"
    >
      <header className="dossier-header">
        <div>
          <p className="dossier-kicker">Quick dossier · What you know</p>
          <h2 id="dossier-name">{dossier.name}</h2>
          <p>{dossier.title}</p>
        </div>
        <button
          ref={closeButtonRef}
          className="icon-button dossier-close"
          type="button"
          aria-label="Close dossier"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <p className="dossier-role">{dossier.role}</p>

      <dl className="dossier-identity-grid">
        <DossierFact fact={dossier.age} />
        <DossierFact fact={dossier.homePlace} />
      </dl>

      <dl className="dossier-read-grid">
        <DossierFact fact={dossier.relationship} />
        <DossierFact fact={dossier.read} />
      </dl>

      <section aria-labelledby="known-facts-title">
        <h3 id="known-facts-title">Known context</h3>
        <dl className="dossier-fact-list">
          {dossier.knownFacts.map((fact) => (
            <DossierFact key={fact.id} fact={fact} />
          ))}
        </dl>
      </section>

      <section aria-labelledby="latest-interaction-title">
        <h3 id="latest-interaction-title">Recent history</h3>
        <dl className="dossier-fact-list">
          <DossierFact fact={dossier.latestInteraction} />
          <DossierFact fact={dossier.unresolved} />
        </dl>
      </section>

      <p className="dossier-footnote">
        This view reflects access and uncertainty. It is not the full simulation
        record.
      </p>
    </aside>
  );
}
