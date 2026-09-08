import { useMemo, useState } from "react";

import type { EntityId, World } from "../simulation";
import { currentMeasureProvisions, personName } from "../simulation";
import {
  compareDrafts,
  type CompiledBillDraft,
} from "../simulation/legislation-drafting";
import {
  formatMinorUnits,
  programVariant,
  type ProgramParameterSpec,
  type ProgramParameterValue,
} from "../simulation/legislation-program-families";
import {
  availableDraftOptions,
  fileDraft,
  previewDraft,
  readDocket,
  type DocketBill,
} from "../presentation/legislation-docket";
import { billAnalysis } from "../presentation/legislation-analysis";

/**
 * The office's bills, and the drafting table beside them.
 *
 * Work used to hold one bill and one verb: look at what is moving. This is the
 * same surface with the two things it was missing — a docket with more than
 * one bill on it, and somewhere to choose what the next one is actually about.
 *
 * Everything shown about a filed bill is read from canonical records: the
 * sections come from the measure's current provisions, so an adopted amendment
 * shows up here without this component knowing anything about amendments. The
 * drafting table is pure preview until the player presses the one button that
 * files, which is the only thing here that writes.
 */

export interface DocketWorkspaceProps {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  readonly onWorldChange: (world: World) => void;
  /** Opens the members' room for one bill. Null while none can be entered. */
  readonly onGoToFloor: (bill: DocketBill) => void;
  readonly floorNote: string | null;
}

