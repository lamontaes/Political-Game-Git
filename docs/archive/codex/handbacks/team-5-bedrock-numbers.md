# Pressure and news still depend on placeholder numbers

Several inherited numbers decide how pressure accumulates, where migration is
reported, and when news appears. Their source explicitly calls them placeholders.
This inventory records those effects without approving them. The first bounded
pass covers the inherited source paths below; semantic review of the literal
register and delegated producers remains open. No calibration or world facts changed.

## Evidence and scope

Source base: `719b91b86978189ed975eed6f6722fb2af78158d`, September 30, 2026.
Current locality-only mount edit contains no new numeric literal. All effects
below are SOURCE-INFERRED unless explicitly measured. No watched-world effects
or observed frequency claims are made. Dates and legal ages require exact-place
research; age 18 below is not approved as one universal legal value.

## Behavior and visibility numbers reviewed

| Value and unit                                                                                            | Source location                                                                          | Research status                                                                                  | Downstream effect                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hazard pressure 0.02 / 0.05 / 0.1 / 0.2                                                                   | pressure/causes.ts:27                                                                    | Explicit BLANKET, not researched                                                                 | A recorded minor/moderate/major/catastrophic hazard adds leave and fear pressure in its state.                                                                                                                                                |
| Tax-rate-change multiplier 5                                                                              | pressure/causes.ts:41                                                                    | Explicit BLANKET, not researched                                                                 | Absolute rate change becomes leave pressure for an increase and arrival pressure for a cut. Missing prior terms return 0, which can make the whole new rate count as a change.                                                                |
| Assault/robbery 0.002; burglary/vandalism 0.001 per excess report                                         | pressure/causes.ts:50                                                                    | Explicit BLANKET, not researched                                                                 | Excess reports above an imported unresearched town police-log baseline add state fear. Ordinary background uses 12 months and 365.25 days/year; neither conversion validates that baseline.                                                   |
| Unemployment gap multiplier 0.02                                                                          | pressure/causes.ts:61                                                                    | Explicit BLANKET, not researched                                                                 | Recorded state versus national unemployment feeds leave or arrival pressure. Missing separate state observations do not establish a measured state gap.                                                                                       |
| Failed handling anger 0.02 / 0.05 / 0.1 / 0.2                                                             | pressure/anger.ts:36                                                                     | Explicit BLANKET, not researched                                                                 | A failure verdict adds state anger according to recorded hazard magnitude.                                                                                                                                                                    |
| Unemployment rise multiplier 0.1                                                                          | pressure/anger.ts:49                                                                     | Explicit BLANKET, not researched                                                                 | National published unemployment rise adds anger to every state; a fall adds none. Four-decimal rounding uses 10,000. This is asymmetric.                                                                                                      |
| Attack anger 0.2 and fear 0.2                                                                             | pressure/anger.ts:52                                                                     | Explicit BLANKET, not researched                                                                 | Recorded violence attempts feed target-home-state pressure.                                                                                                                                                                                   |
| Fade 0.25 per quarter                                                                                     | pressure/step.ts:30                                                                      | Explicit BLANKET, not researched                                                                 | Retains 75% of prior pressure before adding current contributions.                                                                                                                                                                            |
| Initial window 91 days; flow interval 4 quarters                                                          | pressure/step.ts:33,36                                                                   | Authored schedule; not measured response timing                                                  | Defines first pressure period and when annual flow records are written. Four quarters is calendar grouping, not validation of a 91-day initial window.                                                                                        |
| Base outflow 2%/year; minimum pull 0.1; neutral pull/push 1                                               | pressure/flows.ts:15,18,42,51                                                            | Explicit BLANKET for rate/floor; authored normalization for 1                                    | Pressure multiplies the base outflow and relative destination shares. These are aggregate records, not individual relocation decisions. No upper outflow cap is established here.                                                             |
| Keep 5 destinations; percentage scale 100; rounding 1,000                                                 | pressure/flows.ts:21,84,95                                                               | Editorial truncation and units; no empirical five-destination basis                              | Keeps largest five destination shares without renormalizing them to 100%. Rounds records to three decimals.                                                                                                                                   |
| Anger line 0.3; lasting after 1 quarter; attempt line 2; expiry 4 quarters                                | pressure/ladder.ts:74                                                                    | Explicit BLANKET, not researched                                                                 | Defines hard boundaries for unrest persistence, threat strain, attempts and expiry. These are unresolved continuous-factor and actor-causation gaps, not approved weights.                                                                    |
| News sweep 7 days; response window 2 days; publish delay 1 day; hold recheck 7 days; 1 routine item/sweep | press/desk.ts:84                                                                         | Explicit authored crunch46-provisional-v1; not measured newsroom timing                          | Controls due work, response closure and routine-news throughput. Staff-scaled capacity also changes how many items can be taken.                                                                                                              |
| Archive 90 days                                                                                           | press/desk.ts:172                                                                        | Authored window, no empirical basis established                                                  | Opening archive excludes earlier eligible public events; this is publication coverage, not loss of canonical history.                                                                                                                         |
| Corroboration 2 distinct sources, or 1 plus documentary support                                           | press/desk.ts:882                                                                        | AP/Reuters constraints cited in source; numeric transportability not independently verified here | Makes allegation material eligible for corroborated treatment. Citation is not evidence that every outlet/place follows this exact rule.                                                                                                      |
| Recorded scale 1/2/3/4; national reach line 3                                                             | press/desk.ts:1699,1713                                                                  | Authored ordinal mapping, not researched                                                         | Event magnitude/importance tags can promote place-bound news to national scope. A hard boundary, not a smooth reach model.                                                                                                                    |
| Keep 3 story subjects                                                                                     | press/desk.ts:1849                                                                       | Editorial limit, not researched                                                                  | Limits whose response is sought and who is treated as a subject; later real participants remain stored.                                                                                                                                       |
| Outcome story after 365 days; lookback 30 days                                                            | press/law-effect-news.ts:442,444                                                         | Authored observation windows, not researched                                                     | Controls when enacted-law outcome stories can be considered. Does not establish a measured effect lag.                                                                                                                                        |
| Minor currency units /100; rounded amount/average                                                         | press/law-effect-news.ts:333,403,606                                                     | Currency unit convention and display arithmetic                                                  | Changes visible precision, not stored money.                                                                                                                                                                                                  |
| Open opportunities cap 4; replenishment budget 1 when any remain                                          | life-opportunities.ts:136,511                                                            | Explicit narrative/backlog cap, not researched                                                   | Limits simultaneous offers and refresh attempts.                                                                                                                                                                                              |
| Meeting next day at 18:30–19:45; trip 18:10–18:30; work 75 minutes                                        | life-opportunities.ts:357,358,380,381,401                                                | Explicit game-authored duration, not measured geography or place calendar                        | Creates a posted meeting and real travel/work records. 20-minute travel and 75-minute attendance are fixed authored facts for this offer.                                                                                                     |
| Age >=18 counterpart gates                                                                                | life-opportunities.ts:1086,1094; ordinary-meeting-presence.ts:389; person-context.ts:610 | Existing adult classification; exact-place legal basis not established                           | Removes younger counterparts from these selection/context paths. Does not justify youth employment or universal adulthood rules.                                                                                                              |
| Hash multiplier 31 and modulus 1,000,003                                                                  | life-opportunities.ts:774                                                                | Deterministic technical mixing, not empirical                                                    | Breaks same-history offer ties using seed/person/date/kind; circumstance ordering repeats this hash at life-circumstances.ts:453. These choose content, not merely identity, and need no-dice review. No numeric recalibration is authorized. |
| Unresolved circumstances cap 2                                                                            | life-circumstances.ts:137                                                                | Explicit authored narrative cap, not researched                                                  | Limits unresolved predicaments.                                                                                                                                                                                                               |
| Age bands 18–26, 18–99, 17–26, 17–26, 18–26, 18–30, 5–8, 17–20                                            | life-circumstances.ts:143–150                                                            | Authored content eligibility, not researched                                                     | Hard-gates each respective circumstance kind. The upper age 99 can exclude older living people. These are not legal rules.                                                                                                                    |
| Minutes/hour 60; floor start and ceil end hour                                                            | life-circumstances.ts:603–625                                                            | Unit conversion and coarse schedule projection                                                   | Rounded hours can broaden the visible occupied interval; no effect-size calibration.                                                                                                                                                          |
| Recent perceptions 2; linked facts cap 3                                                                  | presentation/person-dossier.ts:318,354                                                   | Editorial limits, not researched                                                                 | Restricts displayed information rather than canonical history. Public-career event list itself is not capped or acquaintance-gated.                                                                                                           |
| Importance intensity 0.25 / 0.5 / 1; fallback 0.5                                                         | macro-economy/sources.ts:52,97                                                           | Explicit authored ordinal mapping; not researched                                                | Converts legacy recorded developments to national shock intensity. Unknown importance assumes 0.5.                                                                                                                                            |
| Crisis scan starts January 1, 1900                                                                        | macro-economy/sources.ts:127                                                             | Authored lower bound, not researched                                                             | Earlier causal crisis origins are omitted from this reader.                                                                                                                                                                                   |
| Intensity ceiling 1; omit below 0.000001                                                                  | macro-economy/sources.ts:296,299                                                         | Authored normalization and small-value cutoff                                                    | Caps realized-money shock intensity and suppresses tiny origins. Full-intensity denominator is imported; its research belongs to the producer owner.                                                                                          |
| Full closing intensity at 5 jobs per 100; bank credit intensity 1                                         | macro-economy/sources.ts:326,355–360                                                     | Authored scaling; no empirical basis established                                                 | Closing job share becomes employment shock intensity; bank failure applies full credit tightening. Place-to-person propagation is not proved by this source inventory.                                                                        |

