# P1 session-completion writer and bounded proof

## Scope and exact source

The implementation is currently an **uncommitted working-tree candidate** on branch `session-53-b29-p1`, based at source HEAD `1332ee015cbbaa188d3643f37483bf27a8ca4e4f` (origin/main at inspection: `f88508186b78f526ecf89a420b5fb584171e039a`). The earlier all-due empty-ledger result remains separately preserved at source head `3186f2d0c2add2182290b1b73686a7b65d453520` in `/tmp/session53-all-due-apr30-sessionends.json` and `/tmp/session53-all-due-apr30-sessionends.log`: 2,353 rows, 77 date batches, 187.857 seconds, and zero `sessionAdjournments`. That result is not overwritten by the newer artifact.

The current candidate implements the CTO-authorized minimal dated completion event from #2424 comment `6015318118`, refined by newer special-session design `6015836831`: `recordLegislativeSessionCompletion` in `src/simulation/governing/legislative-session-completion.ts` is the single event writer; its cause union is `legal-limit`, `sine-die-vote`, or `scope-disposed`. For a special session, `scope-disposed` means every called subject has been acted on; its other end causes remain `legal-limit` or `sine-die-vote`. The event carries jurisdiction, chamber keys, stable session ID, effective date, cause, and optional estimate provenance. It writes through `recordWorldEvent`, with stable key `event:legislative-session-completion/v1:<sessionId>`. Duplicate IDs do not create duplicate completion events.

Legal-limit due rows use the existing future-due-item queue. The producer is reached from state bill-season calendar scheduling in `governing-calendar.ts`, the handler is registered in `stateGoverningHandlers`, and legal date inputs come from each state's session rules. Similar-state fallback dates are explicitly tagged with their estimate basis as CTO authorized. `sessionClosesOn` now observes recorded completion events. No `legislative-clock.ts` changes were made, respecting Session 56's ownership of that caller hunk.

## Cause-specific evidence

| Cause | Actual saved events in bounded artifact | Current source path / proof |
| --- | ---: | --- |
| `legal-limit` | 33 | Executed all-due chronological calendar route below; 27 events carry explicit similar-state estimate provenance. |
| `sine-die-vote` | 0 | Writer accepts and records this cause, and its payload has no appropriation-measure prerequisite. Session 35 was sent the exact consumer contract on #2424 (receipt `6016008781`). The actual voted-motion producer is not connected yet; a contract test is not evidence of a vote. |
| `scope-disposed` (special session) | 0 | Writer accepts and records this cause. Current source trace found no canonical saved special-session call/scope ID plus dated end producer to consume; the exact missing call-record contract was asked on #2424 (receipt `6015810521`). CTO's newer call shape is `special-session-called` with caller/person/date/convene date/scope/legal limit/widening rule. No call or end was manufactured. |

The sine-die contract is to call the writer only after the Session 35 source-authorized procedural vote succeeds, with the actual jurisdiction, participating chambers, session ID, and vote date. Appropriation completion is not a gate; a pending budget remains ordinary business to be weighed and its real outcome is left in the existing chamber records. The special-session consumer must use the saved call ID/scope and legal end; when all scoped subjects have been acted on, it records `scope-disposed`. The legal-limit queue does not synthesize either non-calendar cause.

## Executed bounded artifact (progress, not acceptance)

The separate current candidate artifact is `/tmp/session53-all-due-current-completions.json`, summary `/tmp/session53-completion-summary.json`, and details `/tmp/session53-completion-details.json`. It ran from Jan. 5 through Apr. 30, 2026 with seed `session53-nationwide-2026-2027`, starting place key `2825740`, default heap, `dailyLoop=false`, and the existing composed world-time due registry. Source tree baseline was `1332ee015cbbaa188d3643f37483bf27a8ca4e4f` plus the uncommitted candidate changes described above.

It processed 2,303 due rows in 83 date batches (this is the **processed due-row count**, not a number of bills), took 207.199 seconds wall time (opening 6.756 seconds), and left 0 rows unresolved inside the bound. The observed bill actions were 86 filings, 323 committee actions, 109 committee admissions, 35 floor passages, 76 failures, and 10 enacted measures. These are nationwide aggregate measures in the bounded artifact; they are not a per-session/chamber acceptance rollup.

The artifact contains 33 actual `legislation.session-completed` events over 33 of its 57 coverage rows: 33 `legal-limit`, 0 `sine-die-vote`, and 0 `scope-disposed`; 27 legal-limit events are estimates. Event rows include both house and senate chamber keys. The 24 rows with no completion event are Arkansas, Illinois, Indiana, Iowa, Kansas, Michigan, Minnesota, Missouri, Montana, Nebraska, Nevada, North Dakota, Ohio, Oklahoma, South Dakota, Texas, Wisconsin, District of Columbia, Puerto Rico, Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands, and United States. Some states have no 2026 regular session or no due legal end within Apr. 30; D.C., territories and Congress lack a matching state regular-session writer/contract here. Full 57-row serialized coverage is in `p1-session-completion-coverage.json`.

This is bounded calendar progress only. It does not establish every jurisdiction reached its own regular-session end; it omits post-April dates, second sessions, D.C., territories, Congress, and all actual sine-die/special-session completion events. Estimated legal-limit events remain marked as estimated, not jurisdiction-specific recorded adjournments. The earlier `sessionAdjournments: []` result remains a separate, valid observation of that old legacy ledger; the new completion events are a separate event record.

## Verification and remaining contract work

Focused tests cover the state-calendar producer, the legal-limit event/closure path, and the canonical writer's `sine-die-vote` and `scope-disposed` payload tags. Those latter tests exercise only the writer contract; they do not claim an actual motion, call, or saved outcome. The focused suite passes 4/4 after the cause-test addition; no build was run.

Remaining source-backed work is to connect the actual Session 35 successful sine-die outcome to this writer and consume an actual saved special-session call/scope end. Full acceptance also requires execution through each jurisdiction's own recorded regular-session end, including D.C. Council and territories, in chronological all-due order, with per-jurisdiction/chamber action counts. No quota, dice, daily loop, heap change, annual restart, or synthetic vote/call is used.
