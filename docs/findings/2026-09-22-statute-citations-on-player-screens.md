# Statute citations were being printed at the player, on a screen we can name

Measured 2026-09-22. Two lanes reached this defect independently, from
different states; this write-up is the traced path and what was left over
after the other lane's change.

## What was asked

The nationwide lane flagged citation-shaped strings in
`rule-capability-resolver.ts`, `constitutional-process.ts` and
`candidate-qualification.ts` and could not say whether any of them reached a
player. The coordinator's note was that establishing whether they reach a
screen is worth more than guessing about them. It was established, and they do.

## The path, end to end

```
office-qualification-rules.ts  assessment.reason
candidate-qualification.ts     refusal.reason
        ↓
candidacy.ts                   blocks[].reason
        ↓
player-capabilities.ts         withheld[] for surface "campaign"
        ↓
PlayerGame.tsx:5013            <p data-testid="no-campaign">{…reason}</p>
```

So the note a character reads when the game will not put them on a ballot
was, in several states, a sentence that began with a constitutional article.
Measured examples, taken off the sweep before any fix:

- "Neb. Const. art. III, § 8 requires 1 year of residence. The game has not
  recorded when this character came to live here…"
- "Minn. Const. art. IV, § 6 was observed in current source text on
  2026-09-09; that later observation does not establish the rule on
  2026-01-05."
- "Ohio Const. art. XV, § 4 requires that the candidate is a qualified
  elector…"

The owner's rule is that there are no source references on a player-facing
surface; provenance lives in the record. Every one of these already carried
its `source` on the same object, a few characters away, so the sentence was
repeating what the record held.

**This is the difference between a string that looks player-facing and one
that is known to be.** The path is the finding; the sentences are its
consequence.

## `constitutional-process.ts` is clear

It was checked and has no citation-shaped player string. The flag was right
about two of the three files it named.

## Three lanes, and who fixed what

Three lanes reached this defect the same night from different ends — this one
from a Nebraska refusal, the nationwide lane from an ordinary character in
Columbus being told about Ohio's qualified-elector requirement, and the
player-facing-text lane by grepping for research vocabulary rather than
reading the call graph. That is routing duplication, not three defects, and
the overlap was measured by reading each branch's file list rather than taking
a merge notice at its word.

- **PR #320 (nationwide lane)** owns `office-qualification-rules.ts`,
  `rule-capability-resolver.ts` and `candidacy.ts`, and carries the fix into
  `CampaignWorkspace.tsx`, `EducationOptionsPanel.tsx` and
  `TaxWorkWorkspace.tsx`.
- **PR #317 (this lane)** was the campaign-finance half, eight sentences in
  `campaign-compliance-rules.ts`. Neither other lane touches that file, so it
  was never duplicated.
- **The player-facing-text lane** (`f581049e`) owns both temporal-applicability
  sentences in `candidate-qualification.ts`, a resolver branch both earlier
  fixes missed because the test only ever passed a null office key, the
  coverage note in `candidacy-packs.ts` that two character-creation screens
  print, and three seat-count rules plus a quorum rule in
  `legislature-rule-packs.ts`. Their wording is better than what this lane had
  drafted for the same two sentences, because it tells the player what they
  can do about it: "A life that starts later may be able to run here."
- **This change** is what was left over once those three landed: the
  screen-path sweep, the two art requests, and this write-up.

**Eight known producers, six covered.** The tax-work summary and the municipal
packs are not. That is stated rather than rounded up, and it is the number to
carry.

## One record that keeps its citations on purpose

`NEVADA_RULE_PACK.unresolvedGaps` is research for whoever reads the
authorities next, and only the diagnostics gate renders it. Its entries read
almost identically to the seat-count rule notes in the same file, which _do_
reach a player. One lane rewrote an entry, broke
`legislature-rule-packs-matrix.test.ts`, and reverted; without that test a
research record would have been silently rewritten as if it were player prose.

The sweep in this change cannot reach it — it runs
`candidacyEligibility` → `resolvePlayerCapabilities` → the withheld reason and
never touches `legislature-rule-packs.ts`. Any future sweep that does reach
that file has to tell the two apart before it asserts anything.

## Three sentences keep their citation on purpose

The ones passed to `notApplicableRule()` and `unknownRule()`. Those helpers
carry a `note` and no source field, so the citation inside the prose is the
**only** copy of the provenance on that value. Removing it there would destroy
the record rather than move the information, which is the exact failure the
guard assertion exists to catch. None appeared in any sweep's offender list,
so none is proven to reach a screen. Giving those two helpers a source ref is
the follow-up, and it is a change to a shared rule type rather than a prose
fix.

## Two sweeps, and why both are worth keeping

They are complementary rather than duplicate, which was checked rather than
assumed:

- #320's sweeps test the **producers** directly — `assessOfficeQualifications`,
  `resolveCapability`, `qualificationTemporalApplicability`.
- `candidacy-refusal-prose.test.ts` here runs
  `candidacyEligibility` → `resolvePlayerCapabilities` → the withheld reason,
  which is the string the `no-campaign` paragraph renders. #320's sweeps
  mention none of `resolvePlayerCapabilities`, `withheld` or
  `candidacyEligibility`.

So one proves the sentence leaves the simulation clean and the other proves it
arrives at the screen clean. A later change in the presentation layer would
slip past the first.

## A rule for writing a refusal, taken from a better sentence

The player-facing-text lane's wording for the two temporal sentences was kept
over this lane's, on the merits rather than on precedence, and the reason
generalises:

> "The game knows this office's minimum age rule, but that rule did not yet
> apply this early, and it won't apply a rule to a time it can't place it in.
> **A life that starts later may be able to run here.**"

This lane's draft said what the game does not know and stopped there. Theirs
names the condition under which the answer would change.

**A refusal that only states an absence leaves the player stuck; one that
names the condition under which it would change does not.** That applies to
every refusal sentence in this repository, not just these two, and it is the
rule to write the next twenty by.

## This sweep is a control, not more evidence

The dependency on #320 was proved both ways rather than asserted: the sweep is
red on `main` at `453b6893` with 21 offending sentences, and green on #320's
head `ec62a2e7`, measured by fetching `pull/320/head` and moving the test onto
it.

That distinction is worth naming. Everything else produced tonight on this
defect is **evidence** — a measurement of how things stood at a named head.
The sweep is a **control**: it is the one artifact that will fail if any of
the three lanes' fixes regress, in any state, on either side of the source
observation dates. Evidence ages the moment a head moves; a control does not.

## How this was measured, which matters more than the count

The first sweep written for this defect class **passed against the unfixed
file**. It filed a Kentucky campaign and swept every combination, and this
repository has not read Kentucky's campaign-finance law, so every path
returned the same "unregulated" sentence and reached no rule with a citation
in it. A green sweep over a sample that reaches nothing is worse than no
sweep, because it reads as coverage — its failure mode is silence.

Both sweeps here now assert they reached the branches they test —
`campaign-compliance-prose.test.ts` requires both `allowed` and `refused` in
its sample, `candidacy-refusal-prose.test.ts` requires a non-empty block
count — so they fail rather than pass if they ever stop reaching a rule. Each
was run against the broken file first and the number recorded: 39 offending
sentences before the campaign-finance fix, 21 before the candidacy fix, none
after either.