| Newsworthiness matter 4; named people 2; public office 2; audience 1; beat 1; resident 2 | press/desk.ts:1749–1771 | Authored weights; resident explicitly PLACEHOLDER, no numeric research established for the others | Adds score terms used to order coverage; recorded scale adds its 1–4 ladder. This can choose which stories use limited newsroom capacity. |
| Substantive scale 2 | press/desk.ts:1782 | Authored hard boundary, not researched | Distinguishes more-than-routine events from minor ones. |
| Candidacy age 21; occasion 15:00–18:00 | life-opportunities.ts:626–627,657 | Authored eligibility/schedule; exact-place legal basis not established | Restricts candidacy approaches and fixes an occasion interval, without deriving office eligibility from place law. |
| Shift requests 16:00–22:00; shared assignment 180 minutes | life-circumstances.ts:518–519,546,581–582,657–658 | Authored schedules/duration, not measured work patterns | Books requested shift time and assignment effort. |
| Return coverage request after 120 days | life-circumstances.ts:1050 | Authored reciprocity interval, not researched | Delays follow-up need after covering a shift; does not derive need from an actual staffing cause. |

## Shared reader boundaries and next action

Team 8 separately inventories the day-opening English engine, including its
3/7 offsets, bank cardinalities, numeral spelling and version conventions.
Team 5 retains the routed unsupported-exclusivity repair; no duplicated writer.
Imported crime, crisis, macro-policy and development producers need their owners'
ledger entries. This report does not declare their coefficients researched.

The literal register below prevents silent omissions. Remaining semantic review
includes press score weights, meeting actor ordering, circumstance hours and UI
visibility limits. Those rows are explicitly UNREVIEWED. Complete their causal
classification before calling the entire Team 5 ledger complete. No tests,
full simulation or browser acceptance is inferred from this read-only audit.

## Literal coverage register

This register is an exhaustive AST numeric-literal scan of the listed, existing
source files at the pinned base plus the locality mount edit. It includes
mechanical indexing and layout numbers so omission is visible. Numeric strings,
authored prose durations, imported coefficients and implicit bank sizes need
separate semantic review; this register alone is not a completed behavioral audit.
Rows not explained above remain UNREVIEWED, not researched or approved.

### `src/simulation/press/desk.ts`

