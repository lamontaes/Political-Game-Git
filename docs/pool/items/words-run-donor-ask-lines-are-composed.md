---
id: words-run-donor-ask-lines-are-composed
title: "A donor's ask names what they gave, the bill they want and why, from their own business and views"
area: words
kind: bug
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after: words-run-filing-clerk-lines-are-composed
blocked-on:
lead: words
model: opus
effort: high
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch:
---

**What.** While running, a donor who gave to the campaign stops the player to ask for something. The request sometimes names the gift or the bill ("I gave {money}. I'd like you to look at {bill}."), but the openers, the player's replies and the donor's answers are mostly fixed: "Do you have a minute?", "Can I talk to you?", "Then I'll find a candidate who listens." 141 of the 173 lines under the `donor-ask` purpose have no insert, so a contractor who gave a thousand dollars and a retiree who gave fifty say the same things. Seen: the talk box when a donor approaches the player on the street or after a gift, and the player's replies.

**Cause.** Found in code: the `donor-ask` type in src/director/data/situation-types.json fires on `circumstance:donor-ask-street` and on the `money:event:campaign-gift` moment. `composeBinding` in src/director/purpose-scene.ts adds, for a `campaign-gift` record, `money` and `gift` (the amount) and `donor-bill` (the pending bill the donor cares most about, when the record names one). `chooseVariant` (src/director/arc-variant.ts, data in src/director/data/arc-variants.json) picks the arc's variant from reads such as `gift-size` and `gift-share`. The lie branch in src/director/scene-talk.ts adds `knows-truth` and `source` when the donor can catch a lie. Of the steps, only `state/request` (13 lines, 5 with no insert) and `follow/confront` mostly use these; `open/greet` (9 of 10), `follow/accept` (19 of 23), `follow/thank` (13 of 13) and every reply move carry no slot. The donor's own business (their job's employer, `jobOf` pattern, or an organization they own) and their stance on the bill's question (`viewOn` in src/core2/modules/views.ts) are on record and never passed, so no line can say why they want it.

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`).
2. **The facts.** Pass `employer` (the donor's employer or business, citing the job and organization) and `about` (the donor-bill's question, worded by `questionAbout` in src/english/question-names.ts) with `side` (`for` or `against`, the sign of their `viewOn` it), citing the views record. Keep `money`, `gift`, `donor-bill` and the variant's reads.
3. **The parts.** The opener (`open/greet`): the short lines and the owner's graded-good openers stay as openers; add a required core naming `{name}` or `{money}`, at least 8. The request (`state/request`): a core naming `{bill}` or `{about}` and a reason naming `{employer}` (at least 8 reasons). The donor's answers (`follow/accept`, `thank`, `press`, `confront`, `threaten`, `plea`): a core naming `{bill}`, `{money}` or `{about}`, at least 6 per move.
4. **The replies.** Up to four, each a different move, at least 8 wordings each, each naming the bill, the gift or the question: agree to look again (`agree`), offer a meeting (`offer`), decline and say why (`decline`, naming `{about}`), and put it off (`deflect`). A lie (`lie`) stays a fifth possibility only where the arc offers it in place of one of these; never more than four shown. `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** `replyInScene` (purpose-scene.ts) already writes `scene.reply` with the ending's `keeps`: `favor-owed`, `meeting-set`, `trust-lost`, `promise`, `relationship-strained`. Name the record ids in the pull request, and show a later scene or the journal reading the favor owed.
6. **Delete what this replaces, with every reference.** The 141 lines with no insert under `donor-ask`, except those the owner graded good ("Got a second?", "Sorry to bother you.", "Is now a bad time?", "Then I'll find a candidate who listens.", "Meet me halfway, and we have a deal.", "I won't forget this.", "People say a lot of things."; an eighth, "Then {source} has it wrong.", carries an insert), which stay as openers or closers and keep their grade rows. A piece that also serves another purpose (66 do, many shared with town-hall-question and press-comment) loses only its `donor-ask` use. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/donor-ask-scene.test.ts and src/director/donor-ask-variants.test.ts, on drawn places: two donors with different businesses and opposite stances on the same bill give different reasons; a large and a small gift are named as given; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 6 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: which bill and why come from the donor's records. Ask why: the reason cites the donor's job or views record. One rule, all 56 places: the tests draw their places.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds through filing and the first weeks of a campaign, until a donor asks for something. Each ask names what the donor gave or the bill, and a reason from their own work or views; the replies are at most four different moves, each naming the bill, the gift or the question. It answers with an offer and finds the meeting on record. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/purpose-scene.ts, src/director/arc-variant.ts, src/director/data/arc-variants.json, src/director/scene-talk.ts, src/director/donor-ask-scene.test.ts, src/director/donor-ask-variants.test.ts, src/director/reply-set-check.ts, src/english/scene-talk-words.ts, src/english/question-names.ts, src/core2/modules/views.ts, src/core2/modules/campaigns.ts, data/english/parts/scene-talk.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 173 lines, 141 with no insert and not excused. Three today: "Do you have a minute?", "Can I talk to you?", "Have you got a few minutes?"
