# P1 owner review packet — narration and thread scaffolds

Companion to `docs/plans/active/p1-prose-migration.md`. Every changed
player-facing P1 line, every suppression, the new structural patterns, and a
random unchanged holdout sample. Semantic IDs are `computed-anchors.json`
anchors in `src/presentation/life-narration.ts`; the corpus IDs prefix them
with `prose:narration:<bank>:` and suffix `#text`.

Independent grounding review: the `civic-prose-grounding-reviewer` agent
returned `GROUNDING: PASS` on the full migrated template set (after one round
of findings — three single-movement lines claimed recurrence with "again" and
were re-worded to "came up").

## Elapsed openers (`elapsedPhrase`)

| ID                 | Before                               | After                 |
| ------------------ | ------------------------------------ | --------------------- |
| elapsedPhrase-0003 | A year on, and into another {season} | A year on             |
| elapsedPhrase-0004 | By the {season}                      | A couple of months on |

Unchanged: "The next day", "Within the week", "A couple of weeks on",
"A month later", "Half a year on", "The better part of two years later",
"{years} years later".

New policy: the opener is emitted only when something follows it — a nameable
thread movement or a birthday clause. A gap with neither emits **no prose**.

## Steady-state atmosphere — removed (NO PROSE)

The bridging steady-state rotation is retired. These lines no longer exist
anywhere:

- steadyState-0009 "Life went on at the same pace it had been going."
- steadyState-0010 "Most weeks were built around school."
- steadyState-0013 "The meetings kept on, about once a month, and mostly dull."
- steadyState-0015 "Work stayed work — the same shifts, the same people, the
  same drive there."
- steadyState-0016/0017 "You spent most evenings at home with {…}, and most of
  them were quiet."
- steadyState-0018 "{commitment.label} went on taking its hours out of the
  week."
- steadyState-0020 "{place.displayName} went on the way it does, and so did
  you."

The opening (first told moment) keeps standing-fact lines, rebuilt as the new
`openingFacts` bank and rendered only when the record names the subject:

- openingFacts-0011 "You live with {names}."
- openingFacts-0013 "You're enrolled at {school name}."
- openingFacts-0012 "You work at {organization name}."
- openingFacts-0010 "You belong to {organization name}."
- openingFacts-0014 "{commitment.label} is part of your week."

(The symbol rename steadyState → openingFacts is why the differential shows
these as removed + added sites rather than rewordings; it is a deliberate P1
structural change, not drift.)

## Thread movement narration (`threadMovementSentence`)

| ID         | Before                                                         | After                                                                |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0006       | Things with {X} came up more than once in that time.           | Things came up at home with {X} more than once in that time.         |
| 0005       | There was one evening with {X} that stayed with you.           | You saw {X}.                                                         |
| 0009       | (unchanged)                                                    | You and {X} were in and out of each other's business more than once. |
| 0008       | Work at {X} went through a few things.                         | Work at {X} came up more than once.                                  |
| 0002       | Something at {X} happened worth remembering.                   | **suppressed** (single work event has no nameable content)           |
| 0013       | {X} took up most of it.                                        | {X} kept coming up.                                                  |
| 0004       | The money side of it moved, and not by itself.                 | {The housing/loan/support/care payment} came up more than once.      |
| 0015 (new) | —                                                              | {The … payment} came up.                                             |
| 0001       | Looking after {X} took up more of it than you had planned for. | Looking after {X} came up again and again.                           |
| 0014 (new) | —                                                              | Looking after {X} came up.                                           |
| 0011       | {X} kept meeting, and you kept going.                          | **merged** into the civic/political arm below                        |
| 0012       | {X} took up evenings you had not expected to give it.          | {X} came back around more than once.                                 |
| 0007       | What you said you would do about {X} came back around.         | What you said you'd do about {X} came back around. (moved > 1)       |
| 0016 (new) | —                                                              | What you said you'd do about {X} came up. (moved = 1)                |
| 0003       | The aftermath of it ran on longer than the thing itself did.   | **suppressed** (incident subject is a machine key)                   |

## Open-thread recaps (`recapSentence`)

| ID   | Before                                                   | After                                                     |
| ---- | -------------------------------------------------------- | --------------------------------------------------------- |
| 0002 | Something at home with {X} is waiting on you.            | What you left open at home with {X} has come back around. |
| 0010 | You and {X} have something unfinished.                   | Things at home with {X} are not settled.                  |
| 0006 | (unchanged)                                              | Things with {X} are not settled.                          |
| 0015 | (unchanged)                                              | {X} is waiting to hear from you.                          |
| 0009 | You and {X} are still in the middle of something.        | You and {X} still have unfinished business.               |
| 0014 | {X} is still going.                                      | You're still at {X}.                                      |
| 0003 | Something at {X} needs an answer.                        | {X} is waiting on an answer from you.                     |
| 0013 | {X} has something running.                               | There is still open business at {X}.                      |
| 0004 | Something you owe has come due.                          | {The housing/loan/support/care payment} is overdue.       |
| 0005 | There is money going out that you are keeping an eye on. | {The … payment} is still going out.                       |
| 0001 | (unchanged)                                              | Looking after {X} is still yours.                         |
| 0016 | (unchanged)                                              | {X} still meets, and you are still in it.                 |
| 0012 | Your name is attached to something at {X}.               | You're still signed up with {X}.                          |
| 0008 | What you said about {X} has come round.                  | What you said you'd do about {X} has come due.            |
| 0011 | You said you would do something about {X}.               | What you said you'd do about {X} is still open.           |
| 0007 | What happened has not finished happening.                | **suppressed** (incident)                                 |