| Line | Literal values | Source context                                                                  |
| ---- | -------------- | ------------------------------------------------------------------------------- |
| 86   | 7              | `sweepDays: 7,`                                                                 |
| 87   | 2              | `responseWindowDays: 2,`                                                        |
| 88   | 1              | `routinePublishDays: 1,`                                                        |
| 89   | 7              | `holdRecheckDays: 7,`                                                           |
| 90   | 1              | `routineItemsPerSweep: 1,`                                                      |
| 125  | 1              | `return dispositionsForLead(world, leadId).at(-1) ?? null;`                     |
| 172  | 90             | `const oldest = addDays(world.currentDate, -90);`                               |
| 282  | 0              | `const staffed = opening > 0 ? opening : roles.length;`                         |
| 285  | 0              | `if (staffed === 0) return full;`                                               |
| 329  | 0              | `if (lead.subjectPersonIds.length > 0 \|\| lead.matterId !== null) {`           |
| 342  | 0              | `if (lead.family === "scheduled-beat" && lead.subjectPersonIds.length === 0) {` |
| 363  | 0              | `entityId: lead.basisEventIds[0]!,`                                             |
| 384  | 1              | `const traceId = next.history.decisionTraces.at(-1)!.id;`                       |
| 409  | 0              | `lead.subjectPersonIds.length > 0 &&`                                           |
| 473  | 1              | `const request = next.history.events.at(-1)!;`                                  |
| 584  | 1              | `const eventId = next.history.events.at(-1)!.id;`                               |
| 618  | 0              | `lead.basisEventIds[0]!,`                                                       |
| 624  | 0              | `sourceEntityIds: [lead.basisEventIds[0]!],`                                    |
| 631  | 0              | `return rest.slice(0, rest.lastIndexOf(":")) as EntityId;`                      |
| 737  | 0              | `entityId: lead.basisEventIds[0]!,`                                             |
| 874  | 0              | `(contribution) => contribution.leakedEvidenceArtifactIds.length > 0,`          |
| 878  | 0              | `publicBasis.length === 0;`                                                     |
| 882  | 2              | `distinctSources >= 2 \|\|`                                                     |
| 883  | 1              | `(distinctSources >= 1 && documentary);`                                        |
| 902  | 0              | `const canNarrow = !material.corroborated && material.publicBasis.length > 0;`  |
| 947  | 0              | `entityId: lead.basisEventIds[0]!,`                                             |
| 984  | 1              | `const traceId = next.history.decisionTraces.at(-1)!.id;`                       |
| 1075 | 1              | `const story = next.history.events.at(-1)!;`                                    |
| 1081 | 1              | `const publication = next.history.publications!.at(-1)!;`                       |
| 1133 | 0              | `if (siblings.length === 0) return world;`                                      |
| 1204 | 1              | `const copy = next.history.events.at(-1)!;`                                     |
| 1213 | 1              | `publicationId: next.history.publications!.at(-1)!.id,`                         |
| 1319 | 0              | `if (contribution.leakedEvidenceArtifactIds.length > 0) {`                      |
| 1359 | 0              | `if (declined.length > 0)`                                                      |
| 1361 | 0              | `if (silent.length > 0)`                                                        |
| 1369 | 0, 0           | `const leadEvent = publicBasis[0] ?? basis[0]!;`                                |
| 1376 | 0              | `: lead.family === "allegation" && publicBasis.length === 0`                    |
| 1382 | 0              | `!(index === 0 && paragraph.trim() === headline.trim()),`                       |
| 1399 | 0              | `return names.length > 0 ? names.join(" and ") : "a public official";`          |
| 1418 | 1              | `const last = publicSteps.at(-1);`                                              |
| 1423 | 0              | `if (sentences.length === 0) {`                                                 |
| 1445 | 0              | `dueItem.stableKey === "press46:desk-sweep:0" ? 0 : dueItem.sequence;`          |
| 1461 | 1              | `stableKey: \`press46:desk-sweep:${index + 1}\`,`                               |
| 1583 | 0              | `0,`                                                                            |
| 1591 | 0              | `let routineTaken = 0;`                                                         |
| 1592 | 0              | `const chosen = routed.slice(0, free).filter(({ routine }) => {`                |
| 1594 | 1              | `routineTaken += 1;`                                                            |
| 1598 | 0              | `const event = events[0]!;`                                                     |
| 1641 | 0              | `if (outlet.scope === "local" && residentSubjects(world, outlet, event) > 0)`   |
| 1703 | 1              | `"magnitude:minor": 1,`                                                         |
| 1704 | 2              | `"magnitude:moderate": 2,`                                                      |
| 1705 | 3              | `"magnitude:major": 3,`                                                         |
| 1706 | 4              | `"magnitude:catastrophic": 4,`                                                  |
| 1707 | 1              | `"importance:minor": 1,`                                                        |
| 1708 | 2              | `"importance:notable": 2,`                                                      |
| 1709 | 3              | `"importance:major": 3,`                                                        |
| 1713 | 3              | `export const NATIONAL_REACH_SCALE = 3;`                                        |
| 1716 | 0, 0           | `return Math.max(0, ...event.tags.map((tag) => RECORDED_SCALE[tag] ?? 0));`     |
| 1748 | 4              | `if (matterIdOf(event)) reasons.push({ key: "matter", weight: 4 });`            |
| 1749 | 0              | `if (subjectsOf(world, event).length > 0)`                                      |
| 1750 | 2              | `reasons.push({ key: "named-people", weight: 2 });`                             |
| 1752 | 0              | `if (scale > 0) reasons.push({ key: "scale", weight: scale });`                 |
| 1754 | 2              | `reasons.push({ key: "public-office", weight: 2 });`                            |
| 1759 | 1              | `reasons.push({ key: "audience", weight: 1 });`                                 |
| 1761 | 1              | `reasons.push({ key: "beat", weight: 1 });`                                     |
| 1765 | 0              | `if (outlet.scope === "local" && residentSubjects(world, outlet, event) > 0)`   |
| 1766 | 2              | `reasons.push({ key: "resident", weight: 2 });`                                 |
| 1768 | 0              | `score: reasons.reduce((total, reason) => total + reason.weight, 0),`           |
| 1774 | 2              | `const SUBSTANTIVE_SCALE = 2;`                                                  |
| 1849 | 0, 3           | `).slice(0, 3);`                                                                |
| 1899 | 0              | `const event = eventById(world, lead.basisEventIds[0]);`                        |
| 1915 | 0              | `if (current.length === 0) return null;`                                        |
| 1947 | 0              | `)[0]!;`                                                                        |
| 1951 | 0              | `const basis = eventById(world, lead.basisEventIds[0])!;`                       |
| 1955 | 1              | `.at(-1);`                                                                      |
| 1975 | 1              | `if (history.at(-1)?.decision !== "published") continue;`                       |
| 2012 | 1              | `const correction = next.history.publications!.at(-1)!;`                        |
| 2051 | 0, 1           | `return text.charAt(0).toUpperCase() + text.slice(1);`                          |
| 2055 | 1, 0           | `if (names.length <= 1) return names[0] ?? "";`                                 |
| 2056 | 0, 1, 1        | `return \`${names.slice(0, -1).join(", ")} and ${names.at(-1)}\`;`              |

### `src/simulation/press/law-effect-news.ts`

| Line | Literal values | Source context                                                                            |
| ---- | -------------- | ----------------------------------------------------------------------------------------- |
| 104  | 0              | `if (enactments.size === 0) return world;`                                                |
| 109  | 0              | `if (touches.length === 0) return world;`                                                 |
| 159  | 1, 0, 1        | `for (let index = terms.length - 1; index >= 0; index -= 1) {`                            |
| 171  | 0              | `if (change === 0) continue;`                                                             |
| 177  | 0              | `if (!town \|\| personIds.length === 0) continue;`                                        |
| 181  | 0              | `const earlier = steps.get(row.id) ?? 0;`                                                 |
| 212  | 0              | `const count = seen.get(key) ?? 0;`                                                       |
| 214  | 1              | `seen.set(key, count + 1);`                                                               |
| 223  | 1, 0, 1        | `for (let index = exposures.length - 1; index >= 0; index -= 1) {`                        |
| 273  | 0              | `const first = personIds[0];`                                                             |
| 283  | 0              | `const first = group[0]!;`                                                                |
| 329  | 1              | `return \`${count} ${count === 1 ? one : many}\`;`                                        |
| 333  | 100            | `const value = Math.abs(minor) / 100;`                                                    |
| 335  | 1, 0, 0, 2     | `minimumFractionDigits: value % 1 === 0 ? 0 : 2,`                                         |
| 336  | 2              | `maximumFractionDigits: 2,`                                                               |
| 341  | 0              | `const reach = group[0]!.reach;`                                                          |
| 346  | 0              | `(total, touch) => total + (touch.movedMinor ?? 0),`                                      |
| 347  | 0              | `0,`                                                                                      |
| 349  | 0              | `const rose = changes.filter((value) => value > 0).length;`                               |
| 350  | 0              | `const fell = changes.filter((value) => value < 0).length;`                               |
| 352  | 0, 0           | `rose > 0 && fell === 0`                                                                  |
| 354  | 0, 0           | `: fell > 0 && rose === 0`                                                                |
| 361  | 0              | `return changes.length > 0`                                                               |
| 394  | 0, 1           | `reasons.set(touch.reason, (reasons.get(touch.reason) ?? 0) + 1);`                        |
| 397  | 0, 0           | `)[0]?.[0];`                                                                              |
| 402  | 0              | `if (changes.length > 0) {`                                                               |
| 404  | 0              | `changes.reduce((total, value) => total + value, 0) / changes.length,`                    |
| 406  | 0              | `const each = group[0]!.reach === "pay" ? "a paycheck" : "a payment";`                    |
| 408  | 0              | `\`The change averaged ${dollars(average)} ${average >= 0 ? "more" : "less"} ${each}.\`,` |
| 442  | 365            | `const OUTCOME_STORY_AFTER_DAYS = 365;`                                                   |
| 444  | 30             | `const LOOK_BACK_WINDOW_DAYS = 30;`                                                       |
| 458  | 0              | `if (places.length === 0) return world;`                                                  |
| 501  | 1              | `const before = addDays(enactment.effectiveAt, -1);`                                      |
| 520  | 0              | `if (outcomes.length === 0) continue;`                                                    |
| 534  | 1              | `)?.factor ?? 1;`                                                                         |
| 596  | 0, 1           | `definition.name.charAt(0).toLowerCase() + definition.name.slice(1);`                     |
| 607  | 1              | `const number = value.toLocaleString("en-US", { maximumFractionDigits: 1 });`             |

