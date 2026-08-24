# World State, Observations, and Future Transitions

Stage 6 Run A establishes quantitative truth, fallible measurement, and deterministic future transition identity without implementing economy dynamics, policy effects, or generalized event selection.

## Exact quantitative values

`ExactQuantity` is a canonical reduced rational represented by safe-integer numerator and positive denominator plus a validated open namespaced unit key. Zero is always `0/1`; negative numerators are valid; malformed units, noncanonical loaded values, incompatible-unit arithmetic, and unsafe intermediate/final arithmetic are rejected rather than rounded. Stage 5 `MoneyAmount` remains the separate exact integer-minor-unit money primitive. A metric value is a closed union of one exact quantity or one exact money amount, so formatted text and floating-point numbers never compete with truth.

## Metric definitions, scope, and periods

`WorldMetricCatalog` is definition metadata stored once per world, not append history. Definitions have deterministic stable IDs/keys, open domain and tags, quantity-or-money value kind, expected quantity unit, stock/flow/rate/index nature, point/interval period form, optional denominator metric, and explicit geographic-aggregation limitation. The synthetic starter catalog proves one point stock, one interval rate, and one interval money flow; it is not a production metric catalog or dynamics model. Derived formulas remain Run B work.

Every state or observation has an exact stable-jurisdiction scope and optional validated open segment key. No global unscoped value, 50-state enumeration, implicit geographic coverage, or missing-value zero exists. Reference periods remain a closed point-or-interval union. An interval retains both dates and is never treated as its end-date value.

## Canonical state history

`WorldMetricStateRecord` is canonical simulated quantitative truth. It preserves stable identity, global sequence, metric/scope/period, exact typed value, recording date, simulated/initialization/authored provenance, and optional explicit correction. For one exact metric + scope + period, the first truth has no predecessor and every later value must explicitly supersede the latest matching record. A correction cannot cross metric, scope, or period, cannot be recorded before its predecessor, and never mutates the prior record. Same-day corrections remain valid and use append sequence as their deterministic order; a legitimate late backfill for a different scope or reference period remains distinct.

State periods must finish no later than the recording date, and records cannot be committed beyond current world time. Queries apply both as-of date and exclusive append sequence. Exact-period queries resolve the latest available correction; “most recent” queries order by explicit period end/start and only then by sequence, so a late correction to an old period does not masquerade as a newer period.

## Observation and vintage history

`WorldMetricObservationRecord` is a source-series estimate or public statistic, never canonical truth. It retains scope/period/value, source-series and source label, optional structured reference and methodology key, release and commit dates, vintage identity, uncertainty, optional underlying-state link, and explicit within-series revision.

Independent sources may observe the same metric/scope/period differently. A revision must stay in the exact metric/scope/period/source series, supersede its latest available vintage, and not be recorded before that vintage. Same-day revisions remain valid and use append sequence as their deterministic order. Queries either name a source series or return all available series; no engine “latest observation” chooses among competitors. Date and exclusive sequence both gate availability, so a later-appended backdated release cannot leak into an earlier cutoff.

Uncertainty is either unstated, a compatible lower/upper range, or a compatible nonnegative margin of error with optional exact `rate:share` confidence. Quantity units and money currencies must match. No distributions, inference, or statistical testing are implemented.

Writing truth never creates an observation. Writing/revising an observation never changes or creates truth. Neither action grants person knowledge. A domain may append an ordinary public-release `HistoricalEvent` involving the observation and then use existing person-specific `EventKnowledgeRecord` provenance. The permanent integration gate proves one person learns while another remains unaware; there is no statistics-specific knowledge or media store.

## Generic future due items

`FutureDueItem` is one stable scheduled identity with scheduled date, future due date, validated open transition key, sorted canonical entity references, optional stable jurisdiction, provenance, and global creation sequence. It contains no closure, arbitrary payload, formula, recurrence expression, or duplicated domain truth. A future handler follows the references to the domain record that owns meaning.

Append-oriented due-item state uses exactly the closed runtime and persisted vocabulary `scheduled`, `resolved`, `cancelled`, and `blocked`. It begins as `scheduled` and may become exactly one terminal state. Terminal history explicitly supersedes scheduled history and may link an ordinary outcome event. Resolved/blocked transitions occur on the due date; cancellation may occur earlier. Terminal items never rerun; retries or rescheduling require a new due item.

Handlers live in a nonserialized typed registry. `advanceWorld` is the authoritative external time path: it preflights handlers, processes crossed scheduled items by due date then creation sequence, temporarily exposes each due date to its pure handler, appends exactly one terminal state for the complete same-date batch, and only then validates/commits that settled frontier and the ordinary time-advance event. A committed or persisted world may not retain a latest `scheduled` state whose due date is at or before its current time frontier. Missing handlers, thrown handlers, direct due-state writes, invalid outcomes, unknown status values, or an unprocessed due-now item fail the proposed advance or loaded world without changing the caller's immutable world. Worlds without due items retain prior advancement behavior.

Run A supplies only synthetic/test handlers. Elections, policy effective dates, sunsets, incidents, law, obligations, appointments, and other domain handlers remain with their owning later systems. This is the one future-transition mechanism, not a recurrence, payroll, billing, or generalized event engine.

## Integrity and persistence

Metric state, observations, due items, and due states join the one contiguous `HistoryStore` sequence and deterministic stable-ID space. Integrity validates catalog identity/order, exact canonical quantities, type/unit/currency/period compatibility, scope and jurisdiction references, predecessor recording chronology, source availability, correction/revision chains, exact due-state vocabulary, due references/lifecycle/current-frontier settlement, outcome-event links, and per-family append order both at write time and when loading a snapshot.

World schema 10, generator `demo-world-v10`, and snapshot format 9 preserve the metric catalog and every new history family exactly through JSON and the Node-only SQLite repository. Person materializer version 4 remains unchanged. Unsupported older versions remain rejected; no fabricated migration sequence was added.

## Deferred systems

Run A adds no effect graph, economy or fiscal tick, formula language, policy forecast/baseline/implementation, generalized event prerequisites/selection/chains, natural disaster or recession generator, mortality/incapacity/evidence system, law/institutions/elections/campaigns, media ecology, public opinion, territory-specific content, foreign-government simulation, or player-facing UI. Runs B–E and later stages own those boundaries.
