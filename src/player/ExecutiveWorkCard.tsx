import { useState } from "react";
import {
  composeExecutiveStatement,
  executiveDraftKey,
  selectedExecutiveFacts,
  type ExecutiveStatementKind,
  type ExecutiveWorkPractice,
  type ExecutiveWorkItemView,
} from "../presentation/executive-work";
import {
  actOnExecutiveWork,
  type ExecutiveWorkAction,
} from "../simulation/executive-work";
import type { ExecutiveKernelId } from "../simulation/executive-governing-kernels";
import type {
  World,
  EntityId,
  FutureTransitionHandlerRegistry,
} from "../simulation/types";

interface PracticeDraft {
  readonly fingerprint: string;
  readonly selectedFactKeys: readonly string[];
}

/** Existing kernel detail and command adapter inside the single office inbox. */
export function ExecutiveWorkCard({
  world,
  item,
  onWorldChange,
  handlers,
}: {
  readonly world: World;
  readonly item: ExecutiveWorkItemView;
  readonly onWorldChange: (world: World) => void;
  readonly handlers?: FutureTransitionHandlerRegistry;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PracticeDraft>>({});
  function draftFor(
    itemId: EntityId,
    practice: ExecutiveWorkPractice,
  ): PracticeDraft {
    const stored = drafts[executiveDraftKey(itemId, practice.id)];
    if (!stored || stored.fingerprint !== practice.draftFingerprint)
      return { fingerprint: practice.draftFingerprint, selectedFactKeys: [] };
    return stored;
  }

  function writeDraft(
    itemId: EntityId,
    practice: ExecutiveWorkPractice,
    selectedFactKeys: readonly string[],
  ) {
    setDrafts((current) => ({
      ...current,
      [executiveDraftKey(itemId, practice.id)]: {
        fingerprint: practice.draftFingerprint,
        selectedFactKeys,
      },
    }));
  }

  function preview(
    practice: ExecutiveWorkPractice,
    kind: ExecutiveStatementKind,
    selectedFactKeys: readonly string[],
  ) {
    return composeExecutiveStatement({
      kind,
      selectedFacts: selectedExecutiveFacts(practice.facts, selectedFactKeys),
      measureDesignation: practice.measureDesignation,
    });
  }

  function act(
    itemId: EntityId,
    kernelId: ExecutiveKernelId,
    action: ExecutiveWorkAction,
    statement?: string,
  ) {
    const before = world;
    const result = actOnExecutiveWork(
      world,
      itemId,
      kernelId,
      action,
      handlers,
      statement,
    );
    if (result.ok) {
      if (result.world !== before) onWorldChange(result.world);
      setFeedback(null);
    } else setFeedback(result.reason);
  }

  return (
    <li className="governing-matter" data-testid="executive-work-item">
      <h5>{item.title}</h5>
      {feedback && <p role="status">{feedback}</p>}
      <p>{item.summary}</p>
      {item.recordedStatements.length > 0 && (
        <section aria-label="Recorded office statements">
          {item.recordedStatements.map((record, index) => (
            <p key={`${item.id}:recorded:${index}`}>{record.text}</p>
          ))}
        </section>
      )}
      {item.practices.length === 0 ? (
        <p>
          This work cannot proceed with the current records, staff and
          represented authority.
        </p>
      ) : (
        item.practices.map((practice) => {
          const draft = draftFor(item.id, practice);
          const instruction = preview(
            practice,
            "instruction",
            draft.selectedFactKeys,
          );
          const sign = preview(practice, "sign", draft.selectedFactKeys);
          const veto = preview(practice, "veto", draft.selectedFactKeys);
          return (
            <details key={practice.id}>
              <summary>{practice.title}</summary>
              {practice.facts.map((fact) => (
                <p key={fact.key}>{fact.text}</p>
              ))}
              {(practice.decision || practice.disposition) &&
                practice.facts.length > 0 && (
                  <fieldset>
                    <legend>Recorded grounds</legend>
                    {practice.facts.map((fact) => {
                      const checked = draft.selectedFactKeys.includes(fact.key);
                      return (
                        <label key={fact.key}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              writeDraft(
                                item.id,
                                practice,
                                checked
                                  ? draft.selectedFactKeys.filter(
                                      (key) => key !== fact.key,
                                    )
                                  : [...draft.selectedFactKeys, fact.key],
                              )
                            }
                          />
                          {fact.text}
                        </label>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => writeDraft(item.id, practice, [])}
                    >
                      Clear selection
                    </button>
                  </fieldset>
                )}
              {practice.rationaleUnavailable && (
                <p role="status">{practice.rationaleUnavailable}</p>
              )}
              {practice.decision && instruction.ok && (
                <blockquote data-testid="executive-statement-preview">
                  {instruction.statement}
                </blockquote>
              )}
              {practice.decision && !instruction.ok && (
                <p role="status">{instruction.reason}</p>
              )}
              {practice.decision && (
                <>
                  <button
                    disabled={!instruction.ok}
                    onClick={() =>
                      instruction.ok &&
                      act(
                        item.id,
                        practice.id,
                        "return-for-work",
                        instruction.statement,
                      )
                    }
                  >
                    Return for staff review
                  </button>
                  <button onClick={() => act(item.id, practice.id, "defer")}>
                    Defer review for 7 days
                  </button>
                  <button
                    disabled={!instruction.ok}
                    onClick={() =>
                      instruction.ok &&
                      act(
                        item.id,
                        practice.id,
                        "continue",
                        instruction.statement,
                      )
                    }
                  >
                    Record this instruction
                  </button>
                </>
              )}
              {practice.complete ? (
                <p>This office work is complete.</p>
              ) : practice.disposition ? (
                <>
                  {sign.ok ? (
                    <blockquote data-testid="executive-statement-preview">
                      {sign.statement}
                    </blockquote>
                  ) : (
                    <p role="status">{sign.reason}</p>
                  )}
                  <button
                    disabled={!sign.ok}
                    onClick={() =>
                      sign.ok &&
                      act(item.id, practice.id, "sign", sign.statement)
                    }
                  >
                    Sign the measure
                  </button>
                  {practice.canVeto &&
                    (veto.ok ? (
                      <blockquote data-testid="executive-veto-preview">
                        {veto.statement}
                      </blockquote>
                    ) : (
                      <p role="status">{veto.reason}</p>
                    ))}
                  {practice.canVeto && (
                    <button
                      disabled={!veto.ok}
                      onClick={() =>
                        veto.ok &&
                        act(
                          item.id,
                          practice.id,
                          "veto-with-message",
                          veto.statement,
                        )
                      }
                    >
                      Return with a veto message
                    </button>
                  )}
                </>
              ) : (
                !practice.decision && (
                  <button onClick={() => act(item.id, practice.id, "continue")}>
                    {practice.actionLabel}
                  </button>
                )
              )}
            </details>
          );
        })
      )}
    </li>
  );
}
