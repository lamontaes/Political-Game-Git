---
id: words-stable-pick-keeps-shares
title: "Scaling every wording in a spot alike changes no line said"
area: words
kind: defect
priority: 1
size: S
status: claimed
standard: 2
claimed-by: account-lead-M4
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words lead's ruling, Nov 15 06:38Z, on the marks spread proof (/mnt/project-files/account-lead/m4/marks-spread-picks-c19d52b3.md)
claimed-at: 2026-11-15
branch: claude/words-stable-pick-keeps-shares
---

**What.** When the grade fold scaled every wording in a spot by the same factor, each wording kept exactly its share, but the line said changed anyway. Of 1,787 campaign lines at Salado TX, most of the 248 that changed under the Nov 15 marks were this reshuffle, not the marks (P33.3#1 kept a share of 0.500 and stopped being said).

Seen: in the before and after runs of the marks spread at Salado TX, seed review1:2.

**Cause.** Found in code: the stable pick in `renderGroundedEnglish` (src/english/grounded-english.ts) drew `hash mod total weight`, so any change to the total, even one that keeps every share, moved where the hash landed.

**Fix.** Read the hash as a fraction of 2^64 and multiply by the total, so the pick lands where that fraction falls among the shares. An even rescale then changes no pick, and a real shift in shares moves only the picks near a boundary. It changes which wording plays at many moments once.

**Time box.** 2 hours for one session.

**Rules.** No dice: the pick stays the stable hash of the world seed and the moment, with no roll; only how the hash is read changes.

**Done when.** A second session, on main, runs src/english/stable-pick-scale.test.ts green (Salado TX, its seed pinned: weights scaled by 3, 7 and 1000 give the same 400 picks), and in a drawn place's talk at home, played twice with the calibration table scaled evenly, reads the same lines both times.

**Waits on.** Nothing.

**Files.** src/english/grounded-english.ts, src/english/stable-pick-scale.test.ts (new)
