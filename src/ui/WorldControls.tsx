import { useId, useState } from "react";

import type { World } from "../simulation";

interface WorldControlsProps {
  readonly world: World;
  readonly onLoad: (seed: string) => void;
  readonly onAdvance: () => void;
}

export function WorldControls({
  world,
  onLoad,
  onAdvance,
}: WorldControlsProps) {
  const seedInputId = useId();
  const seedHelpId = useId();
  const seedErrorId = useId();
  const [seedInput, setSeedInput] = useState(world.seed);
  const [seedError, setSeedError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (seedInput.trim().length === 0) {
      setSeedError("Enter at least one non-whitespace character.");
      return;
    }

    setSeedError(null);
    onLoad(seedInput);
  }

  const describedBy = seedError ? `${seedHelpId} ${seedErrorId}` : seedHelpId;

  return (
    <section className="control-strip" aria-labelledby="world-controls-title">
      <form className="seed-form" onSubmit={submit}>
        <div className="control-heading">
          <h2 className="section-label control-title" id="world-controls-title">
            World controls
          </h2>
          <p className="active-seed">
            Active seed: <code>{world.seed}</code>
          </p>
        </div>
        <div className="seed-field">
          <label htmlFor={seedInputId}>World seed</label>
          <div className="seed-entry">
            <input
              id={seedInputId}
              value={seedInput}
              onChange={(event) => {
                const nextSeed = event.target.value;
                setSeedInput(nextSeed);
                if (nextSeed.trim().length > 0) {
                  setSeedError(null);
                }
              }}
              aria-describedby={describedBy}
              aria-invalid={seedError ? "true" : undefined}
              autoComplete="off"
              spellCheck="false"
            />
            <button type="submit">Create / reload</button>
          </div>
          <span className="field-help" id={seedHelpId}>
            Reloading reconstructs the baseline world and discards in-memory
            advancement.
          </span>
          {seedError ? (
            <span className="field-error" id={seedErrorId} role="alert">
              {seedError}
            </span>
          ) : null}
        </div>
      </form>
      <button className="advance-button" type="button" onClick={onAdvance}>
        Advance 7 days
      </button>
    </section>
  );
}
