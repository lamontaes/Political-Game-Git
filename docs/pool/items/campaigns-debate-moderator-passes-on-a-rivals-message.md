---
id: campaigns-debate-moderator-passes-on-a-rivals-message
title: "The reporter who moderated a race's debate passes on a rival's campaign message to a candidate the next day"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-life-record
source: Fable A, rule 13, Nov 13, 2026, from Playtester P3's item 10 (North Hyde Park, Vermont); traced by the Life records builder opus-lr on #8928 at 07:35Z; Fable A sent it to governing at 07:51Z
checked: opus-lr 2026-11-13
---

**What.** Fable A ruled on Nov 13 (rule 13) that a reporter who ran a debate does not turn informant the next day without a record of why. Playtester P3 saw it in North Hyde Park, Vermont (seed a6b481a5-c6c9-432b-8cca-c0463c518da8): on February 26, the day after he moderated the North Hyde Park Register debate, Kevin Garcia came to the house to say that Stephen Pugh's campaign had reached him that week. Seen: the rival-word scene at home, and who tells it.

**Cause.** Found in code: `rivalWordPassedOn` in `src/core2/modules/campaigns.ts` picks as the teller the closest known person who witnessed the rival's message and whose tie's `lastContactDate` is after the message. The debate the reporter moderated put him in touch with the candidate, so he qualified the next day. Nothing on record gives him a reason to carry a rival's message, and the moderator is not kept on the debate row (it is on the `debate-accepted` record's `reporterId`, or chosen by `debateModerator` in `src/core2/modules/meetings.ts`).

**Fix.** The meetings engine keeps the moderator on the debate's row when the sitting is accepted. `rivalWordPassedOn` passes over, as a teller, anyone who moderated a debate of the same contest. One rule for every candidate, not only the player.

**Time box.** 2 hours, Sonnet.

**Rules.** No dice: the record decides who may tell. One rule, all places.

**Done when.** A test in a drawn place where a debate is held reads every `rival-word` record of that contest and finds none told by the debate's moderator. A second session, on main, sits for a debate and sees no rival-word scene from its moderator in the days after.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/meetings.ts

**Notes.** Filed by the Life records builder (opus-lr), Nov 13. Fable A ruled at 07:51Z that it is not built inside a words pull request. The same rule's other parts: the debate's opening is #9034; the "nice speech" lines on a rival's ad wait on line keying.
