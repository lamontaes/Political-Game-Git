---
id: laws-corrections-raise-moves-no-money
title: "Raising the corrections line moves no money an engine pays"
area: laws
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
---

**What.** Raising the corrections line moves no money an engine pays. In the Oct 24 justice regrade, raising budget-line:corrections in Prescott, Michigan and Uehling, Nebraska moved no money through an engine. Jail days are capped by the sentences being served, so more capacity buys nothing, and the money link graded wired only on treasury rounding (budgets-treasury.ts:851 differs by one unit against the control world). A larger corrections line should either fund something the jail spends (staff, programs, conditions) or be returned unspent at the close.

**Cause.** Found in code: `serveTerms` in src/core2/public-safety.ts (line 1341) pays jail days from the sentences being served, and the corrections line's capacity changes nothing of those days' cost while the line houses everyone who is held (its own comment, lines 1358 to 1361).

**Fix.** Make the engine that pays for jail days read the corrections line (staff, programs or conditions) so a larger line buys something a person feels, or return it unspent at the close. The new capacity rule replaces the cap it changes.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read: the engine that pays for jail days reads the corrections line at the moment it pays them. Replace, never layer: a new capacity rule replaces the cap it changes. No dice: who is held follows sentences and the law, never a roll.

**Done when.** A second session, not the builder, runs the played world (`buildBenchWorld`) at the drawn places Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) with the corrections line raised. The raised line moves a journal post an engine makes because of it, named by journal id in the justice family test, and the checker's money link cites that post, not rounding. Nothing on screen reads it yet; it would show on Politics → Budgets.

**Waits on.** Nothing.

**Files.** src/core2/public-safety.ts, src/core2/law-wiring-justice.test.ts

**Notes.** From the laws lead's justice helper, Oct 24.