### `src/presentation/person-dossier.ts`

| Line | Literal values | Source context                          |
| ---- | -------------- | --------------------------------------- |
| 133  | 0              | `if (summary.interactionCount === 0) {` |
| 138  | 1              | `? summary.interactionCount === 1`      |
| 318  | 2              | `.slice(-2)) {`                         |
| 354  | 3              | `if (links.length >= 3) break;`         |
| 523  | 0              | `memberships[0];`                       |

### `src/player/ShellDossier.tsx`

No AST numeric literals.

### `src/player/SavedAppearance.tsx`

| Line | Literal values | Source context                                                       |
| ---- | -------------- | -------------------------------------------------------------------- |
| 187  | 1              | `appearanceFamilyLabel(family, \`Appearance choice ${index + 1}\`),` |

### `src/player/opening-life/OpeningLifeFlow.tsx`

No AST numeric literals.

### `src/player/PersonCard.tsx`

| Line | Literal values | Source context                                                             |
| ---- | -------------- | -------------------------------------------------------------------------- |
| 55   | 12             | `const CARD_MARGIN = 12;`                                                  |
| 56   | 14             | `const CARD_GAP = 14;`                                                     |
| 82   | 160, 0.22      | `const bottomReserve = Math.min(160, Math.round(viewport.height * 0.22));` |
| 98   | 0              | `if (facts.length === 0) return null;`                                     |
| 301  | 1              | `tabIndex={-1}`                                                            |
| 323  | 0, 1           | `{knownAs.charAt(0).toUpperCase() + knownAs.slice(1)}`                     |
| 340  | 0              | `) : learned.length > 0 ? (`                                               |
| 434  | 0              | `{expanded && facts.length === 0 ? (`                                      |
| 442  | 3              | `{!expanded && onExpand && (dossier.details.length > 3 \|\| true) ? (`     |
| 454  | 0              | `{expanded && dossier.publicCareer.length > 0 ? (`                         |
| 467  | 0              | `{expanded && dossier.laws.length > 0 ? (`                                 |
| 508  | 0              | `{expanded && dossier.sharedHistory.length > 0 ? (`                        |
| 525  | 0              | `{expanded && connections.length > 0 ? (`                                  |
| 565  | 0              | `dossier.links.filter((link) => link.kind !== "person").length > 0 ? (`    |
| 676  | 0              | `{expanded && unavailableReasons.length > 0 ? (`                           |

### `src/simulation/living-world/developments.ts`

No AST numeric literals.

### `src/presentation/news-headlines.ts`

No AST numeric literals.

### `src/simulation/pressure/anger.ts`

| Line | Literal values | Source context                                                               |
| ---- | -------------- | ---------------------------------------------------------------------------- |
| 39   | 0.02           | `minor: 0.02,`                                                               |
| 40   | 0.05           | `moderate: 0.05,`                                                            |
| 41   | 0.1            | `major: 0.1,`                                                                |
| 42   | 0.2            | `catastrophic: 0.2,`                                                         |
| 49   | 0.1            | `export const BLANKET_UNEMPLOYMENT_RISE_ANGER = 0.1;`                        |
| 52   | 0.2, 0.2       | `export const BLANKET_ATTACK_PRESSURE = { anger: 0.2, fear: 0.2 } as const;` |
| 128  | 1              | `.at(-1);`                                                                   |
| 131  | 1              | `.at(-1);`                                                                   |
| 132  | 0              | `const rise = latest && prior ? latest.value! - prior.value! : 0;`           |
| 133  | 0              | `if (latest && rise > 0) {`                                                  |
| 135  | 10000, 10000   | `Math.round(rise * BLANKET_UNEMPLOYMENT_RISE_ANGER * 10000) / 10000;`        |

### `src/simulation/pressure/causes.ts`

| Line | Literal values | Source context                                                                |
| ---- | -------------- | ----------------------------------------------------------------------------- |
| 30   | 0.02           | `minor: 0.02,`                                                                |
| 31   | 0.05           | `moderate: 0.05,`                                                             |
| 32   | 0.1            | `major: 0.1,`                                                                 |
| 33   | 0.2            | `catastrophic: 0.2,`                                                          |
| 41   | 5              | `export const BLANKET_TAX_RATE_PRESSURE = 5;`                                 |
| 51   | 0.002          | `assault: 0.002,`                                                             |
| 52   | 0.002          | `robbery: 0.002,`                                                             |
| 53   | 0.001          | `burglary: 0.001,`                                                            |
| 54   | 0.001          | `vandalism: 0.001,`                                                           |
| 61   | 0.02           | `export const BLANKET_UNEMPLOYMENT_GAP_PRESSURE = 0.02;`                      |
| 97   | 0              | `return terms ? terms.rateNumerator / terms.rateDenominator : 0;`             |
| 113  | 0              | `if (change === 0) continue;`                                                 |
| 116  | 0              | `kind: change > 0 ? "leave" : "arrive",`                                      |
| 124  | 86_400_000, 1  | `(Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000 + 1;`         |
| 126  | 12, 365.25     | `(UNRESEARCHED_TOWN_POLICE_LOG.reportedPerMonth * periodDays * 12) / 365.25,` |
| 180  | 0              | `if (gap === 0) continue;`                                                    |
| 183  | 0              | `kind: gap > 0 ? "leave" : "arrive",`                                         |

### `src/simulation/pressure/contract.ts`

No AST numeric literals.

### `src/simulation/pressure/events.ts`

| Line | Literal values | Source context                                                                 |
| ---- | -------------- | ------------------------------------------------------------------------------ |
| 32   | 0              | `if (!world.pressure \|\| world.pressure.quartersStepped === 0) return world;` |

### `src/simulation/pressure/flows.ts`

| Line | Literal values | Source context                                                           |
| ---- | -------------- | ------------------------------------------------------------------------ |
| 15   | 2              | `export const BLANKET_BASE_OUTFLOW_PCT_PER_YEAR = 2;`                    |
| 18   | 0.1            | `export const BLANKET_MIN_PULL = 0.1;`                                   |
| 21   | 5              | `export const FLOW_DESTINATIONS_KEPT = 5;`                               |
| 33   | 1, 0, 1        | `for (let index = store.readings.length - 1; index >= 0; index -= 1) {`  |
| 43   | 1              | `if (!reading) return 1;`                                                |
| 46   | 1              | `1 + reading.levels.arrive - reading.levels.leave,`                      |
| 52   | 1, 0           | `return 1 + (reading?.levels.leave ?? 0);`                               |
| 84   | 1000, 1000     | `const round = (value: number) => Math.round(value * 1000) / 1000;`      |
| 89   | 0              | `0,`                                                                     |
| 94   | 0, 100, 0      | `sharePct: total > 0 ? (pullOf(readings.get(other)) / total) * 100 : 0,` |
| 100  | 0              | `.slice(0, FLOW_DESTINATIONS_KEPT)`                                      |

### `src/simulation/pressure/index.ts`

No AST numeric literals.

### `src/simulation/pressure/integrity.ts`

