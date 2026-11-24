---
id: words-charged-relative-tells-the-charge-first
title: "A relative who has just been charged, convicted or acquitted tells it before the day's news"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead, Nov 16 (from the story builder's pressed court-case talks for #9697)
claimed-at:
checked: story builder 2026-11-16
---

**What.** A charged relative can go a whole talk without saying the charge. Played at Dallas, South Dakota (4615300), seed jw1 of the story builder's justice walk, on March 22, 2025, the day both relatives were charged with a bribe: the player clicked person_3b2bdc5c8c247a0f, whose charge ranks second among the subjects between them (own-work, charge, their-position, home, kin, news, own-view), and the talk went "Hi." / "Asher, last I saw you was a few days ago." / "Did you hear about an affordable-housing requirement for new buildings?", then the player's "I saw it.", "I'm glad they did." and the goodbye. The charge never came up. The other relative charged that day did lead with it. Whole talks: /mnt/project-files/words-lead/leftovers/court-case-talks-played-f94697e7.md.
Seen: a relative charged, convicted or acquitted that day opens the talk with it.

**Cause.** Found in code: the opener in src/director/conversation.ts (lines 5944 to 5957) lets a subject in NEWS_SUBJECTS (lines 5727 to 5743: job-lost, eviction, victimization, death-news, illness-news, prison-news, the job-new kinds, the promise kinds and the veto) lead before any other opener, whatever the day's news weighs. The case kinds `charge`, `conviction` and `acquittal` are not in the set, so they compete on topicWeight alone, and a printed story with a stand can outweigh them. This is the fault the Words lead fixed for evictions on Nov 14 (the comment above the `hard` rule).

**Fix.** Add `charge`, `conviction` and `acquittal` to NEWS_SUBJECTS, so a case of the teller's own leads until it has been told. No new rule and no new weight.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the one opener rule takes the case kinds; no second path. One rule, all 56 places.

**Done when.** A second session runs the justice walk (or any played world where the justice engine charges someone the player can click) at a drawn place, clicks each charged relative on the day of the charge and of the verdict, and every talk opens with the case; src/director/eviction-leads-the-talk.test.ts or a sibling pinned test checks a charge leads over a printed story.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/eviction-leads-the-talk.test.ts

**Notes.**

- Filed Nov 16, 2026 by the story builder for the Words lead, on the leftovers branch (words-line-register-leftovers), for the conversation engine thread, which holds conversation.ts.
