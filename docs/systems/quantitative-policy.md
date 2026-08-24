# Quantitative Policy Semantics, Baselines, and Implementation

Stage 6 Run C adds a generic quantitative policy layer over the accepted world-metric, causal-effect, and future-transition contracts. It is not law, legislation, a budget process, an opinion score, or a second effect engine.

## Alternatives and operations

`PolicyAlternativeRecord` is the stable proposal/intervention identity. It may cite an existing descriptive proposition, but the engine never parses proposition parameter text into quantitative behavior. Open namespaced alternative and realization keys let later campaign, executive, legislative, administrative, and authored-scenario producers reuse the same identity.

Each `PolicyOperationRecord` targets exactly one existing primitive metric, jurisdiction/optional segment scope, explicit point or interval reference period, and immutable baseline. The closed operation family is set-level, absolute change, relative change, share of another named baseline, cap, and floor, with an optional typed exact threshold. Values reuse exact reduced rational quantities or integer-minor-unit money; incompatible value kind, unit, currency, period, scope, source frontier, or timing fails rather than being converted or guessed. Multi-jurisdiction distribution is an explicit collection of scoped operations, never one hidden national aggregate or 50-state branch.

## Baselines and estimates

A `PolicyBaselineRecord` is an append-oriented dated counterfactual/expectation, not an observation and not canonical metric truth. It freezes metric/scope/period, exact expected value, source IDs available when generated, methodology and assumptions, compatible uncertainty, provenance, and explicit series predecessor. A later reality record or backfilled/revised baseline cannot rewrite it or enter an earlier date-plus-exclusive-sequence view.

A `PolicyEstimateRecord` freezes the consequences computed from exact operation and baseline IDs under one implementation profile and one projected Run B causal root. Consequences retain baseline, intended result/change, derived implementation share, estimated result/change, trigger result, and uncertainty. Recording an alternative, operation, baseline, projected root, profile, or estimate creates no `EffectActivationRecord` and mutates no metric state. Forecast causal identity supports correlated-consequence deduplication without pretending the forecast is reality.

## Implementation and realization

`PolicyImplementationProfileRecord` preserves five independent bounded exact factors in fixed semantic order: authority/eligibility, funding/resources, administrative capacity/setup, enforcement/compliance, and uptake/participation. The only aggregate rule is `multiplicative-v1`, the exact product of those five shares. Authority is allowed or blocked. Funding and administrative capacity may retain exact compatible required/available evidence and derive a capped coverage ratio. The separate factors, reason keys, explanations, and evidence IDs remain inspectable; there is no universal feasibility, implementation, political support, or utility score.

`PolicyRealizationRecord` is a separate explicit implementation result. A blocked or unmet-trigger result creates no actual causal process or activation. A full or partial result creates one actual child causal process and ordinary Run B effect activations, preserving projected root correlation, exact realized magnitude, target scope, and accepted point-target or exact interval-total magnitude basis. Actual canonical metric truth still appears only when the normal explicit Run B evaluator and metric writer commit a baseline-plus-effect result.

Delayed implementation schedules one ordinary `policy:realize-estimate` due item. The injected deterministic handler uses the same canonical realization, causal, effect, and event writers at the due frontier. There is no recurrence syntax, policy scheduler, automatic economy tick, or implicit passage of time into policy truth.

## Subjective access and decisions

Policy records do not grant person knowledge. `recordPolicyAnalysisKnowledge` creates an ordinary review event involving one estimate and one person, then ordinary event knowledge with its own accuracy, confidence, visibility, and provenance. `createPolicyDecisionContext` accepts only estimate knowledge belonging to the actor and adapts caller-supplied actor interpretation plus optional feasibility concern to the existing Stage 4 decision contract. It does not convert policy magnitude into ideology or a universal preference score, and another person cannot consume the private estimate without their own knowledge path.

## Persistence and boundaries

The six policy families share the world's one contiguous append sequence, deterministic IDs, immutable inputs, date-plus-exclusive-sequence availability, canonical source validation, and corrupted-graph integrity checks. World schema 12, generator `demo-world-v12`, and snapshot format 11 preserve them through deterministic JSON and Node-only SQLite save/load/list/replace. Metric catalog v2, causal catalog v1, and person materializer v4 remain unchanged.

Run C adds no law identity, statute, office, agency, appropriation, tax, budget authority, policy baseline generator, public opinion, media ecology, generalized incident selection/chain, mortality/incapacity/evidence, territory-specific data, foreign government, campaign system, or player-facing UI. Stage 7 and later governing systems may become authoritative producers of alternatives, authority evidence, and actual implementation without replacing these quantitative records; Run D is the next Stage 6 boundary.