| Line | Literal values | Source context                                                              |
| ---- | -------------- | --------------------------------------------------------------------------- |
| 12   | 0              | `store.quartersStepped < 0 \|\|`                                            |
| 13   | 0              | `(store.quartersStepped === 0) !== (store.lastPeriodEnd === null) \|\|`     |
| 18   | 0              | `let ordinal = 0;`                                                          |
| 35   | 0              | `if (!Number.isFinite(level) \|\| level < 0)`                               |
| 46   | 0              | `if (!Number.isFinite(flow.outflowSharePct) \|\| flow.outflowSharePct < 0)` |

### `src/simulation/pressure/ladder.ts`

| Line | Literal values | Source context                                                                                                                                                                                              |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 76   | 0.3            | `angerLine: 0.3,`                                                                                                                                                                                           |
| 78   | 1              | `lastingAfterQuarters: 1,`                                                                                                                                                                                  |
| 83   | 2              | `attemptLine: 2,`                                                                                                                                                                                           |
| 85   | 4              | `threatOpenQuarters: 4,`                                                                                                                                                                                    |
| 104  | 10_000         | `const ANGER_DENOMINATOR = 10_000;`                                                                                                                                                                         |
| 144  | 0.0001         | `threshold: angerValue(BLANKET_POLITICAL_VIOLENCE.angerLine + 0.0001),`                                                                                                                                     |
| 162  | 1, 1           | `baseLikelihood: { numerator: 1, denominator: 1, unit: "rate:share" },`                                                                                                                                     |
| 190  | 1, 1           | `baseLikelihood: { numerator: 1, denominator: 1, unit: "rate:share" },`                                                                                                                                     |
| 238  | 0              | `if (missing.length > 0) {`                                                                                                                                                                                 |
| 310  | 0              | `0,`                                                                                                                                                                                                        |
| 313  | 0              | `0,`                                                                                                                                                                                                        |
| 321  | 0              | `let count = 0;`                                                                                                                                                                                            |
| 323  | 1              | `if (periodEnd > onsetAt) count += 1;`                                                                                                                                                                      |
| 344  | 0              | `if (!installed && over.length === 0) return world;`                                                                                                                                                        |
| 401  | 2, 2           | `basis: \`Lasting unrest in ${name} and an earlier threat against the target: anger over its line added up to ${strain.toFixed(2)} since the threat, past this threat's own line of ${line.toFixed(2)}.\`,` |
| 409  | 4, 4           | `context: \`Strain ${strain.toFixed(4)} reached the threat's line ${line.toFixed(4)}.\`,`                                                                                                                   |
| 443  | 0, 4           | `context: \`Anger read ${(reading?.levels.anger ?? 0).toFixed(4)}, at or under the line of ${policy.angerLine}.\`,`                                                                                         |
| 459  | 4              | `context: \`Anger read ${reading.levels.anger.toFixed(4)}, still over the line of ${policy.angerLine}.\`,`                                                                                                  |
| 490  | 1, 1           | `exposure: { numerator: 1, denominator: 1, unit: "rate:share" },`                                                                                                                                           |
| 491  | 1, 1           | `vulnerability: { numerator: 1, denominator: 1, unit: "rate:share" },`                                                                                                                                      |
| 492  | 0, 1           | `resilience: { numerator: 0, denominator: 1, unit: "rate:share" },`                                                                                                                                         |
| 509  | 1, 1           | `exposure: { numerator: 1, denominator: 1, unit: "rate:share" },`                                                                                                                                           |
| 510  | 1, 1           | `vulnerability: { numerator: 1, denominator: 1, unit: "rate:share" },`                                                                                                                                      |
| 511  | 0, 1           | `resilience: { numerator: 0, denominator: 1, unit: "rate:share" },`                                                                                                                                         |
| 517  | 0              | `const targetId = prominentPeopleIn(next, reading.stateKey)[0];`                                                                                                                                            |
| 542  | 3              | `const usps = stateKey.slice(3);`                                                                                                                                                                           |

### `src/simulation/pressure/step.ts`

| Line | Literal values | Source context                                                                   |
| ---- | -------------- | -------------------------------------------------------------------------------- |
| 30   | 0.25           | `export const BLANKET_FADE_PER_QUARTER = 0.25;`                                  |
| 33   | 91             | `export const FIRST_PERIOD_DAYS = 91;`                                           |
| 36   | 4              | `export const QUARTERS_PER_FLOW_YEAR = 4;`                                       |
| 63   | 0              | `quartersStepped: 0,`                                                            |
| 77   | 1              | `const ordinal = store.quartersStepped + 1;`                                     |
| 106  | 0, 1           | `(before?.[kind] ?? 0) * (1 - BLANKET_FADE_PER_QUARTER) +`                       |
| 109  | 0              | `.reduce((sum, entry) => sum + entry.amount, 0),`                                |
| 114  | 0              | `contributions.length === 0 &&`                                                  |
| 115  | 0              | `PRESSURE_KINDS.every((kind) => levels[kind] === 0)`                             |
| 131  | 0              | `const closesYear = ordinal % QUARTERS_PER_FLOW_YEAR === 0;`                     |
| 133  | 0, 1           | `closesYear && current.size > 0 && states.length > 1`                            |
| 137  | 0, 4           | `Number(periodEnd.slice(0, 4)),`                                                 |
| 152  | 0              | `const reported = flows.length > 0 ? largestPushedFlow(readings, flows) : null;` |
| 158  | 10000, 10000   | `return Math.round(value * 10000) / 10000;`                                      |
| 171  | 0              | `.filter((reading) => reading.levels.leave > 0)`                                 |
| 175  | 0              | `)[0];`                                                                          |

### `src/simulation/life-opportunities.ts`

| Line | Literal values   | Source context                                                                |
| ---- | ---------------- | ----------------------------------------------------------------------------- |
| 136  | 4                | `export const OPEN_LIFE_OPPORTUNITY_LIMIT = 4;`                               |
| 234  | 0                | `if (written.length === 0) return [];`                                        |
| 348  | 1                | `const notice = next.history.events.at(-1);`                                  |
| 357  | 18, 30, 1        | `start: momentAt(world, 18, 30, addDays(world.currentDate, 1)),`              |
| 358  | 19, 45, 1        | `end: momentAt(world, 19, 45, addDays(world.currentDate, 1)),`                |
| 370  | 1                | `const meeting = next.history.scheduledActivities.at(-1);`                    |
| 380  | 18, 10, 1        | `start: momentAt(world, 18, 10, addDays(world.currentDate, 1)),`              |
| 381  | 18, 30, 1        | `end: momentAt(world, 18, 30, addDays(world.currentDate, 1)),`                |
| 401  | 75               | `effort: { kind: "authored-duration", requiredMinutes: 75 },`                 |
| 505  | 0                | `open.length > 0 &&`                                                          |
| 511  | 0, 1             | `const budget = open.length === 0 ? OPEN_LIFE_OPPORTUNITY_LIMIT : 1;`         |
| 514  | 0, 1             | `for (let attempt = 0; attempt < budget; attempt += 1) {`                     |
| 522  | 0                | `if (candidates.length === 0) return next;`                                   |
| 626  | 15               | `startHour: 15,`                                                              |
| 627  | 18               | `endHour: 18,`                                                                |
| 657  | 21               | `age >= 21 &&`                                                                |
| 658  | 0                | `activeOrganizationParticipationsAt(world, personId, cutoff).length > 0`      |
| 722  | 0                | `while (remaining.length > 0) {`                                              |
| 725  | 1                | `remaining.splice(remaining.indexOf(hostId), 1);`                             |
| 760  | 1                | `seen: lastOffered.get(candidate.kind) ?? -1,`                                |
| 768  | 0                | `return scored[0]!.candidate;`                                                |
| 772  | 0                | `let total = 0;`                                                              |
| 774  | 31, 0, 1_000_003 | `total = (total * 31 + character.charCodeAt(0)) % 1_000_003;`                 |
| 866  | 1                | `const asking = next.history.events.at(-1);`                                  |
| 967  | 1                | `const notice = next.history.events.at(-1);`                                  |
| 1086 | 18               | `ageOnDate(world.people[candidate]!.birthDate, world.currentDate) >= 18 &&`   |
| 1089 | 0                | `if (connected.length > 0) return connected;`                                 |
| 1094 | 18               | `ageOnDate(world.people[candidate]!.birthDate, world.currentDate) >= 18,`     |
| 1110 | 0                | `if (employerIds.size === 0) return [];`                                      |
| 1130 | 0                | `if (organizationIds.size === 0) return [];`                                  |
| 1174 | 1                | `const at = lastAsked.get(candidate) ?? -1;`                                  |
| 1189 | 0, 0             | `if (month < 0 \|\| (month === 0 && at.getUTCDate() < birth.getUTCDate())) {` |
| 1190 | 1                | `age -= 1;`                                                                   |
| 1203 | 60               | `minuteOfDay: hour * 60 + minute,`                                            |
| 1212 | 60               | `minuteOfDay: hour * 60,`                                                     |

