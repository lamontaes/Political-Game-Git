import { useEffect, useRef } from "react";

import {
  type PlayerVisibleFact,
  type QuickDossierProjection,
} from "../presentation/run-a-projection";

interface QuickDossierProps {
  readonly dossier: QuickDossierProjection;
  readonly onClose: () => void;
}

function placeDescription(fact: PlayerVisibleFact): string {
  if (fact.access === "unknown") return "Hometown not known";
  if (fact.id === "birthplace") return `Born in ${fact.value}`;
  if (fact.id === "residence") return `Lives in ${fact.value}`;
  return fact.value;
}

function knownFactDescription(fact: PlayerVisibleFact): string {
  if (fact.id !== "public-position") return fact.value;
  return fact.access === "publicly-discoverable"
    ? `Publicly: ${fact.value}`
    : fact.value;
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
          <p className="dossier-kicker">Working impression</p>
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

      <p className="dossier-identity-line">
        <span data-access={dossier.age.access}>{dossier.age.value}</span>
        <span aria-hidden="true">·</span>
        <span data-access={dossier.homePlace.access}>
          {placeDescription(dossier.homePlace)}
        </span>
      </p>

      <div className="dossier-impression">
        <strong data-access={dossier.relationship.access}>
          {dossier.relationship.value}
        </strong>
        <p data-access={dossier.read.access}>{dossier.read.value}</p>
      </div>

      <section className="dossier-notes" aria-labelledby="dossier-notes-title">
        <h3 id="dossier-notes-title">What stands out</h3>
        <ul>
          {dossier.knownFacts.map((fact) => (
            <li key={fact.id} data-access={fact.access}>
              {knownFactDescription(fact)}
            </li>
          ))}
        </ul>
      </section>

      <section className="dossier-recent" aria-labelledby="last-contact-title">
        <h3 id="last-contact-title">Last interaction</h3>
        <p data-access={dossier.latestInteraction.access}>
          {dossier.latestInteraction.value}
        </p>
        <p
          className="dossier-uncertain"
          data-access={dossier.unresolved.access}
        >
          {dossier.unresolved.value}
        </p>
      </section>
    </aside>
  );
}
