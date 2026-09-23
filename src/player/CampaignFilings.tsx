import { useState } from "react";

import { projectCampaignCompliance } from "../presentation/campaign-compliance-projection";
import type { EntityId, World } from "../simulation";
import {
  campaignStatementStatus,
  fileCampaignStatement,
} from "../simulation/campaign-compliance";

const DOCUMENT_NAMES = {
  "statement-of-spending-intent": "Statement of spending intent",
  "statement-of-organization": "Statement of organization",
  "periodic-report": "Campaign finance report",
  amendment: "Correction",
} as const;

/**
 * What the committee has to file with the state, and what it has filed.
 * Filing spends no game time; a filed statement is a public record.
 */
export function CampaignFilings({
  world,
  personId,
  campaignId,
  onWorldChange,
  readableDate,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly campaignId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly readableDate: (isoDate: string) => string;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const view = projectCampaignCompliance(world, campaignId, personId);
  const statement = campaignStatementStatus(world, campaignId);
  const statementName =
    statement.kind === "not-required"
      ? null
      : DOCUMENT_NAMES[statement.rule.documentKind].toLowerCase();
  const rules = view.obligations.filter(
    (obligation) => obligation.state === "KNOWN",
  );
  if (statement.kind === "not-required" && view.documents.length === 0) {
    return null;
  }
  return (
    <section
      className="game-campaign-filings"
      data-testid="campaign-filings"
      aria-label="Filings"
    >
      <h3>Filings</h3>
      {statement.kind === "due" ? (
        <p data-testid="campaign-filings-statement">
          The committee&apos;s {statementName} is due with the state by{" "}
          {readableDate(statement.dueOn)}.{" "}
          <button
            type="button"
            data-testid="campaign-filings-file-statement"
            onClick={() => {
              try {
                onWorldChange(fileCampaignStatement(world, campaignId));
                setProblem(null);
              } catch (error) {
                setProblem(
                  error instanceof Error ? error.message : String(error),
                );
              }
            }}
          >
            File it now
          </button>
        </p>
      ) : statement.kind === "missed" ? (
        <p data-testid="campaign-filings-statement">
          The committee&apos;s {statementName} was due by{" "}
          {readableDate(statement.dueOn)}, and it was never filed.
        </p>
      ) : null}
      {view.documents.length > 0 ? (
        <ol data-testid="campaign-filings-documents">
          {view.documents.map((document) => (
            <li key={document.id}>
              {DOCUMENT_NAMES[document.kind]}:{" "}
              {document.status === "filed" && document.filedAt
                ? `filed ${readableDate(document.filedAt)}, now a public record`
                : "a private draft, not filed"}
            </li>
          ))}
        </ol>
      ) : null}
      {rules.length > 0 ? (
        <details>
          <summary>What the state asks of a committee</summary>
          <ol>
            {rules.map((rule) => (
              <li key={rule.key}>{rule.summary}</li>
            ))}
          </ol>
        </details>
      ) : null}
      {problem ? <p className="game-note">{problem}</p> : null}
    </section>
  );
}