### `src/simulation/ordinary-meeting-presence.ts`

| Line | Literal values | Source context                                                               |
| ---- | -------------- | ---------------------------------------------------------------------------- |
| 128  | 1              | `const comment = next.history.events.at(-1)!;`                               |
| 180  | 0              | `compareSimulationMoments(state.end, completed.currentMoment) !== 0 \|\|`    |
| 181  | 0              | `compareSimulationMoments(state.recordedAt, completed.currentMoment) !== 0`  |
| 214  | 1              | `.at(-1);`                                                                   |
| 294  | 0              | `compareSimulationMoments(world.currentMoment, state.start) < 0 \|\|`        |
| 295  | 0              | `compareSimulationMoments(world.currentMoment, state.end) >= 0`              |
| 308  | 1              | `.at(-1);`                                                                   |
| 332  | 0              | `) === 0,`                                                                   |
| 344  | 0              | `compareSimulationMoments(world.currentMoment, state.start) <= 0`            |
| 348  | 0              | `compareSimulationMoments(world.currentMoment, state.start) !== 0`           |
| 389  | 18             | `ageOnDate(completed.people[id]!.birthDate, completed.currentDate) >= 18 &&` |
| 436  | 0              | `if (!chairId) chairId = goers[0];`                                          |
| 555  | 1              | `const event = next.history.events.at(-1)!;`                                 |

### `src/simulation/life-circumstances.ts`

| Line | Literal values   | Source context                                                             |
| ---- | ---------------- | -------------------------------------------------------------------------- |
| 137  | 2                | `export const OPEN_LIFE_CIRCUMSTANCE_LIMIT = 2;`                           |
| 143  | 18, 26           | `"colleague-coverage-request": [18, 26],`                                  |
| 144  | 18, 99           | `"shared-assignment": [18, 99],`                                           |
| 145  | 17, 26           | `"supervisor-extra-shift": [17, 26],`                                      |
| 146  | 17, 26           | `"commute-schedule-conflict": [17, 26],`                                   |
| 147  | 18, 26           | `"class-work-schedule-conflict": [18, 26],`                                |
| 148  | 18, 30           | `"own-shift-coverage-needed": [18, 30],`                                   |
| 149  | 5, 8             | `"household-move-preparation": [5, 8],`                                    |
| 150  | 17, 20           | `"education-work-crossroad": [17, 20],`                                    |
| 184  | 0                | `cutoff.historySequenceExclusive < 0 \|\|`                                 |
| 234  | 0                | `if (written.length === 0) return [];`                                     |
| 308  | 0                | `return activeEducationEnrollmentsAt(world, personId, cutoff).length > 0;` |
| 439  | 1                | `seen: lastSeen.get(kind) ?? -1,`                                          |
| 451  | 0                | `let total = 0;`                                                           |
| 453  | 31, 0, 1_000_003 | `total = (total * 31 + character.charCodeAt(0)) % 1_000_003;`              |
| 498  | 0                | `if (work.length === 0) return world;`                                     |
| 518  | 16               | `startHour: 16,`                                                           |
| 519  | 22               | `endHour: 22,`                                                             |
| 526  | 0                | `if (school.length === 0) return world;`                                   |
| 546  | 180              | `requiredMinutes: 180,`                                                    |
| 562  | 0                | `if (school.length === 0) return world;`                                   |
| 563  | 0                | `const supervisor = recordedSupervisorsAt(world, personId, cutoff)[0];`    |
| 581  | 16               | `startHour: 16,`                                                           |
| 582  | 22               | `endHour: 22,`                                                             |
| 594  | 0                | `const supervisor = recordedSupervisorsAt(world, personId, cutoff)[0];`    |
| 603  | 60               | `Math.ceil(candidate.state.end.minuteOfDay / 60) >`                        |
| 604  | 60               | `Math.floor(candidate.state.start.minuteOfDay / 60),`                      |
| 624  | 60               | `startHour: Math.floor(session.state.start.minuteOfDay / 60),`             |
| 625  | 60               | `endHour: Math.ceil(session.state.end.minuteOfDay / 60),`                  |
| 632  | 0                | `if (work.length === 0) return world;`                                     |
| 657  | 16               | `startHour: 16,`                                                           |
| 658  | 22               | `endHour: 22,`                                                             |
| 677  | 0, 0             | `if (studyPaths.length === 0 \|\| workPaths.length === 0) return world;`   |
| 829  | 1                | `const event = next.history.events.at(-1);`                                |
| 892  | 0                | `if (employerIds.size === 0) return null;`                                 |
| 897  | 18               | `ageOnDate(world.people[candidate]!.birthDate, cutoff.asOfDate) < 18 \|\|` |
| 922  | 18               | `ageOnDate(person.birthDate, cutoff.asOfDate) >= 18 &&`                    |
| 1023 | 0                | `if (enrollmentIds.size === 0) return [];`                                 |
| 1037 | 0                | `compareSimulationMoments(state.start, world.currentMoment) > 0,`          |
| 1050 | 120              | `export const COVERED_SHIFT_RETURN_DAYS = 120;`                            |
| 1170 | 0                | `if (activeWorkRelationshipsAt(world, personId, cutoff).length === 0)`     |
| 1188 | 60               | `minuteOfDay: hour * 60,`                                                  |
| 1196 | 0                | `) > 0`                                                                    |
| 1198 | 1                | `: addDays(world.currentDate, 1);`                                         |
| 1299 | 0                | `if (organizationIds.size === 0) return null;`                             |
| 1304 | 18               | `ageOnDate(world.people[candidate]!.birthDate, cutoff.asOfDate) < 18 \|\|` |

### `src/player/TitleScreen.tsx`

