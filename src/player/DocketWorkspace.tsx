import { useMemo, useState } from "react";

import type { EntityId, World } from "../simulation";
import {
  addDays,
  makeIsoDate,
  currentMeasureProvisions,
  personName,
} from "../simulation";
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
  docketBill,
  availableAuthorities,
  availableDraftOptions,
  fileDraft,
  previewDraft,
  queryDocket,
  resolveAuthority,
  type DocketBill,
  type DocketQuery,
  type DraftAuthorityOption,
} from "../presentation/legislation-docket";
import {
  selectDocketBill,
  selectedDocketKey,
} from "../presentation/legislation-docket-selection";
import {
  prepareBillEstimateAction,
  requestBillEstimate,
  projectBillEstimate,
} from "../presentation/legislation-estimate-action";
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
  const [query, setQuery] = useState<DocketQuery>({});
  const page = useMemo(
    () => queryDocket(world, { scenarioKey, playerPersonId }, query),
    [world, scenarioKey, playerPersonId, query],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(() =>
    selectedDocketKey(world, scenarioKey, playerPersonId),
  );
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    selectedKey === null
      ? null
      : docketBill(world, {
          scenarioKey,
          playerPersonId,
          docketKey: selectedKey,
        });

  /** Changing a filter starts the list again rather than paging into nothing. */
  function narrow(next: Partial<DocketQuery>) {
    setQuery((current) => ({ ...current, ...next, offset: 0 }));
    setSelectedKey(null);
  }

  return (
    <section className="docket" data-testid="docket">
      <h3 className="docket-heading">The bills this office is carrying</h3>

      {page.total === 0 ? (
        <p className="docket-empty" data-testid="docket-empty">
          Nothing has been filed yet.
        </p>
      ) : (
        <>
          {/*
            Filters appear once there is enough on the docket for them to be
            worth anything. Below that they would be four controls over three
            rows, which is worse than no controls at all.
          */}
          {page.total > 3 ? (
            <div className="docket-filters" data-testid="docket-filters">
              <label className="docket-filter">
                <span>Kind of bill</span>
                <select
                  data-testid="docket-filter-instrument"
                  value={query.instrument ?? ""}
                  onChange={(event) =>
                    narrow({
                      instrument:
                        event.target.value === ""
                          ? undefined
                          : (event.target.value as DocketQuery["instrument"]),
                    })
                  }
                >
                  <option value="">All kinds ({page.total})</option>
                  {page.instruments.map((facet) => (
                    <option key={facet.key} value={facet.key}>
                      {facet.label} ({facet.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="docket-filter">
                <span>Subject</span>
                <select
                  data-testid="docket-filter-family"
                  value={query.familyKey ?? ""}
                  onChange={(event) =>
                    narrow({
                      familyKey:
                        event.target.value === ""
                          ? undefined
                          : event.target.value,
                    })
                  }
                >
                  <option value="">All subjects ({page.total})</option>
                  {page.families.map((facet) => (
                    <option key={facet.key} value={facet.key}>
                      {facet.label} ({facet.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="docket-filter">
                <span>Still moving</span>
                <select
                  data-testid="docket-filter-status"
                  value={query.status ?? "all"}
                  onChange={(event) =>
                    narrow({
                      status: event.target.value as DocketQuery["status"],
                    })
                  }
                >
                  <option value="all">Everything ({page.total})</option>
                  <option value="open">Still moving ({page.openCount})</option>
                  <option value="concluded">
                    Finished ({page.concludedCount})
                  </option>
                </select>
              </label>

              <label className="docket-filter">
                <span>Find</span>
                <input
                  type="search"
                  data-testid="docket-filter-search"
                  value={query.search ?? ""}
                  placeholder="Bill number or title"
                  onChange={(event) => narrow({ search: event.target.value })}
                />
              </label>
            </div>
          ) : null}

          <p className="docket-count" data-testid="docket-count">
            {page.matching === page.total
              ? `${page.total} ${page.total === 1 ? "bill" : "bills"} on the docket.`
              : `${page.matching} of ${page.total} bills match.`}
            {page.matching > page.bills.length
              ? ` Showing ${page.offset + 1}–${page.offset + page.bills.length}.`
              : ""}
          </p>

          {page.bills.length === 0 ? (
            <p className="docket-empty" data-testid="docket-no-matches">
              No bill on this docket matches that.
            </p>
          ) : (
            <ul className="docket-list" data-testid="docket-list">
              {page.bills.map((bill) => (
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
                      onWorldChange(
                        selectDocketBill(
                          world,
                          scenarioKey,
                          playerPersonId,
                          bill.docketKey,
                        ),
                      );
                      setSelectedKey(bill.docketKey);
                      setDrafting(false);
                      setError(null);
                    }}
                  >
                    <span className="docket-designation">
                      {bill.designation}
                    </span>
                    <span className="docket-title">{bill.shortTitle}</span>
                    {bill.instrumentLabel ? (
                      <span className="docket-instrument">
                        {bill.instrumentLabel}
                      </span>
                    ) : null}
                    <span className="docket-stage">{stageLabel(bill)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {page.offset > 0 || page.hasMore ? (
            <div className="docket-paging" data-testid="docket-paging">
              <button
                type="button"
                className="ui-action"
                data-testid="docket-page-back"
                disabled={page.offset === 0}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    offset: Math.max(0, page.offset - page.limit),
                  }))
                }
              >
                Earlier bills
              </button>
              <button
                type="button"
                className="ui-action"
                data-testid="docket-page-forward"
                disabled={!page.hasMore}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    offset: page.offset + page.limit,
                  }))
                }
              >
                More bills
              </button>
            </div>
          ) : null}
        </>
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
          key={selected.docketKey}
          playerPersonId={playerPersonId}
          onWorldChange={onWorldChange}
          world={world}
          bill={selected}
          onGoToFloor={onGoToFloor}
          floorNote={floorNote}
        />
      ) : null}

      {drafting ? (
        <DraftingTable
          world={world}
          playerPersonId={playerPersonId}
          scenarioKey={scenarioKey}
          jurisdictionId={jurisdictionId}
          nextSequence={page.total + 1}
          onFile={(familyKey, variantKey, parameterValues, authorityKey) => {
            try {
              const result = fileDraft(world, {
                scenarioKey,
                playerPersonId,
                jurisdictionId,
                familyKey,
                variantKey,
                parameterValues,
                ...(authorityKey !== null ? { authorityKey } : {}),
              });
              setQuery({});
              onWorldChange(
                selectDocketBill(
                  result.world,
                  scenarioKey,
                  playerPersonId,
                  result.bill.docketKey,
                ),
              );
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
  playerPersonId,
  onWorldChange,
  world,
  bill,
  onGoToFloor,
  floorNote,
}: {
  readonly world: World;
  readonly bill: DocketBill;
  readonly playerPersonId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onGoToFloor: (bill: DocketBill) => void;
  readonly floorNote: string | null;
}) {
  const provisions = useMemo(
    () => currentMeasureProvisions(world, bill.measureId),
    [world, bill.measureId],
  );
  const analysis = useMemo(() => billAnalysis(world, bill), [world, bill]);
  const [startsOn, setStartsOn] = useState<string>(world.currentDate);
  const [endsOn, setEndsOn] = useState<string>(addDays(world.currentDate, 365));
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const privateEstimate = [...world.history.policyEstimates]
    .reverse()
    .map((estimate) => projectBillEstimate(world, playerPersonId, estimate.id))
    .find(
      (projection) =>
        projection?.measureId === bill.measureId &&
        projection.provisionIds.length === provisions.length &&
        projection.provisionIds.every((id) =>
          provisions.some((p) => p.id === id),
        ),
    );
  const canEstimate =
    analysis.fiscal.statedCeilingMinorUnits !== null &&
    (analysis.fiscal.effect.kind === "authorizes-ceiling" ||
      analysis.fiscal.effect.kind === "provides-money") &&
    !provisions.some((p) => p.fiscalPeriod === "annual");
  function recordEstimate() {
    try {
      const result = requestBillEstimate(
        world,
        prepareBillEstimateAction(world, bill, playerPersonId, {
          kind: "interval",
          startsAt: makeIsoDate(startsOn),
          endsAt: makeIsoDate(endsOn),
        }),
      );
      if (result.kind === "refused") setEstimateError(result.reason);
      else {
        onWorldChange(result.world);
        setEstimateError(null);
      }
    } catch {
      setEstimateError(
        "Choose valid start and end dates for the spending scenario.",
      );
    }
  }

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
          <dt>Kind of bill</dt>
          <dd data-testid="docket-instrument">
            {bill.instrumentLabel ?? "Not recorded"}
          </dd>
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

      <h5 className="docket-subheading">What the text proposes</h5>
      <p className="docket-analysis" data-testid="docket-stated-total">
        {analysis.fiscal.effect.kind === "unclassified-amount"
          ? analysis.fiscal.effect.label
          : analysis.fiscal.effect.kind === "states-no-amount"
            ? "This Act states no amount."
            : analysis.fiscal.effect.kind === "provides-money"
              ? `The sections would provide ${analysis.fiscal.statedCeilingLabel} if enacted.`
              : analysis.fiscal.effect.kind === "collects-charge"
                ? `The sections propose ${analysis.fiscal.statedCeilingLabel}.`
                : `The sections propose authorization of up to ${analysis.fiscal.statedCeilingLabel}.`}{" "}
        {analysis.fiscal.basis}
      </p>
      {analysis.fiscal.headroom ? (
        <p className="docket-analysis" data-testid="docket-headroom">
          It is written against {analysis.fiscal.headroom.citationLabel}
          {analysis.fiscal.headroom.allowedLabel === null
            ? ", which states no amount of its own."
            : `, which states ${analysis.fiscal.headroom.allowedLabel}. The difference from this bill is ${analysis.fiscal.headroom.remainingLabel}; this is not an available balance.`}
        </p>
      ) : null}
      <p className="docket-analysis" data-testid="docket-estimate">
        {analysis.estimate.kind === "available"
          ? `${analysis.estimate.statement} That can be estimated: somebody has established where it stands today.`
          : `No estimate is available. ${analysis.estimate.reason}`}
      </p>
      {canEstimate ? (
        <fieldset
          className="docket-estimate-controls"
          data-testid="docket-conditional-analysis"
        >
          <legend>Conditional spending scenario</legend>
          <p>
            Assume the full stated amount is funded and spent during these
            dates. This does not predict service results or establish that money
            is available.
          </p>
          <label>
            From{" "}
            <input
              type="date"
              data-testid="estimate-start"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
            />
          </label>
          <label>
            Through{" "}
            <input
              type="date"
              data-testid="estimate-end"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="ui-action"
            data-testid="record-conditional-estimate"
            onClick={recordEstimate}
          >
            Record conditional spending scenario
          </button>
        </fieldset>
      ) : null}
      {privateEstimate ? (
        <div className="docket-analysis" data-testid="docket-recorded-estimate">
          <p>
            Additional spending under these assumptions:{" "}
            {formatMinorUnits(
              privateEstimate.addedOutlaysMinorUnits,
              privateEstimate.currency,
            )}
            .
          </p>
          <p>
            Recorded period: {privateEstimate.referencePeriod.startsAt} through{" "}
            {privateEstimate.referencePeriod.endsAt}.
          </p>
          <p>{privateEstimate.qualification}</p>
        </div>
      ) : null}
      {estimateError ? (
        <p role="alert" className="docket-error">
          {estimateError}
        </p>
      ) : null}
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
  playerPersonId,
  onFile,
}: {
  readonly scenarioKey: string;
  readonly jurisdictionId: EntityId;
  readonly nextSequence: number;
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly onFile: (
    familyKey: string,
    variantKey: string,
    parameterValues: Readonly<Record<string, ProgramParameterValue>>,
    authorityKey: string | null,
  ) => void;
}) {
  const options = useMemo(
    () => availableDraftOptions(scenarioKey),
    [scenarioKey],
  );
  const authorities = useMemo(
    () => availableAuthorities(world, { scenarioKey, playerPersonId }),
    [world, scenarioKey, playerPersonId],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [authorityKey, setAuthorityKey] = useState<string | null>(null);
  const [values, setValues] = useState<
    Readonly<Record<string, ProgramParameterValue>>
  >({});

  const option = options.find(
    (entry) => `${entry.familyKey}/${entry.variantKey}` === chosen,
  );

  // Which authorities this kind of act can actually be written against. An
  // appropriation needs one that spends; a repeal or an eligibility amendment
  // can act on anything that exists. The list narrows to what would work,
  // rather than offering everything and failing at the boundary.
  const eligibleAuthorities: readonly DraftAuthorityOption[] = option
    ? option.requiresAuthority
      ? authorities.filter(
          (candidate) =>
            !option.requiresSpendingAuthority || candidate.authorizesSpending,
        )
      : []
    : [];

  const authority = useMemo(() => {
    if (!option?.requiresAuthority || authorityKey === null) return undefined;
    return (
      resolveAuthority(world, { scenarioKey, playerPersonId }, authorityKey) ??
      undefined
    );
  }, [option, authorityKey, world, scenarioKey, playerPersonId]);

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
        ...(authority !== undefined ? { predicateAuthority: authority } : {}),
      });
    } catch {
      return null;
    }
  }, [
    option,
    authority,
    scenarioKey,
    jurisdictionId,
    world.currentDate,
    nextSequence,
  ]);

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
          ...(authority !== undefined ? { predicateAuthority: authority } : {}),
        }),
      };
    } catch (caught) {
      return { refused: (caught as Error).message };
    }
  }, [
    option,
    values,
    authority,
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
                  setAuthorityKey(null);
                }}
              >
                <span className="drafting-option-family">
                  {entry.familyTitle}
                </span>
                <span className="drafting-option-variant">
                  {entry.variantLabel}
                </span>
                <span className="drafting-option-instrument">
                  {entry.instrumentLabel}
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

          <p className="drafting-instrument" data-testid="drafting-instrument">
            <strong>{option.instrumentLabel}.</strong>{" "}
            {option.instrumentDescription}
          </p>

          {option.requiresAuthority ? (
            <div
              className="drafting-authority"
              data-testid="drafting-authority"
            >
              <h5 className="docket-subheading">What this bill would act on</h5>
              {eligibleAuthorities.length === 0 ? (
                <p className="docket-error" data-testid="drafting-no-authority">
                  There is nothing here for this bill to act on yet.{" "}
                  {option.requiresSpendingAuthority
                    ? "An appropriation has to name a programme that is already authorized to spend — pass one first, or choose a different kind of bill."
                    : "It has to name something that already exists."}
                </p>
              ) : (
                <ul className="drafting-authority-list">
                  {eligibleAuthorities.map((candidate) => (
                    <li key={candidate.authorityKey}>
                      <button
                        type="button"
                        className={
                          candidate.authorityKey === authorityKey
                            ? "drafting-authority-option drafting-authority-chosen"
                            : "drafting-authority-option"
                        }
                        data-testid={`drafting-authority-${candidate.authorityKey}`}
                        onClick={() =>
                          setAuthorityKey(
                            candidate.authorityKey === authorityKey
                              ? null
                              : candidate.authorityKey,
                          )
                        }
                      >
                        <span className="drafting-authority-citation">
                          {candidate.citationLabel}
                        </span>
                        <span className="drafting-authority-note">
                          {candidate.note}
                        </span>
                        <span className="drafting-authority-ceiling">
                          {candidate.authorizedCeilingLabel === null
                            ? "It states no amount."
                            : `It authorizes ${candidate.authorizedCeilingLabel}.`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

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
                {asChosen.draft.appropriatedLabel !== null
                  ? `As you would file it, this Act provides ${asChosen.draft.appropriatedLabel}${
                      asChosen.draft.predicateAuthority
                        ?.authorizedCeilingMinorUnits === null
                        ? "."
                        : `, against the ${formatMinorUnits(
                            asChosen.draft.predicateAuthority
                              ?.authorizedCeilingMinorUnits ?? 0,
                            "USD",
                          )} that ${asChosen.draft.predicateAuthority?.citationLabel} authorizes.`
                    }`
                  : asChosen.draft.revenueLabel !== null
                    ? `As you would file it, this Act charges ${asChosen.draft.revenueLabel}. What that raises depends on how many pay it, and nothing here knows that.`
                    : asChosen.draft.authorizedCeilingLabel === null
                      ? "This configuration authorizes no money at all."
                      : `As you would file it, this Act authorizes up to ${asChosen.draft.authorizedCeilingLabel}. Stating a ceiling is not providing the money.`}
              </p>

              <button
                type="button"
                className="ui-action"
                data-testid="file-the-draft"
                onClick={() =>
                  onFile(
                    option.familyKey,
                    option.variantKey,
                    values,
                    authorityKey,
                  )
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