export function DocketWorkspace({
  world,
  playerPersonId,
  scenarioKey,
  jurisdictionId,
  onWorldChange,
  onGoToFloor,
  floorNote,
}: DocketWorkspaceProps) {
  const docket = useMemo(
    () => readDocket(world, { scenarioKey, playerPersonId }),
    [world, scenarioKey, playerPersonId],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    docket.find((bill) => bill.docketKey === selectedKey) ?? null;

  return (
    <section className="docket" data-testid="docket">
      <h3 className="docket-heading">The bills this office is carrying</h3>
      {docket.length === 0 ? (
        <p className="docket-empty" data-testid="docket-empty">
          Nothing has been filed yet.
        </p>
      ) : (
        <ul className="docket-list" data-testid="docket-list">
          {docket.map((bill) => (
            <li
              key={bill.docketKey}
              className={
                bill.docketKey === selectedKey
                  ? "docket-entry docket-entry-open"
                  : "docket-entry"
              }
            >
              <button
                type="button"
                className="docket-entry-button"
                data-testid={`docket-open-${bill.docketKey}`}
                onClick={() => {
                  setSelectedKey(
                    bill.docketKey === selectedKey ? null : bill.docketKey,
                  );
                  setDrafting(false);
                  setError(null);
                }}
              >
                <span className="docket-designation">{bill.designation}</span>
                <span className="docket-title">{bill.shortTitle}</span>
                <span className="docket-stage">{stageLabel(bill)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="ui-action"
        data-testid="open-drafting-table"
        onClick={() => {
          setDrafting(!drafting);
          setSelectedKey(null);
          setError(null);
        }}
      >
        {drafting ? "Leave the drafting table" : "Start a new bill"}
      </button>

      {error ? (
        <p className="docket-error" data-testid="docket-error">
          {error}
        </p>
      ) : null}

      {selected ? (
        <FiledBillPanel
          world={world}
          bill={selected}
          onGoToFloor={onGoToFloor}
          floorNote={floorNote}
        />
      ) : null}

      {drafting ? (
        <DraftingTable
          world={world}
          scenarioKey={scenarioKey}
          jurisdictionId={jurisdictionId}
          nextSequence={docket.length + 1}
          onFile={(familyKey, variantKey, parameterValues) => {
            try {
              const result = fileDraft(world, {
                scenarioKey,
                playerPersonId,
                jurisdictionId,
                familyKey,
                variantKey,
                parameterValues,
              });
              onWorldChange(result.world);
              setSelectedKey(result.bill.docketKey);
              setDrafting(false);
              setError(null);
            } catch (caught) {
              setError((caught as Error).message);
            }
          }}
        />
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* One filed bill                                                              */
/* -------------------------------------------------------------------------- */

function FiledBillPanel({
  world,
  bill,
  onGoToFloor,
  floorNote,
}: {
  readonly world: World;
  readonly bill: DocketBill;
  readonly onGoToFloor: (bill: DocketBill) => void;
  readonly floorNote: string | null;
}) {
  const provisions = useMemo(
    () => currentMeasureProvisions(world, bill.measureId),
    [world, bill.measureId],
  );
  const analysis = useMemo(() => billAnalysis(world, bill), [world, bill]);
  const sponsor =
    bill.sponsorPersonId === null
      ? undefined
      : world.people[bill.sponsorPersonId];

  return (
    <article className="docket-bill" data-testid="docket-bill">
      <h4 className="docket-bill-heading">
        {bill.designation} — {bill.shortTitle}
      </h4>

      <dl className="docket-identity" data-testid="docket-identity">
        <div>
          <dt>Sponsor of record</dt>
          <dd data-testid="docket-sponsor">
            {sponsor ? personName(sponsor) : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Your part in it</dt>
          <dd data-testid="docket-role">
            {bill.playerRole.kind === "sponsor-of-record"
              ? "You are the sponsor of record."
              : bill.playerRole.kind === "office-of-the-sponsor"
                ? "You carry it for the member whose office you work in."
                : "No sponsor is recorded on this measure."}
          </dd>
        </div>
        <div>
          <dt>Before</dt>
          <dd>{bill.chamberName ?? "Not yet before a chamber"}</dd>
        </div>
        <div>
          <dt>Filed</dt>
          <dd data-testid="docket-filed-on">{bill.filedOn}</dd>
        </div>
        <div>
          <dt>Where it is</dt>
          <dd>{stageLabel(bill)}</dd>
        </div>
        <div>
          <dt>Drafted from</dt>
          <dd data-testid="docket-lineage">
            {bill.familyTitle} — {bill.variantLabel} ({bill.familyVersion})
          </dd>
        </div>
      </dl>

      <h5 className="docket-subheading">The bill as it currently reads</h5>
      <ol className="docket-clauses" data-testid="docket-clauses">
        {provisions.map((record) => (
          <li key={record.id} className="docket-clause">
            <span className="docket-clause-heading">
              Section {record.sectionNumber}. {record.heading}
            </span>
            <span className="docket-clause-text">{record.text}</span>
            {record.fiscalExposureLabel ? (
              <span className="docket-clause-money">
                {record.fiscalExposureLabel}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <h5 className="docket-subheading">What it commits</h5>
      <p className="docket-analysis" data-testid="docket-stated-total">
        {analysis.fiscal.statedCeilingLabel === "This Act states no amount."
          ? "This Act states no amount."
          : `The sections add up to ${analysis.fiscal.statedCeilingLabel}.`}{" "}
        {analysis.fiscal.basis}
      </p>
      <p className="docket-analysis" data-testid="docket-estimate">
        {analysis.estimate.kind === "available"
          ? `${analysis.estimate.statement} That can be estimated: somebody has established where it stands today.`
          : `No estimate is available. ${analysis.estimate.reason}`}
      </p>
      {analysis.declaredLimits.length > 0 ? (
        <ul className="docket-limits" data-testid="docket-limits">
          {analysis.declaredLimits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className="ui-action"
        data-testid="docket-go-to-floor"
        onClick={() => onGoToFloor(bill)}
      >
        Take {bill.designation} to the members&rsquo; room
      </button>
      {floorNote ? (
        <p className="docket-error" data-testid="docket-floor-note">
          {floorNote}
        </p>
      ) : null}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* The drafting table                                                          */
/* -------------------------------------------------------------------------- */

function DraftingTable({
  scenarioKey,
  jurisdictionId,
  nextSequence,
  world,
  onFile,
}: {
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  readonly nextSequence: number;
  readonly world: World;
  readonly onFile: (
    familyKey: string,
    variantKey: string,
    parameterValues: Readonly<Record<string, ProgramParameterValue>>,
  ) => void;
}) {
  const options = useMemo(
    () => availableDraftOptions(scenarioKey),
    [scenarioKey],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [values, setValues] = useState<
    Readonly<Record<string, ProgramParameterValue>>
  >({});

  const option = options.find(
    (entry) => `${entry.familyKey}/${entry.variantKey}` === chosen,
  );

  // Two readings of the same configuration: the one the bank offers by
  // default, and the one the player has moved to. Comparing them is how a
  // change of scope or amount becomes visible as text rather than as a number
  // moving on a control.
  const asOffered = useMemo<CompiledBillDraft | null>(() => {
    if (!option) return null;
    try {
      return previewDraft({
        scenarioKey,
        jurisdictionId,
        familyKey: option.familyKey,
        variantKey: option.variantKey,
        filedOn: world.currentDate,
        provisionalSequence: nextSequence,
      });
    } catch {
      return null;
    }
  }, [option, scenarioKey, jurisdictionId, world.currentDate, nextSequence]);

  const asChosen = useMemo<
    { readonly draft: CompiledBillDraft } | { readonly refused: string } | null
  >(() => {
    if (!option) return null;
    try {
      return {
        draft: previewDraft({
          scenarioKey,
          jurisdictionId,
          familyKey: option.familyKey,
          variantKey: option.variantKey,
          parameterValues: values,
          filedOn: world.currentDate,
          provisionalSequence: nextSequence,
        }),
      };
    } catch (caught) {
      return { refused: (caught as Error).message };
    }
  }, [
    option,
    values,
    scenarioKey,
    jurisdictionId,
    world.currentDate,
    nextSequence,
  ]);

  const specs: readonly ProgramParameterSpec[] = option
    ? programVariant(option.familyKey, option.variantKey).variant.parameters
    : [];

  return (
    <section className="drafting" data-testid="drafting-table">
      <h4 className="docket-subheading">What could this bill be about?</h4>
      <ul className="drafting-options" data-testid="drafting-options">
        {options.map((entry) => {
          const key = `${entry.familyKey}/${entry.variantKey}`;
          return (
            <li key={key}>
              <button
                type="button"
                className={
                  key === chosen
                    ? "drafting-option drafting-option-chosen"
                    : "drafting-option"
                }
                data-testid={`drafting-option-${entry.familyKey}-${entry.variantKey}`}
                onClick={() => {
                  setChosen(key === chosen ? null : key);
                  setValues({});
                }}
              >
                <span className="drafting-option-family">
                  {entry.familyTitle}
                </span>
                <span className="drafting-option-variant">
                  {entry.variantLabel}
                </span>
                <span className="drafting-option-synopsis">
                  {entry.synopsis}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {option && asOffered ? (
        <div className="drafting-detail">
          <p className="drafting-mechanism" data-testid="drafting-mechanism">
            {option.mechanism}
          </p>

          <h5 className="docket-subheading">What you can change</h5>
          <div className="drafting-controls" data-testid="drafting-controls">
            {specs.map((spec) => (
              <ParameterControl
                key={spec.key}
                spec={spec}
                value={
                  values[spec.key] ??
                  programVariant(option.familyKey, option.variantKey).variant
                    .defaults[spec.key]!
                }
                onChange={(next) =>
                  setValues((current) => ({ ...current, [spec.key]: next }))
                }
              />
            ))}
          </div>

          {asChosen && "refused" in asChosen ? (
            <p className="docket-error" data-testid="drafting-refused">
              {asChosen.refused}
            </p>
          ) : null}

          {asChosen && "draft" in asChosen ? (
            <>
              <h5 className="docket-subheading">
                As offered, and as you would file it
              </h5>
              <table
                className="drafting-compare"
                data-testid="drafting-compare"
              >
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>As offered</th>
                    <th>As you would file it</th>
                  </tr>
                </thead>
                <tbody>
                  {compareDrafts(asOffered, asChosen.draft).map((row) => (
                    <tr
                      key={row.provisionKey}
                      className={
                        row.changed ? "drafting-row-changed" : undefined
                      }
                      data-testid={`drafting-row-${row.provisionKey}`}
                    >
                      <th scope="row">{row.heading}</th>
                      <td>{row.currentText ?? "—"}</td>
                      <td>{row.proposedText ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="docket-analysis" data-testid="drafting-total">
                {asChosen.draft.authorizedCeilingLabel === null
                  ? "This configuration authorizes no money at all."
                  : `As you would file it, the sections state ${asChosen.draft.authorizedCeilingLabel}.`}
              </p>

              <button
                type="button"
                className="ui-action"
                data-testid="file-the-draft"
                onClick={() =>
                  onFile(option.familyKey, option.variantKey, values)
                }
              >
                File this bill
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * One typed control per parameter.
 *
 * Every control produces the value the compiler wants directly — minor units,
 * a whole count, a chosen option key — so nothing here formats a number into
 * words and reads it back out again. The label beside a control is a rendering
 * of the value, never its source.
 */
function ParameterControl({
  spec,
  value,
  onChange,
}: {
  readonly spec: ProgramParameterSpec;
  readonly value: ProgramParameterValue;
  readonly onChange: (value: ProgramParameterValue) => void;
}) {
  const controlId = `draft-param-${spec.key}`;
  if (spec.kind === "money" && value.kind === "money") {
    const step = niceMoneyStep(spec.maxMinorUnits - spec.minMinorUnits);
    return (
      <label className="drafting-control" htmlFor={controlId}>
        <span className="drafting-control-label">{spec.label}</span>
        <input
          id={controlId}
          type="range"
          data-testid={controlId}
          min={spec.minMinorUnits}
          max={spec.maxMinorUnits}
          step={step}
          value={value.minorUnits}
          onChange={(event) =>
            onChange({
              kind: "money",
              minorUnits: Number(event.target.value),
              currency: spec.currency,
            })
          }
        />
        <output className="drafting-control-value">
          {formatMinorUnits(value.minorUnits, value.currency)}
        </output>
      </label>
    );
  }
  if (spec.kind === "integer" && value.kind === "integer") {
    return (
      <label className="drafting-control" htmlFor={controlId}>
        <span className="drafting-control-label">{spec.label}</span>
        <input
          id={controlId}
          type="range"
          data-testid={controlId}
          min={spec.min}
          max={spec.max}
          step={1}
          value={value.value}
          onChange={(event) =>
            onChange({ kind: "integer", value: Number(event.target.value) })
          }
        />
        <output className="drafting-control-value">
          {value.value} {spec.unitLabel}
        </output>
      </label>
    );
  }
  if (spec.kind === "duration-years" && value.kind === "duration-years") {
    return (
      <label className="drafting-control" htmlFor={controlId}>
        <span className="drafting-control-label">{spec.label}</span>
        <input
          id={controlId}
          type="range"
          data-testid={controlId}
          min={spec.minYears}
          max={spec.maxYears ?? spec.minYears + 10}
          step={1}
          value={value.years ?? spec.minYears}
          onChange={(event) =>
            onChange({
              kind: "duration-years",
              years: Number(event.target.value),
            })
          }
        />
        <output className="drafting-control-value">
          {value.years === null ? "ongoing" : `${value.years} years`}
        </output>
      </label>
    );
  }
  if (spec.kind === "enumerated" && value.kind === "enumerated") {
    return (
      <label className="drafting-control" htmlFor={controlId}>
        <span className="drafting-control-label">{spec.label}</span>
        <select
          id={controlId}
          data-testid={controlId}
          value={value.value}
          onChange={(event) =>
            onChange({ kind: "enumerated", value: event.target.value })
          }
        >
          {spec.options.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return null;
}

/**
 * A slider increment a person would actually say out loud.
 *
 * Two things have to be true at once. The increment should be round money —
 * one fortieth of a range gives steps like $1,375,000, and dragging a funding
 * control should not produce figures nobody would draft. And the family's
 * declared ceiling has to be reachable: a range input snaps to its grid, so a
 * step that does not divide the range exactly leaves the maximum one short,
 * and a player could never choose the largest amount the family allows.
 *
 * So this takes the largest round increment that divides the range exactly,
 * and only falls back to an unrounded fortieth when no round one divides it.
 */
function niceMoneyStep(range: number): number {
  if (range <= 0) return 1;
  const candidates: number[] = [];
  for (let exponent = 0; exponent <= 12; exponent += 1) {
    for (const multiple of [1, 2, 5]) {
      const candidate = multiple * 10 ** exponent;
      if (candidate <= range / 20) candidates.push(candidate);
    }
  }
  for (const candidate of candidates.sort((left, right) => right - left)) {
    if (range % candidate === 0) return candidate;
  }
  return Math.max(1, Math.round(range / 40));
}

function stageLabel(bill: DocketBill): string {
  switch (bill.stage) {
    case "filed":
      return "Filed, awaiting referral";
    case "in-committee":
      return "In committee";
    case "on-floor":
      return "On the floor";
    case "in-second-chamber":
      return "With the other chamber";
    case "with-the-governor":
      return "With the Governor";
    case "concluded":
      return "Concluded";
  }
}