| Line | Literal values | Source context                                                                 |
| ---- | -------------- | ------------------------------------------------------------------------------ |
| 122  | 0              | `const [step, setStep] = useState(0);`                                         |
| 126  | 1              | `() => setStep((current) => current + 1),`                                     |
| 215  | 0              | `const lead = cycle[0]?.picture;`                                              |
| 221  | 1              | `const step = useAmbientStep(cycle.length > 1 && !still);`                     |
| 232  | 0              | `index === 0 &&`                                                               |
| 244  | 0              | `if (index === 0 && empty && leadHero && !still) {`                            |
| 260  | 1              | `(frame.index - 1 + cycle.length) % cycle.length,`                             |
| 267  | 0              | `frame?.leaving && frame.index >= 0`                                           |
| 268  | 1, 1           | `? \`${(frame.index - 1 + cycle.length) % cycle.length}:${step - 1}\``         |
| 353  | 0              | `hero: titleHeroFromSaveSummary(saves[0]),`                                    |
| 378  | 0              | `return resolveTitleLecternHero(saves[0], library) ?? engineTitleHero(saves);` |
| 392  | 0              | `const hero = titleEngineHero(presentation, saves[0]);`                        |
| 456  | 0              | `const recent = saves[0];`                                                     |
| 457  | 0              | `const setAside = damaged?.length ?? 0;`                                       |
| 505  | 0              | `) : setAside > 0 ? (`                                                         |
| 509  | 1              | `{setAside === 1`                                                              |
| 525  | 0              | `: outdated && saves.length === 0`                                             |
| 527  | 0              | `: unread && saves.length === 0`                                               |
| 529  | 0              | `: saves.length > 0`                                                           |
| 530  | 0              | `? setAside > 0`                                                               |
| 533  | 0              | `: setAside > 0`                                                               |
| 534  | 1              | `? setAside === 1`                                                             |

### `src/player/World39News.tsx`

| Line | Literal values | Source context                                            |
| ---- | -------------- | --------------------------------------------------------- |
| 26   | 0, 6           | `? lawEffectsHere(world, homeJurisdictionId).slice(0, 6)` |
| 40   | 0              | `{model.standing.length > 0 ? (`                          |
| 57   | 0              | `{model.laws.length > 0 ? (`                              |
| 81   | 0              | `{lawEffects.length > 0 ? (`                              |
| 101  | 0              | `{model.publicEvents.length === 0 ? (`                    |
| 123  | 0              | `{model.publications.items.length > 0 ? (`                |
| 126  | 0, 4           | `{model.publications.items.slice(0, 4).map((item) => (`   |

### `src/player/CampaignWorkspace.tsx`

| Line | Literal values | Source context                                                            |
| ---- | -------------- | ------------------------------------------------------------------------- |
| 97   | 1              | `const month = MONTHS[Number(m) - 1];`                                    |
| 246  | 0              | `: (strategy?.geographyChoices[0]?.key ?? null);`                         |
| 254  | 0              | `: (advertising?.spendingChoices[0]?.key ?? null);`                       |
| 270  | 0              | `: (priority?.spendingChoices[0]?.key ?? null);`                          |
| 293  | 0              | `if (view.phase === "unavailable" && offices.length === 0) {`             |
| 321  | 0              | `(offices.length === 0 \|\| selectedOfficeKey !== null)`                  |
| 342  | 0              | `detailedEditingAvailable: Boolean(strategy) && view.offers.length > 0,`  |
| 343  | 0              | `immediateActionsAvailable: view.offers.length > 0,`                      |
| 416  | 0              | `: status.reasons.length > 0`                                             |
| 433  | 0              | `{detail.length > 0 ? (`                                                  |
| 467  | 0              | `{unavailable.reasons.length > 0`                                         |
| 490  | 0              | `{municipalSeats.length > 0 ? (`                                          |
| 523  | 0              | `(municipalSeats.length > 0 && !chosenMunicipalSeat?.eligible) \|\|`      |
| 550  | 0              | `{DIAGNOSTICS && authorityDetail.length > 0 ? (`                          |
| 568  | 1              | `? \` · ${view.daysLeft} ${view.daysLeft === 1 ? "day" : "days"} to go\`` |
| 716  | 0              | `{advertising && advertising.spendingChoices.length > 0 ? (`              |
| 795  | 0              | `{view.tallies.length > 0 ? (`                                            |
| 888  | 0              | `{view.sessions.length > 0 ? (`                                           |
| 893  | 1              | `{group.count === 1`                                                      |
| 897  | 0              | `{group.blockedBy.length > 0 ? (`                                         |

### `src/player/SetupScreen.tsx`

| Line | Literal values | Source context                                                          |
| ---- | -------------- | ----------------------------------------------------------------------- |
| 157  | 0              | `if (needle.length === 0) return identities;`                           |
| 169  | 0              | `0,`                                                                    |
| 178  | 0              | `const [nameDraws, setNameDraws] = useState(0);`                        |
| 224  | 0              | `const currentIndex = Math.max(steps.indexOf(current), 0);`             |
| 228  | 1              | `return at !== -1 && at < currentIndex;`                                |
| 486  | 1              | `const salt = nameDraws + 1;`                                           |
| 576  | 0              | `{matchingStates.length > 0 ? (`                                        |
| 648  | 0              | `{placeListOpen && matchingPlaces.length > 0 ? (`                       |
| 653  | 0              | `tabIndex={0}`                                                          |
| 694  | 0              | `{placeListOpen && placePage && placePage.total > 0 ? (`                |
| 704  | 0              | `) : placeListOpen && placeQuery.trim().length === 0 ? (`               |
| 807  | 18             | `{setup.startAge < 18`                                                  |
| 879  | 25             | `disabled={setup.startAge < 25}`                                        |
| 940  | 18             | `{setup.startAge < 18`                                                  |
| 957  | 18             | `{setup.startAge < 18`                                                  |
| 1030 | 0              | `{problems.length > 0 && onReady ? (`                                   |
| 1032 | 0              | `{problems[0]!.message}`                                                |
| 1046 | 1              | `const previous = steps[currentIndex - 1];`                             |
| 1051 | 0              | `{currentIndex === 0 ? "Return to title" : "Back"}`                     |
| 1061 | 0              | `disabled={characterMissing.length > 0 \|\| (ageChosen && !ageUsable)}` |
| 1097 | 0              | `disabled={problems.length > 0}`                                        |
| 1106 | 0              | `problems.length === 0 &&`                                              |

### `src/presentation/day-opening-english.ts`

| Line | Literal values | Source context                                                       |
| ---- | -------------- | -------------------------------------------------------------------- |
| 35   | 1              | `key: \`${prefix}-${index + 1}\`,`                                   |
| 145  | 0              | `if (facts.waitingIds.length > 0)`                                   |
| 148  | 1              | `facts.waitingIds.length === 1 ? "thing" : "things"`                 |
| 152  | 0              | `if (facts.housemateName && facts.housemateSourceIds.length > 0)`    |
| 180  | 0              | `(total, character) => total + character.charCodeAt(0),`             |
| 181  | 0              | `0,`                                                                 |
| 188  | 3              | `offset * 3,`                                                        |
| 190  | 7              | `...(factRows.housemate ? [turn(HOUSEMATE, day, offset * 7)] : []),` |

### `src/simulation/person-context.ts`

| Line | Literal values | Source context                                               |
| ---- | -------------- | ------------------------------------------------------------ |
| 520  | 1              | `-1,`                                                        |
| 610  | 18             | `const grown = ageOnDate(viewer.birthDate, asOfDate) >= 18;` |
| 663  | 0              | `if (mine.length === 0) {`                                   |
| 675  | 1              | `) > 1`                                                      |
| 715  | 1              | `) <= 1`                                                     |
| 717  | 0              | `const enrollment = mine[0]!.enrollment;`                    |

