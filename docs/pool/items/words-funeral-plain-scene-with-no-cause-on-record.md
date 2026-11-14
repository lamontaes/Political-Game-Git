---
id: words-funeral-plain-scene-with-no-cause-on-record
title: "A death in the player's family with no recorded cause of the dead person's plays no funeral scene at all"
area: words
kind: words
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-thin-scene-banks-need-alternates
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead ruling on the funeral scene, Nov 14 2026
claimed-at:
---

**What.** The funeral request reads what the dead person did or cared about on record (`src/director/funeral-facts.ts`); a death with none on record plays no funeral-cause scene, so the player hears of it only in the Journal and the news. A plain funeral scene is wanted for that case: a mourner and the player, with no request, built from the death record and the tie. Seen: the funeral scene at the loss of a family member who had no recorded cause, with the mourner saying only what the records hold.

**Cause.** Design: `docs/design/scenes/owner-scene-examples.md` lists the funeral among the scenes the owner asked for; `src/director/funeral-facts.ts` writes `cause` only when the dead person has a deed or a drive on record, and every funeral-cause request line requires it (Words lead, Nov 14 2026).

**Fix.** The Words lead names the purpose's moves and the lines it wants; a builder adds the purpose to `src/director/data/purpose-arcs.json` and the situation type's cause, with the bank lines, then proves it in a played year.

**Time box.** 4 hours.

**Rules.** Wire to the world: the lines read the death record and the tie only. No count or status line (rule 50). No claim the records do not hold.

**Done when.** A second session, on main, brings a death about with dev mode in a drawn place where the dead person has no recorded cause and sees a funeral scene play with lines that name only the tie and the person.

**Waits on.** words-thin-scene-banks-need-alternates.

**Files.** src/director/funeral-facts.ts, src/director/data/purpose-arcs.json
