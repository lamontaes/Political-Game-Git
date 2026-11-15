---
id: views-strongest-state-view-always-for
title: "Nobody's strongest view on a question a state can decide is against it"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: views
source: S6 (brief J, the price end, #9477), Nov 15 2026; Words lead, Nov 15 12:26Z
standard: 2
model: opus
effort: medium
root: none
---

**What.** A running mate who would say no names a price on the question they hold most strongly that the governor's office can decide. Across about 77 worlds (Santa Rita and Yona, Guam; Kansas, 2073775; Massachusetts, 2516740; the player filed under either party), every offered person's strongest such view was "for". No price was ever "against" a proposal, so the lines for one were taken out of #9477. People against rent stabilization, right-to-work rules or a concealed-carry permit exist in real places, so this may be how views are drawn, not how people are.
Seen: in the running-mate sit-down, every price asks the player to be for something, never against it.

**Cause.** Measured: at Santa Rita, Guam, seed fedcba9876543210, by a probe test that printed `questionAxis`, `supportShare` and `publicOffset` (src/core2/campaign-views.ts) for every question `contestPositions` gives the governor's ticket. Of the first 40 of those questions, all but four have a country support share above one half, so `popularity`, added to every opening stance by `openingStance` (src/core2/modules/views.ts), pushes every person toward "yes". The pick of the strongest view takes the largest size, and with the offset the largest is nearly always a popular "yes": a left-leaning person's concealed-carry permit (axis −0.70, offset +0.46) or a right-leaning person's photo ID to vote (axis 0.47, offset +0.30). Whether the offset's size is right, or whether a person's strongest view should be read before the country's popularity is added, is the open question.

**Fix.** Check the size of `publicOffset` against how strongly real people hold the losing side of a popular question (survey intensity, not only share), and correct it in `publicOffset` or in `openingStance`. The player sees it in every place a person's strongest view is read: the running-mate price, an ask to serve and door talk. If "against" prices then play, bring back the four lines kept in /mnt/project-files/words-lead/picking-people/price-lines-revised.md and the side check in `promiseWorth` (src/core2/modules/serve-asks.ts).

**Time box.** 4 hours for one opus session.

**Rules.** Research before building: the size of the offset is calibrated from survey data on how strongly people hold each side, never typed in.

**Done when.** A second session, at a drawn place and a seed it did not choose, files for governor and reads the offered running mates. Some offered person's strongest view on a question the office can decide is "against", or the PR body shows from research that "for" is right.

**Waits on.** Nothing.

**Files.** src/core2/campaign-views.ts, src/core2/modules/views.ts, src/core2/modules/serve-asks.ts
