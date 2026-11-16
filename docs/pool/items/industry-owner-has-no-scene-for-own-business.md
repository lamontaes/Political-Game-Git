---
id: industry-owner-has-no-scene-for-own-business
title: "The owner of a business that closes, cuts staff or loses money has no scene and no talk about it"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: words
model: opus
effort: medium
source: "Industries thread, Nov 16 (trace /mnt/project-files/account-lead/reports/industry-events-read-by-story.md), at the Account lead's direction, for the owner's Nov 16 01:58Z ask"
---

**What.** A business's owner is named on `business.closed` and `business.staff-reduced`, but no scene type and no talk reads either for the owner: the worker gets the layoff scene and their household gets the news, while the person who decided gets nothing. A player who owns a business, or knows someone who does, never hears the owner's side. Seen: src/director/data/situation-types.json on Train head a62a2fda has no scene caused by `business.closed`, `business.staff-reduced` or a loss month.

**Cause.** Found in code: src/director/data/situation-types.json causes for `layoff` and `reach-out` read `work.job-lost` (the worker); none reads `business.closed` (src/core2/modules/business.ts `onEvent`) or `business.staff-reduced` (src/core2/modules/jobs.ts around line 1853), both of which name the owner.

**Fix.** Add a scene producer and talk rows reading `business.closed` and `business.staff-reduced` for the owner and the people who know them (scene-producers skill), with the closing's reason (and its law, after industry-closing-reason-names-no-law). The player sees it as a scene with the owner, or as the owner.

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** A scene without an outcome is not a scene. People in your life carry context, never chit-chat. One model, two tiers: a counted owner is filled in when met.

**Done when.** In a drawn place where a business the player knows closes or cuts staff, its owner's scene plays with an outcome, by the record's id, and a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/conversation.ts
