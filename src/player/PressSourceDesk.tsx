import { useMemo, useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  agreePressTerms,
  projectDisclosure,
  tellReporter,
} from "../presentation/press-disclosure";
import type {
  DisclosableRecord,
  ReporterContact,
} from "../presentation/press-disclosure";
import type { SourceTerms } from "../simulation/press";

/**
 * Taking something to a reporter, from the player's side.
 *
 * The mount for PRESS's `projectDisclosure` seam (CRUNCH47 B2). It belongs to
 * the press context — the News desk's "Press office" tab, shell section
 * `news-press` — and deliberately NOT to the News front page. Reading the news
 * and being a source are different things, and putting a disclosure control
 * next to the headlines would blur them.
 *
 * What the surface can hand over is only what the character actually holds:
 * records they have discovered and events they know about, which is what the
 * seam offers. There is no route here to leak a document nobody has seen.
 *
 * On acquaintance: a reporter listed here is a reporter at an outlet, nothing
 * more. Appearing in this list is not a relationship and is never described as
 * one — the seam carries no "have met" fact, so this surface claims none.
 *
 * The order is the order a person would take these steps in: who you would be
 * talking to, on what terms in the arrangement's exact words, and only then
 * what you would say.
 */
export function PressSourceDesk({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const view = useMemo(
    () => projectDisclosure(world, personId),
    [world, personId],
  );
  const [openReporterId, setOpenReporterId] = useState<EntityId | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function run(work: () => World) {
    try {
      const next = work();
      if (next !== world) onWorldChange(next);
    } catch (error) {
      // A refusal is an ordinary answer, and it leaves the World alone.
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section
      className="pg-press-source"
      data-testid="press-source-desk"
      aria-labelledby="press-source-title"
    >
      <h3 id="press-source-title">Talking to a reporter</h3>
      <p className="game-note">{view.note}</p>
      <p className="game-note">
        These are reporters at outlets, not people you know.
      </p>
      {view.contacts.length === 0 ? (
        <p data-testid="press-source-empty">
          No reporter here is covering anything you could take to them.
        </p>
      ) : (
        <ul className="pg-press-source-list">
          {view.contacts.map((contact) => (
            <li
              key={contact.reporterPersonId}
              data-testid={`press-source-${contact.reporterPersonId}`}
            >
              <strong>{contact.reporterName}</strong>
              <span className="pg-press-source-line">
                {contact.outletName}
                {contact.beats.length > 0
                  ? ` · covers ${contact.beats.join(", ")}`
                  : ""}
              </span>
              <button
                type="button"
                className="ui-action ui-action--subtle"
                aria-expanded={openReporterId === contact.reporterPersonId}
                data-testid={`press-source-open-${contact.reporterPersonId}`}
                onClick={() =>
                  setOpenReporterId((current) =>
                    current === contact.reporterPersonId
                      ? null
                      : contact.reporterPersonId,
                  )
                }
              >
                {contact.existingAgreementId
                  ? `What you would tell ${contact.reporterName}`
                  : `Agree terms with ${contact.reporterName}`}
              </button>
              {openReporterId === contact.reporterPersonId ? (
                <ReporterExchange
                  contact={contact}
                  tellable={view.tellable}
                  leakable={view.leakable}
                  onAgree={(terms, attributionLabel) => {
                    try {
                      const outcome = agreePressTerms(world, {
                        personId,
                        reporterPersonId: contact.reporterPersonId,
                        outletId: contact.outletId,
                        terms,
                        ...(attributionLabel ? { attributionLabel } : {}),
                      });
                      // The reason is the domain's, accepted or refused.
                      setNote(outcome.reason);
                      if (outcome.world !== world) onWorldChange(outcome.world);
                    } catch (error) {
                      setNote(
                        error instanceof Error ? error.message : String(error),
                      );
                    }
                  }}
                  onTell={(input) =>
                    run(() => {
                      const agreementId = contact.existingAgreementId;
                      if (!agreementId) {
                        throw new Error(
                          "Agree how you may be described before you say anything.",
                        );
                      }
                      setNote(null);
                      return tellReporter(world, {
                        personId,
                        agreementId,
                        ...input,
                      }).world;
                    })
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {note ? (
        <p role="status" data-testid="press-source-note">
          {note}
        </p>
      ) : null}
    </section>
  );
}

interface TellInput {
  readonly statement?: string;
  readonly eventIds?: readonly EntityId[];
  readonly evidenceArtifactIds?: readonly EntityId[];
  readonly openLead?: boolean;
}

function ReporterExchange({
  contact,
  tellable,
  leakable,
  onAgree,
  onTell,
}: {
  readonly contact: ReporterContact;
  readonly tellable: readonly DisclosableRecord[];
  readonly leakable: readonly DisclosableRecord[];
  readonly onAgree: (
    terms: SourceTerms,
    attributionLabel: string | null,
  ) => void;
  readonly onTell: (input: TellInput) => void;
}) {
  const first = contact.terms.find((entry) => entry.available);
  const [chosen, setChosen] = useState<SourceTerms | null>(
    first?.terms ?? null,
  );
  const [attributionLabel, setAttributionLabel] = useState("");
  const [statement, setStatement] = useState("");
  const [eventIds, setEventIds] = useState<readonly EntityId[]>([]);
  const [evidenceIds, setEvidenceIds] = useState<readonly EntityId[]>([]);
  const [openLead, setOpenLead] = useState(false);
  const chosenTerms = contact.terms.find((entry) => entry.terms === chosen);

  const toggle = (
    current: readonly EntityId[],
    id: EntityId,
  ): readonly EntityId[] =>
    current.includes(id)
      ? current.filter((entry) => entry !== id)
      : [...current, id];

  return (
    <div className="pg-press-source-exchange">
      <fieldset>
        <legend>On what terms</legend>
        {contact.terms.map((entry) =>
          entry.available ? (
            <label key={entry.terms}>
              <input
                type="radio"
                name={`press-terms-${contact.reporterPersonId}`}
                value={entry.terms}
                checked={chosen === entry.terms}
                data-testid={`press-terms-${contact.reporterPersonId}-${entry.terms}`}
                onChange={() => setChosen(entry.terms)}
              />
              <span>
                {entry.label}
                <small>{entry.meaning}</small>
              </span>
            </label>
          ) : (
            /*
              A refused arrangement is its stated reason, never a control the
              player can press and have fail.
            */
            <p
              key={entry.terms}
              data-testid={`press-terms-unavailable-${contact.reporterPersonId}-${entry.terms}`}
            >
              {entry.label} — {entry.unavailableReason}
            </p>
          ),
        )}
      </fieldset>
      {chosenTerms?.needsAttributionLabel ? (
        <label className="pg-field">
          <span>Exactly how you may be described</span>
          <input
            type="text"
            value={attributionLabel}
            data-testid={`press-attribution-${contact.reporterPersonId}`}
            onChange={(event) => setAttributionLabel(event.target.value)}
          />
        </label>
      ) : null}
      <button
        type="button"
        className="ui-action ui-action--primary"
        data-testid={`press-agree-${contact.reporterPersonId}`}
        onClick={() => {
          if (chosen) onAgree(chosen, attributionLabel.trim() || null);
        }}
      >
        Agree these terms
      </button>

      {contact.existingAgreementId ? (
        <>
          <label className="pg-field">
            <span>What you would say</span>
            <textarea
              value={statement}
              data-testid={`press-statement-${contact.reporterPersonId}`}
              onChange={(event) => setStatement(event.target.value)}
            />
          </label>
          {tellable.length > 0 ? (
            <fieldset>
              <legend>Things you know about</legend>
              {tellable.map((record) => (
                <label key={record.id}>
                  <input
                    type="checkbox"
                    checked={eventIds.includes(record.id)}
                    data-testid={`press-event-${record.id}`}
                    onChange={() =>
                      setEventIds((current) => toggle(current, record.id))
                    }
                  />
                  <span>
                    {record.summary}
                    <small>{record.onSpoken}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          {leakable.length > 0 ? (
            <fieldset>
              <legend>Records you hold</legend>
              {leakable.map((record) => (
                <label key={record.id}>
                  <input
                    type="checkbox"
                    checked={evidenceIds.includes(record.id)}
                    data-testid={`press-evidence-${record.id}`}
                    onChange={() =>
                      setEvidenceIds((current) => toggle(current, record.id))
                    }
                  />
                  <span>
                    {record.summary}
                    <small>{record.onSpoken}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <label>
            <input
              type="checkbox"
              checked={openLead}
              data-testid={`press-open-lead-${contact.reporterPersonId}`}
              onChange={(event) => setOpenLead(event.target.checked)}
            />
            <span>Ask them to look into it, not just know it</span>
          </label>
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid={`press-tell-${contact.reporterPersonId}`}
            onClick={() =>
              onTell({
                ...(statement.trim() ? { statement } : {}),
                ...(eventIds.length > 0 ? { eventIds } : {}),
                ...(evidenceIds.length > 0
                  ? { evidenceArtifactIds: evidenceIds }
                  : {}),
                openLead,
              })
            }
          >
            Tell {contact.reporterName}
          </button>
        </>
      ) : (
        <p data-testid={`press-no-agreement-${contact.reporterPersonId}`}>
          Nothing is said until the terms are agreed.
        </p>
      )}
    </div>
  );
}
