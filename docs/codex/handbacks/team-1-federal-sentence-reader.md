# Recorded sentence reductions now reach custody queries

A recorded federal sentence reduction can now end a person's custody. Queries
for dates before the review still show the original term. This repairs a missing
reader; the automatic federal-law review producer remains on the held law branch.
No whole-law or watched-year success is claimed.

## MERGED

Nothing merged. This is a bounded candidate based on main
`c240f91c3779034fe77d2eb3bed05671a7ed1e2b`. Only Merge may integrate with exact
CTO approval. No other team's reader, compiler or research data changed.

## 1. Why-chain

A person remained in custody because jailTermOn read sentencesOf. That function
read the original sentence and clemency, but ignored federal review events. The
held federal-law producer writes a review event with the original sentence ID
and new end date. Its effect therefore needs this reader. The chain terminates
at recorded sentencing and review facts, not a draw or a new sentence size.

The candidate reads the earliest applicable review end once per person query.
It ignores other people's reviews, invalid dates and ends before the review.
Earlier clemency continues to control. The original event and sentence-month
count remain unchanged. Historical queries use the requested date for sentences,
reviews and clemency.

## 2. Research

This piece introduces no legal duration, eligibility rule or coefficient. It
consumes the existing event contract from the held federal minimum producer at
`d6f8b2798d0fdf1acad3ca936ad0d0169640ca76`. Actual offense coverage, safety-valve
exceptions and sponsor terms still need the Team 9 research batch. No legal
authority is inferred from a fictional test event.

## 3. Revisions

The held reader consumed reductions without a historical-date filter. This
candidate also fixes that leakage. The same reader applies across jurisdictions;
no state or place is special-cased. A missing review leaves the original term.
Successive reviews cannot lengthen it. This is not a population-size model.

## 4. Numbered parts

1. Read canonical federal review events in the existing indexed sentence reader.
2. Apply the requested date to review, clemency and sentencing records.
3. Preserve original history and reject misdirected or malformed reviews.
4. Keep the automatic producer and full law proof as separate unfinished work.

## 5. Simulated, records, world pieces, checks

SIMULATED: no new actor decision or automatic review is added. RECORDS: existing
sentencing, review and clemency events. WORLD PIECES: the custody reader exists
on main; the automatic federal review producer remains held. CHECKS: custody
ends on the recorded release day and historical queries retain earlier custody.
Campaign, work and jail-absence callers share this sentence reader.

## 6. Proof run

Five changed-file tests passed in 10.14 seconds, including 151 milliseconds in
test bodies. They use a controlled synthetic world, not a watched production
year. Initial scoped strict checking found a test-helper type error; it was
repaired before the final check. Three-place audit, browser, full suite,
Save/Continue and exclusive speed comparison were not run.

Final strict checking includes both changed source and test roots: zero
diagnostics. Scoped lint, formatting, whitespace and report checks pass.
The zero-dice guard reports zero new entries. Release checking is blocked by
the existing malformed `wave1-playtest-copy.md` declaration. Its missing header
is also present unchanged at the main base. No unrelated declaration was edited.

Team 2 audit source `48739fb370b945bd5b599e25a913a765145a2856` currently rejects
non-news direct records as proof after checking law references. A custody
before/after adapter belongs to Team 2. Its zero PROVEN count does not establish
zero effects. Team 1 did not edit that runner.

## 7. Worked example

Controlled fictional fixture: seed `team1-sentence-reader`, Elias Reed,
`person_b5cf009496097312`. The opening date is January 5, 2026. A recorded
24-month sentence starts January 5, 2025. Before a review, the custody query
returns that sentence. After a review records January 5, 2026 as its new end,
custody is null that day. A January 4 query still returns custody. The original
24-month sentencing event remains unchanged. This is a reader regression
example, not an observed enactment or a claim about a real defendant.

## Next

Publish the bounded consumer for review. Continue the federal law producer and
its actual legal inputs separately, then rerun Team 2's audit with a custody
adapter. Exact ownership stays with the coordinator.
