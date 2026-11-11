---
id: traits-neighbors-gap-routine
title: "Opposite neighbors' daily mixes barely differ because routine fills the day"
area: people
kind: wiring
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The matrix's opposite-neighbors gap (how much further apart the daily mixes of the most opposite adults in a town sit with personality than with traits wiped flat) is 0.00 to 0.04 in six drawn towns on the family branches, against 0.10 on October 20, and the lead's proof asks for twice that. The mix is mostly routine personality barely touches: going to scheduled work is 35 percent of picks with 0.7 percent turned, shelving a business idea each month 25 percent with none turned, school and staying out of races most of the rest. The main daily outlet, seeing someone against resting, is about a tenth of picks, and in some pairs temperament cancels a difference circumstances made, which narrows them. Find what would let temperament show in more of a day without adding a mechanic the owner has not asked for, measure it on main after the families merge, and report the gap.

**Cause.** Measured: scripts/traits/trait-wiring-matrix.ts on six drawn towns: opposite-neighbors gap -0.097 to +0.040 against 0.10 on Oct 20; Peacham, Vermont (seed 58e683537f9b) +0.041, Holualoa, Hawaii (seed 6f7794a4906f) +0.002; scheduled work is 35 percent of picks with 0.7 percent turned. The Notes hold the analysis (the routine fills the day; the chooser probe is blind to cause choices at src/core2/modules/drives.ts line 711).

**Fix.** Re-run the matrix on current main in two drawn places, print the gap with each action's share, and either show it at twice the Oct 20 value or write the cause in numbers plus the owner question it leaves. Add no new daily activity.

**Time box.** 4 hours for one Sonnet session.

**Rules.** Wire to the world: measured in one year of buildBenchWorld per drawn place, played against flat and mirror twins. Never loosen the check: the gap is the matrix's existing neighbors measure, not a narrower one. This is a game, not a spreadsheet: a new daily activity is the owner's call, not a fix here.

**Done when.** A second session runs scripts/traits/trait-wiring-matrix.ts on current main for one year of buildBenchWorld in each of two drawn places (places and seeds named) and sees the opposite-neighbors gap printed with each action's share of the difference, and either the gap at twice the Oct 20 value or the cause written in numbers with the owner question it leaves.

**Waits on.** Nothing.

**Files.** scripts/traits/trait-wiring-matrix.ts, src/core2/choice.ts, src/core2/modules/life.ts, src/core2/modules/drives.ts

**Notes.** Filed Oct 24 by the traits lead. Gaps measured: Holualoa, Hawaii -0.002; Peacham, Vermont +0.040; Ora, Indiana +0.035; Arbela, Missouri -0.097; Jerry City, Ohio +0.014; New Britain, Connecticut +0.029. Measured Oct 24 by the traits lead in the same six twin runs: flipping a person's own traits moves their year's mix 0.20 to 0.41 apart (the matrix's meanDistanceSelfMirrored: Arbela 0.368, Ora 0.203, Jerry City 0.205, New Britain 0.283, Peacham 0.407, Holualoa 0.270), so temperament does reshape a person's year. The opposite-neighbors gap stays near zero because neighbors picked only for opposite traits already differ by job, age and household, and the distance saturates: Ora's opposite neighbors sit 0.79 apart with traits flat and 0.82 with them. Picks at chooser sites temperament turns at least 5% of the time are 13.5 to 23.8 percent of all picks. Measure again on main once the families merge before concluding. Measured Oct 24 by the traits lead, gap split by action (twins on claude/traits-outcome-job-performance; Peacham, Vermont, seed 58e683537f9b; Holualoa, Hawaii, seed 6f7794a4906f). Peacham +0.041: retelling news (+0.014), officials attending a sitting (+0.014), taking up a cause (+0.013) and carrying on (+0.011) widen it, while seeing someone (-0.016) and going to work (-0.010) narrow it, because temperament cancels a difference circumstances made. Holualoa +0.002: shelving a business idea (-0.019) and caring for a relative (-0.007) narrow it. In Peacham three choices fill about 40% of picks and the chooser probe saw temperament turn none of them: shelving a business idea (14%, founding loses to market room, traits-money-saturated-reasons) and carrying on or taking up a cause (29%). For the cause choices the lean enters the goal's urgency instead of the chooser's trait reason (src/core2/modules/drives.ts:711), so the probe reads a zero trait term there; that is a blind spot of the probe, not proof of no effect.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have widened a matrix gap between opposite neighbors' daily mixes; a lead's proof number no player sees.