### `src/simulation/macro-economy/sources.ts`

| Line | Literal values | Source context                                                            |
| ---- | -------------- | ------------------------------------------------------------------------- |
| 53   | 0.25           | `minor: 0.25,`                                                            |
| 54   | 0.5            | `notable: 0.5,`                                                           |
| 55   | 1              | `major: 1,`                                                               |
| 97   | 0.5            | `IMPORTANCE_INTENSITY[tagValue(event, "importance:") ?? ""] ?? 0.5,`      |
| 131  | 1              | `return crisisEnvelopesBetween(world, CRISIS_FROM, addDays(through, 1));` |
| 160  | 0              | `const episodeId = envelope.subjectIds[0];`                               |
| 199  | 0              | `const episodeId = envelope.subjectIds[0];`                               |
| 296  | 1              | `1,`                                                                      |
| 299  | 1e-6           | `if (intensity < 1e-6) return [];`                                        |
| 326  | 5              | `export const TOWN_CLOSING_FULL_INTENSITY_JOBS_PER_HUNDRED = 5;`          |
| 349  | 0, 0, 0        | `const jobShare = jobs > 0 && townJobs > 0 ? jobs / townJobs : 0;`        |
| 351  | 0              | `if (jobShare > 0)`                                                       |
| 355  | 1              | `1,`                                                                      |
| 356  | 100            | `(jobShare * 100) / TOWN_CLOSING_FULL_INTENSITY_JOBS_PER_HUNDRED,`        |
| 360  | 1              | `intensities.set("credit-tightening", 1);`                                |

### `src/presentation/player-places.ts`

| Line | Literal values | Source context                                                        |
| ---- | -------------- | --------------------------------------------------------------------- |
| 269  | 1              | `primary.length === 1`                                                |
| 270  | 0              | `? primary[0]`                                                        |
| 271  | 1              | `: memberships.length === 1`                                          |
| 272  | 0              | `? memberships[0]`                                                    |
| 284  | 18             | `if (age >= 18) return null;`                                         |
| 309  | 60             | `const hour24 = Math.floor(minuteOfDay / 60);`                        |
| 310  | 60             | `const minute = minuteOfDay % 60;`                                    |
| 311  | 12             | `const suffix = hour24 >= 12 ? "PM" : "AM";`                          |
| 312  | 12, 12         | `const hour = hour24 % 12 \|\| 12;`                                   |
| 313  | 2              | `return \`${hour}:${minute.toString().padStart(2, "0")} ${suffix}\`;` |

### `src/player/opening-life/LifeScenePanel.tsx`

| Line | Literal values | Source context |
| ---- | -------------- | -------------- |
| 94   | 1              | `.at(-1);`     |

### `src/player/WorldOrientationPanel.tsx`

| Line | Literal values | Source context                                                                                                                     |
| ---- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 128  | 0              | `const known = view.steps[0]?.people.find(`                                                                                        |
| 182  | 0, 0           | `(legislature.chambers.length > 0 \|\| legislature.yours.length > 0)`                                                              |
| 188  | 0              | `legislature.chambers.length > 0`                                                                                                  |
| 198  | 0              | `stateIndex >= 0`                                                                                                                  |
| 200  | 0, 1           | `...national.slice(0, stateIndex + 1),`                                                                                            |
| 202  | 1              | `...national.slice(stateIndex + 1),`                                                                                               |
| 206  | 0              | `...(year && year.lines.length > 0`                                                                                                |
| 220  | 0              | `...(family && family.parents.length > 0`                                                                                          |
| 226  | 1              | `family.parents.length === 1`                                                                                                      |
| 247  | 0              | `fact.startsWith(parent.introduction.split(",")[0]!),`                                                                             |
| 265  | 0              | `const [index, setIndex] = useState(0);`                                                                                           |
| 273  | 1              | `const step = steps[Math.min(index, steps.length - 1)]!;`                                                                          |
| 275  | 1              | `const last = index >= steps.length - 1;`                                                                                          |
| 296  | 0              | `0,`                                                                                                                               |
| 311  | 1              | `const nextStep = steps[index + 1];`                                                                                               |
| 345  | 0              | `const officeStaged = officePlace !== null && officePeople.length > 0;`                                                            |
| 347  | 0              | `backdrop.kind === "neutral" && cast.length === 0 && !executiveWithoutPlate`                                                       |
| 405  | 100            | `"--pg-figure-x": \`${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.x) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.width}%\`,`         |
| 406  | 100            | `"--pg-figure-y": \`${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.y) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.height}%\`,`        |
| 407  | 100            | `"--pg-figure-width": \`${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.width) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.width}%\`,` |
| 430  | 0              | `position === 0`                                                                                                                   |
| 454  | 0              | `{cast.length > 0 && world ? (`                                                                                                    |
| 499  | 1              | `{index + 1} of {steps.length} · {view.dateLabel}`                                                                                 |
| 504  | 1              | `tabIndex={-1}`                                                                                                                    |
| 515  | 0              | `{step.key === "executive" && step.people.length > 0 ? (`                                                                          |
| 540  | 0              | `{step.people.length > 0 ? (`                                                                                                      |
| 565  | 1              | `regionalPlates.length > 1 ? (`                                                                                                    |
| 576  | 1              | `(regionIndex + regionalPlates.length - 1) %`                                                                                      |
| 585  | 1              | `View {regionIndex + 1} of {regionalPlates.length}`                                                                                |
| 593  | 1              | `(regionIndex + 1) % regionalPlates.length`                                                                                        |
| 605  | 0              | `{step.lines && step.lines.length > 0 ? (`                                                                                         |
| 616  | 0              | `{step.headlines && step.headlines.length > 0 ? (`                                                                                 |
| 630  | 0              | `{step.family && step.family.length > 0 ? (`                                                                                       |
| 661  | 0              | `{step.people.length > 0 &&`                                                                                                       |
| 715  | 0              | `disabled={index === 0}`                                                                                                           |
| 716  | 0, 1           | `onClick={() => setIndex((current) => Math.max(0, current - 1))}`                                                                  |
| 727  | 1, 1           | `: setIndex((current) => Math.min(steps.length - 1, current + 1))`                                                                 |
| 980  | 0              | `{!compact && person.facts.length > 0 ? (`                                                                                         |
| 1000 | 0              | `if (!seen.has(usps)) seen.set(usps, row.seatLabel.split(",")[0]!);`                                                               |
| 1002 | 1, 1           | `return [...seen].sort((left, right) => left[1].localeCompare(right[1]));`                                                         |
| 1007 | 0, 0           | `: (stateOptions[0]?.[0] ?? ""),`                                                                                                  |
| 1010 | 0              | `const counted = chamber.parties.filter((entry) => entry.members > 0);`                                                            |
| 1031 | 0              | `{chamber.vacancies + chamber.unrecorded > 0 ? (`                                                                                  |
| 1048 | 0              | `{chamber.vacancies > 0 ? (`                                                                                                       |
| 1053 | 0              | `{chamber.unrecorded > 0 ? (`                                                                                                      |
| 1076 | 1              | `{\`All ${stateOptions.find(([usps]) => usps === state)?.[1] ?? "the"} members, in seat order.\`}`                                 |
| 1102 | 1, 0           | `return seatKey.split(":")[1]?.split("-")[0] ?? "";`                                                                               |

Missing inherited path names (not silently scanned under guessed names): .
