---
id: play-creator-child-looks-from-both-parents
title: "A child's look comes from both parents on the record, not wholly from the player's"
area: play
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
after:
blocked-on:
pr: "#9351"
lead: screens
source: 'owner, Nov 8, 2026: "I''m Mexican and my son is white."; coordinator note on #9301'
model: opus
effort: medium
root: none
checked: not yet
---

**What.** The owner said on Nov 8, 2026: "I'm Mexican and my son is white." A child of the player has two parents on the family record, and may look like either or like both. Today a child and the player's own parents each carry one origin string, so the creator's chosen look paints the player's children and parents all in the player's tone, whatever the other parent looks like. Seen: in the People screen, the child of a player and a partner of another origin looks like one of them or a mix, and the player's own parents can differ from each other.

**Cause.** Found in code: `looks.origin` is one value per person (`src/core2/types.ts`), and `src/bench/data/whole-figures.json` maps each origin to a list of skin tones (`originTones`: white 0 and 1, hispanic 1, black 2, asian 0 and 1, other 0, 1 and 2). `chooseIdentityV1` in `src/core2/state.ts` sets every blood relative who shared the drawn origin to the chosen one, with no reading of the other parent. There is no way for a person to take their look from two parents.

**Fix.** When a person is drawn or re-drawn from a chosen look, read both parents on the family record (`familyRelation`, `src/core2/closeness.ts`) and let the child's tone range be the union of the two parents' tones, drawn once per child from the world seed, so siblings may differ. Keep the one-origin string for the town's mix; add the two-parent range as a record the figure drawing reads. Extend `src/bench/creator-origin.test.ts` with a child whose other parent has a different origin.

**Time box.** 4 hours, one Opus session. When it runs out, push what passes and say so.

**Rules.** No dice: the range comes from the parents' records and the seed picks who exists. One engine: the figure drawing reads one record. No new stopgap.

**Done when.** A creator life with a partner of another origin shows children whose tones come from both parents, in three drawn places named with seeds, with before and after People screens at 1440x900; the player's own parents may differ from each other; the pinned test covers it. A second session creates a life in a place and seed nobody chose, on main, opens People and sees the children's faces drawn from both parents.

**On screen.** The People screen's faces for children and parents.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/closeness.ts, src/bench/whole-figures.ts, src/bench/creator-origin.test.ts.

**Notes.** Filed by hand from #9301 (the blood-kin rule). That PR keeps one origin per person and says so.
