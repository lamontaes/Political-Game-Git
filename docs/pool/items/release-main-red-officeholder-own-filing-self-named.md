---
id: release-main-red-officeholder-own-filing-self-named
title: "The officeholder-scenes check casts an own filing from a moment the journal would never mark as the person's own"
area: release
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-officeholder-own-filing-self-named
pr:
after:
blocked-on:
lead: words
model: opus
effort: low
root: none
source: Red desk, Nov 13 (Fable A on #8928, comment 6842448463)
---

**What.** `src/director/officeholder-scenes.test.ts`, "a filing, an introduced bill or an appointment learned of through a tie is not cast as one's own", fails on every run on clean main 8ce733c3: "filing: expected false to be true" at line 107. It has failed since Nov 1, and it sits in the changed-tests list of anything that touches the director's scene files. Seen: a person's own filing stages the filing scene, and one learned of through a tie does not.

**Cause.** Found in code: since 6468e0f73b (Nov 1), the filing cause in src/director/scheduling.ts matches only a moment whose record names the person, which the journal marks `selfNamed` (src/director/journal.ts). The check's "own" moment was hand-made without that mark, so the own filing no longer matched, while the tie case passed for the right reason.

**Fix.** Test only: the check's own moment carries `selfNamed: true`, as the journal writes it for a record that names the person; the tie moment carries none, as the journal leaves it. Every assertion is unchanged.

**Time box.** 0.5 hours

**Rules.** Ask why: a scene is cast from the record that names the person, never from a tie's news. No assertion is loosened; the moments match what the journal writes.

**Done when.** A second session runs officeholder-scenes.test.ts on main and all five cases pass, the tie case among them; the case uses no drawn place (hand-made moments), so no seed applies, and in a drawn world on the bench a housemate's filing stages no filing scene for the player.

**Waits on.** Nothing.

**Files.** src/director/officeholder-scenes.test.ts
