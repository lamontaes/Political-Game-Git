# P1 session-end contract and bounded coverage

Source code inspected at PR code head `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7`; the Apr. 30 all-due run was made at `3186f2d0c2add2182290b1b73686a7b65d453520`. The run consumed 2,353 due rows in chronological order through Apr. 30, 2026, with no due rows left unresolved inside the bound. It recorded `sessionAdjournments: []`.

## Existing writer and exact empty-result cause

The actual leader-choice writer is `recordSessionAdjournment` in `src/simulation/governing/session-adjournments.ts`. Its production call is from `considerSessionAdjournment` in `src/simulation/governing/leaders-adjourn.ts`, after an individual bill step from `src/simulation/governing/legislative-clock.ts`.

That path will only write a record when all applicable conditions hold: a same-year appropriation measure has passed both chambers or become law; seated majority leaders exist; no unresolved bill carried by those leaders is pending; and the date is not beyond the legal session limit. If any of those conditions fail, the leader-choice writer does not record adjournment. `leaders-adjourn.ts` explicitly documents the game does not file general appropriations acts; state budgets are recorded through `public-budgets`. The observed all-due run therefore had no eligible appropriations to trigger the leader decision. We must not add one or weaken the gate to manufacture a session-end record.

There is no existing session-end/completion future transition or calendar end handler in the current registration graph. Existing intake/sitting due rows (`GOVERNING_SEASON`, `congress:intake`, `congress:sitting`, D.C. Council sitting) schedule filings or chamber meetings, not session completion. `applyInstitutionSessionEnd` is the nearest existing dated path: it runs while an individual measure advances, reads `sessionStatus`/`sessionClosesOn`, and resolves that measure's session-dependent step. It does not call `recordSessionAdjournment` or persist an actual session-end record. There is no approved calendar-end event to reuse for world-level completion based on source evidence.

## Existing source-backed date coverage

The available state table is `data/research/laws/starting-law-2026.json` under `effectiveDates.sessionEnds`; regular/biennial years come from `data/research/laws/regular-session-years.json`. The calendar artifact advanced through Apr. 30, so the world date crossed 12 published state adjournment dates and the two estimated Apr. 15 dates for Michigan and North Carolina. This is date coverage only; no corresponding `SessionAdjournmentRecord` was present.

| Source classification | Count / dates | Apr. 30 relation |
| --- | --- | --- |
| Published 2026 adjournment | 15 states | 12 by cutoff; AZ June 13, HI May 8, OK May 14 later |
| Estimated date (no read session limit) | MI and NC, April 15 | Both by cutoff; estimates, not source-published ends |
| State constitutional/statutory limit | MO, May 30 | After cutoff |
| Regular session but no finite date in current source table | 28 states | Own end remains unknown in current data |
| No regular session in 2026 | MT, NV, ND, TX | Next regular session year is 2027 |
| D.C. Council | Year-round | No annual end date in this table |
| Federal Congress | No state-style session-end row | No calendar end contract in this table |
| PR/GU/VI/AS/MP | Incomplete territorial pack/roster/end-date contracts | No end coverage to measure |

The complete 50-state calculation, including each row's basis and dates, is in `p1-session-end-coverage.json`. The date helper returns a legal/table date for bill handling; it does not make that date a recorded leader adjournment or a distinct saved completion event.

## Minimal owner decision requested

I asked CTO on current board #2424 (receipt [6015246405](https://github.com/lamontaes/Political-Game-Git/issues/2424#issuecomment-6015246405)) to identify an already-approved calendar-end event/handler that records source-backed legal-limit completion without the appropriation prerequisite, or name the owner/contract for a minimal separate completion writer/schema. The question also asks whether legal-limit completion must be represented separately from leaders' discretionary adjournment.

Until that answer, the existing leader gate and authority semantics are unchanged. No appropriation, end event, or completion record was invented. The candidate remains draft and the nationwide full-session acceptance remains open.
