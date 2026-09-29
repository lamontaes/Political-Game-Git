import { useState, type ReactNode } from "react";

import {
  legalStandingSentence,
  NO_CASES_ON_RECORD,
  NO_SENTENCES_ON_RECORD,
} from "../presentation/legal-record-english";
import { projectLegalRecord } from "../presentation/legal-record";
import { fileClemencyPetition } from "../simulation/justice/clemency";
import { enterPlea, type EnteredPlea } from "../simulation/justice/prosecution";
import type { EntityId, World } from "../simulation/types";

/**
 * The player's own record, in two tabs: the dossier everyone has, and Legal,
 * which only the player reads about themselves. Other people's dossiers have
 * no Legal tab; what the player knows of someone else's cases arrives through
 * the news and their shared history.
 */
export function SelfRecordTabs({
  record,
  legal,
}: {
  readonly record: ReactNode;
  readonly legal: ReactNode;
}) {
  const [tab, setTab] = useState<"record" | "legal">("record");
  return (
    <>
      <div
        className="pg-tabs"
        role="tablist"
        aria-label="Your record"
        data-testid="self-record-tabs"
      >
        <button
          type="button"
          role="tab"
          className="pg-tab"
          aria-selected={tab === "record"}
          data-testid="self-record-tab-record"
          onClick={() => setTab("record")}
        >
          Record
        </button>
        <button
          type="button"
          role="tab"
          className="pg-tab"
          aria-selected={tab === "legal"}
          data-testid="self-record-tab-legal"
          onClick={() => setTab("legal")}
        >
          Legal
        </button>
      </div>
      {tab === "record" ? record : legal}
    </>
  );
}

/**
 * Where the player stands with the law, read from Build 26's projection
 * (`projectLegalRecord`): the cases filed against them, the sentences handed
 * down and the clemency they asked for. A plea before the hearing and a
 * clemency request on a running sentence are offered exactly where the
 * projection says the actions allow them; the court and the clemency route
 * decide what follows. Neither action spends game time.
 */
export function LegalRecordPanel({
  world,
  personId,
  readOnly,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly readOnly: boolean;
  readonly onWorldChange: (world: World) => void;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const legal = projectLegalRecord(world, personId);
  const apply = (
    result: { ok: true; world: World } | { ok: false; reason: string },
  ): void => {
    if (result.ok) {
      setRefusal(null);
      onWorldChange(result.world);
    } else setRefusal(result.reason);
  };
  const plead = (referralId: EntityId, plea: EnteredPlea): void =>
    apply(enterPlea(world, { personId, referralId, plea }));
  const serving = legal.sentences.find((line) => line.servingNow);
  const open = legal.cases.filter((line) => line.canEnterPlea).length;
  const standing = legalStandingSentence({
    serving: serving ? (serving.kind === "jail" ? "jail" : "probation") : null,
    cases: legal.cases.length,
    awaitingPlea: open,
  });

  return (
    <div className="pg-legal-record" data-testid="legal-record">
      {standing ? (
        <p className="pg-legal-standing" data-testid="legal-standing">
          {standing}
        </p>
      ) : null}
      {refusal ? (
        <p className="game-note" role="status" data-testid="legal-refusal">
          {refusal}
        </p>
      ) : null}

      <section className="pg-dossier-section" aria-label="Cases">
        <h3>Cases</h3>
        {legal.cases.length === 0 ? (
          <p className="pg-person-card-note" data-testid="legal-cases-empty">
            {NO_CASES_ON_RECORD}
          </p>
        ) : (
          <ul className="pg-legal-list" data-testid="legal-cases">
            {legal.cases.map((line) => (
              <li
                key={line.referralId}
                className="pg-legal-item"
                data-testid={`legal-case-${line.referralId}`}
              >
                <p className="pg-legal-heading">
                  <strong>{line.offense}</strong>
                  <span className="pg-legal-meta">
                    Charged {line.chargedOnLabel}
                  </span>
                </p>
                <p data-testid={`legal-case-status-${line.referralId}`}>
                  {line.status}
                </p>
                {line.canEnterPlea && !readOnly ? (
                  <div className="pg-legal-actions">
                    <button
                      type="button"
                      className="ui-action ui-action--subtle"
                      data-testid={`legal-plead-not-guilty-${line.referralId}`}
                      onClick={() => plead(line.referralId, "not-guilty")}
                    >
                      Plead not guilty
                    </button>
                    <button
                      type="button"
                      className="ui-action ui-action--subtle"
                      data-testid={`legal-plead-guilty-${line.referralId}`}
                      onClick={() => plead(line.referralId, "guilty")}
                    >
                      Plead guilty
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pg-dossier-section" aria-label="Sentences">
        <h3>Sentences</h3>
        {legal.sentences.length === 0 ? (
          <p
            className="pg-person-card-note"
            data-testid="legal-sentences-empty"
          >
            {NO_SENTENCES_ON_RECORD}
          </p>
        ) : (
          <ul className="pg-legal-list" data-testid="legal-sentences">
            {legal.sentences.map((line) => (
              <li
                key={line.sentencedEventId}
                className="pg-legal-item"
                data-serving={line.servingNow}
                data-testid={`legal-sentence-${line.sentencedEventId}`}
              >
                <p>{line.term}</p>
                {line.requests.map((request) => (
                  <div
                    key={request.petitionId}
                    className="pg-legal-request"
                    data-testid={`legal-petition-${request.petitionId}`}
                  >
                    <p className="pg-legal-meta">
                      Clemency asked {request.askedOnLabel} ·{" "}
                      {REQUEST_STATUS[request.status]}
                    </p>
                    {request.answers.map((answer, index) => (
                      <p key={index}>{answer}</p>
                    ))}
                  </div>
                ))}
                {line.canAskForClemency && !readOnly ? (
                  <div className="pg-legal-actions">
                    <button
                      type="button"
                      className="ui-action ui-action--subtle"
                      data-testid={`legal-ask-clemency-${line.sentencedEventId}`}
                      onClick={() =>
                        apply(
                          fileClemencyPetition(world, {
                            personId,
                            sentencedEventId: line.sentencedEventId,
                          }),
                        )
                      }
                    >
                      Ask for clemency
                    </button>
                  </div>
                ) : line.whyNoRequest && line.servingNow ? (
                  <p className="pg-legal-meta">{line.whyNoRequest}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const REQUEST_STATUS = {
  open: "waiting for an answer",
  granted: "granted",
  denied: "turned down",
} as const;