## Quiet (dormant) recaps (`quietSentence`)

| ID   | Before                                                                 | After                                                               |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 0007 | Whatever was going on at home with {X} has been quiet for a long time. | It has been quiet at home with {X} for a long time.                 |
| 0010 | You have not heard anything from {X} in a long while.                  | You have not heard from {X} in a long while.                        |
| 0008 | (unchanged)                                                            | You and {X} have not spoken in a long time.                         |
| 0011 | (unchanged)                                                            | {X} stopped coming up a long time ago.                              |
| 0004 | Nothing has come from {X} for a long time.                             | Nothing new has come from {X} in a long time.                       |
| 0003 | Nobody has said anything about what you owe for a long time.           | Nobody has pressed you about {the … payment} in a long time.        |
| 0001 | (unchanged)                                                            | Looking after {X} has not needed anything from you in a long while. |
| 0009 | (unchanged)                                                            | You have not been near {X} in a long time.                          |
| 0005 | Nothing has come of the business at {X} for a long time.               | Nothing has come out of {X} in a long time.                         |
| 0002 | (unchanged)                                                            | Nobody has mentioned what you said about {X} in a long time.        |
| 0006 | What happened has not come up again in a long time.                    | **suppressed** (incident)                                           |

## Suppression policy (all surfaces)

A recap or movement line is withheld — nothing rendered in its place — when
the record cannot name the subject:

- incident threads (subject exists only as a machine semantic key);
- school/work/civic/political threads whose organization has no recorded
  profile name (the old "Work" / "School" / "Something in the neighbourhood"
  fallback titles);
- promise callbacks with no nameable counterpart ("Something decided
  earlier");
- money obligations with a `custom:` basis.

And a quiet interval — no nameable movement, no birthday — emits no
narration at all.

## New structural sentence patterns

- "{Subject} came up / came up more than once." (movement, count-grounded)
- "What you said you'd do about {X} …" (promise family, replaces two forms)
- "{The housing/loan/support/care payment} …" (money family, basis-grounded)
- "You live with / You're enrolled at / You work at / You belong to {name}."
  (opening standing facts)
- Silence as a rendered outcome for quiet gaps.

One deliberate exact duplicate now exists: "You saw {X}." serves both the
household and kin/companionship single-movement arms — the honest sentence is
the same in both.

## Fixed-seed before/after (seed `corpus-early-childhood`)

Beat 1 (age 7, movement + birthday):

- Before: "By the spring, and you're 7 now. You spent most evenings at home
  with Thomas Lawrence and Douglas Lawrence, and most of them were quiet."
- After: "A couple of months on, and you're 7 now."

Beat 8 (age 8, quiet gap):

- Before: "A month later. Lexington, Kentucky went on the way it does, and so
  did you."
- After: (no narration; the scene arrives directly)

Occurrences of the flagged filler families ("By the {season}", "went on the
way it does", "Work stayed work", "Most weeks were built around school") in
the full fixed-seed transcript matrix: 49 before, 0 after.

## Random unchanged holdout sample (deterministic, seed 42)

- prose:life:adult:adult.partner-plan#prose — "The two of you want the next
  few years in slightly different places, and it has stopped being a
  hypothetical."
- prose:legislative:measure-briefing:uncertaintiesFor-0001#text — "A
  committee here can simply decline to take the bill up, and it would go no
  further."
- prose:life:formative:formative.caring-for-someone#option:hold-the-line:label
  — "Say what you can manage"
- prose:life:callback:lifeCallbackTransitionHandler-0002#text — "It was still
  there to be raised, and the person who could have raised it did not."
- prose:life:episode:growing-up.a-friend-over-years/the-year-you-were-inseparable#option:go:label
  — "Go with them"
- prose:life:episode:work.where-you-stand-there/the-offer#line:0 — "Somebody
  who heard about how you handled that morning wants you somewhere else."
- prose:life:episode:home.someone-is-not-all-right/it-got-worse#option:stay-back:memory
  — "You kept out of what happened to {role:household-peer}, and everybody
  noticed which way you went."
- prose:life:adult:adult.friend-in-difficulty#option:keep-it:description —
  "They told you, and that is where it stops."

All verified byte-identical to the base-SHA corpus (differential shows zero
transitions outside `prose:narration:*`).
