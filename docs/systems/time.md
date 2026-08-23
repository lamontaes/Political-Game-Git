# Time

Simulated time and limited attention organize play.

## Rules

- The world owns a monotonic simulated date independent of wall-clock time.
- State changes occur through explicit simulation actions with deterministic ordering.
- Events record when they occurred and when they were recorded; scheduled effects retain enough identity to execute reproducibly.
- Detailed periods may use weekly play, while routine or distant activity may be summarized at coarser resolution.
- Time and attention are meaningful resources. Greater responsibility should produce more competing consequential demands, not proportional clerical clicking.
- Delegation and summary are normal handling for routine work.
- Inactive people and geography may advance at lower resolution without ceasing to exist.

The first build implements UTC-safe date-only arithmetic, a deterministic positive-day advancement action, a system audit record, and one synthetic demo occurrence. Stage 4 historical reasoning uses both an as-of date and an exclusive append-sequence cutoff: date alone cannot prevent a later-appended backdated record from leaking into an earlier decision.

Temporary internal states use effective-dated half-open intervals, `[startsAt, endsAt)`. A state may contribute to a tagged decision while active, remains inspectable after expiry, and does not require a continuous mood tick. Advancing time does not by itself run population opinion formation or autonomous character development.

Calendars, schedules, attention budgets, weekly mode, rest and health effects, scheduled decisions, and multi-resolution processing remain deferred to Stage 5 or later.
