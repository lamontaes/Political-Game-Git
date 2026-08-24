# Stage 6 Run A Due-Frontier Correction

## Status

Completed — narrow architecture correction over the accepted Run A corrective
audit.

## Scope

Due-today is valid pending work; authoritative time must settle it before moving
later. Normal full-integrity canonical writers remain composable inside a
handler, including a later follow-on schedule. No Run B or new future system is
in scope.

## Completed record

- [x] Verified `0622dea0d00519da084ce60b1935fa29110891b1` on `main`, D-042,
      the prior corrective implementation, and the preserved untracked delivery
      ZIP.
- [x] Changed only the frontier boundary: a scheduled item strictly before the
      current date is invalid; one due today is recoverable pending work and is
      selected by the next positive `advanceWorld` action.
- [x] Restored full integrity validation for every handler result and terminal
      transition; no mutable flag, serialized marker, raw writer path, or
      scheduler duplicate exists.
- [x] Permitted a handler to append a canonical later scheduled item while
      preventing it from rewriting existing due identity/state history or
      appending a terminal state directly.
- [x] Added focused public-writer coverage for metric truth, later follow-on
      scheduling, one ordinary outcome, deterministic lifecycle, JSON round
      trip, loaded due-today recovery, strict-overdue rejection, and atomic
      missing/failing/direct-lifecycle-write cases.
- [x] Preserved all prior status, correction/revision chronology, late-backfill,
      competing-source, cancellation/blocked, same-date ordering, maximum-current
      integration, and JSON/SQLite regressions.
- [x] Updated D-042 in place and aligned architecture, system, acceptance,
      integrity-audit, and completed-plan records to the pending-through-date
      rule.
- [x] Passed formatting, lint, TypeScript, focused/persistence/integration,
      full 17-file/173-test suite, build, deterministic demo, boundary,
      diff-check, and high-severity security audit gates.
- [x] Prepared one local corrective commit with the delivery ZIP excluded and
      stopped before Stage 6 Run B.
