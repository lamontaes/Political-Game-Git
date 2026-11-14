---
id: play-petition-signatures-come-from-door-days
title: 'The filing counter shows "Signatures the clerk will count" and status labels under the talk; a doors outing never says how many signed'
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-4w5ny3
pr:
after: play-no-petition-race-shows-zero-signatures
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
source: Owner, chat, Nov 14 00:50Z and 00:51Z; decision card 01:02Z
claimed-at: 2026-11-14
---

**What.** The owner, Nov 14 00:50Z: "It shouldn't say signatures the clerk would count at all. Like, that doesn't need to be known. All that should happen is when you're doing knocking on doors, you know, every now and then you might get 5 people or 20 people or no people, but there should be, you know, scenes every now and then, maybe sometimes no scenes. That's how gathering signatures work." And 00:51Z: "None of those count lines or anything like that should pop up in dialogue. It should literally just be dialogue." Asked whether the player still sees what they have gathered, he chose "Tab total and each outing" (decision card, 01:02Z).
Seen: the filing counter's talk (labels under the clerk's lines), the Campaign tab's petition rows, and the strip after Knock on doors.

**Cause.** Design: signatures already come from doors (src/core2/modules/campaigns.ts `walkWith` asks each person who opens to sign through `askToSign`, decided by `signReason` and the person's traits) and the `door-signature` situation already stages a door now and then. What the owner rejects is on the screens: src/bench/play.mjs `renderFiling` adds two labels under the clerk's talk (`controls.filing.petition`, "Signatures the clerk will count: {needed}, handed in by {date}", and the filing's status, "Collecting signatures" / "You are on the ballot" / "Not accepted · rule"), the Campaign tab adds "The clerk's count: {valid} counted, {struck} struck", and nine spoken clerk and door lines repeat the count after the clerk first says it. The doors outing's result strip (`campaignResults`) says doors and people reached but not how many signed.

**Fix.** Delete both labels under the counter talk, their strings (`filing.petition`, `filing.status`, `filing.rules`) and the now unused `filing-rule-labels.mjs` with its test; delete the Campaign tab's clerk's-count row, its strings and `petitionView`'s `check`. Keep the tab's "Signatures: {signed} of {needed}, due {date}". The doors outing's result adds "{n} signed" or "No one signed" from the petition's own door signer rows while it circulates (src/bench/campaign.ts `campaignDay`). Reword the nine spoken lines the Words lead ruled on (rule 50: the clerk says the number once; nobody repeats a count). No engine change.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** Rule 50 (Words lead): dialogue is only what a person would say. player-screen-text. No dice: each signature is a person's own answer. One rule, all 56 places.

**Done when.** A second session, on the train or main, starts a life in a drawn place, files for a race with a petition and goes out on doors on several days. The counter shows the clerk's talk with no label under it; the Campaign tab shows the signatures held and due date with no clerk's count; each doors outing's strip says how many signed, a day of none saying "No one signed"; and now and then a door plays as a scene with no count in it.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/data/controls.json, src/bench/filing.browser.mjs, data/english/parts/scene-talk.json
