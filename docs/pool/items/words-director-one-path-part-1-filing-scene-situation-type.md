---
id: words-director-one-path-part-1-filing-scene-situation-type
title: "The talk at the filing counter is one scene of the scene engine, and the visit's own sequence is deleted"
area: director
kind: cleanup
priority: 1
size: M
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after: words-director-one-path-part-1a-scene-ending-opens-filing
blocked-on:
lead: words
model: opus
effort: high
root: design-story-director
source: split from words-director-one-path in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-13T07:00:00.000Z
branch: claude/words-w3-counter-main
---

**What.** Part of words-director-one-path. The talk before filing at the counter (which office, the race, the dates, the duty and the rules that stop a filing) is still a hand-ordered sequence in src/director/filing-visit.ts (stopgap SG-WORDS-filing-counter-prompts). The scene engine's own `filing-clerk` arc, with its replies, follows and endings, never plays. Make the counter talk that arc, played in the talk box, ending in the counter form, and delete the visit's sequence. The talk after filing is already the scheduled `filing` scene (purpose `filing-petition`) and stays. Seen: at the filing office the player answers the clerk (asks, pushes back or says "Not today" and leaves), hears about a rival who already filed, and the form opens only when the talk ends in filing.

**Cause.** Found in code: (1) `openFilingVisit`, `pickContest`, `raceTold` and `visitLine` in src/director/filing-visit.ts word each line through `wordSceneMove` with purpose `filing-clerk`, but choose the moves themselves (greet-counter, pick-office, tell-running, tell-race, tell-duty, tell-deadline, each `rule-<rule>`, take-papers or accept-terms). The `filing-clerk` arc in src/director/data/purpose-arcs.json (replies ask, tell, confront, leave; endings cold-feet, sized-up, filed and left-there) is never composed. (2) That arc cannot word a first visit. A probe that called `composeSceneTalk` (src/director/scene-talk.ts) with the counter's narration facts (name, post, first-visit, office) for the race's clerk (`filingClerkFor`), in Cameron, South Carolina (4510900), Sawmills, North Carolina (3759540) and Irving, Illinois (1737738), skipped every time with "the tell that states filing-clerk cannot be worded from the records given". The arc's `state: tell` pieces in data/english/parts/scene-talk.json are only about a rival who filed (`{opponent}`, `{when}`) or a refiling incumbent (requiresFacts `incumbent`). The counter's own moves are bank pieces under step `state` that no arc step plays. (3) The endings' `opens: "filing"` has no reader. That is part 1a. Without a probe fact set, the narration also skips ("no narration for filing-clerk can be worded"), so the scene needs `counterNarration`'s facts.

**Fix.** After part 1a. (1) In src/director/scene-talk.ts, let the `filing-clerk` statement be the counter's sequence when the facts carry `first-visit` or `returning`. Do it as `pickContest` joins its told lines now: tell-running, tell-race and tell-duty from `raceTold`'s facts, then tell-deadline, then one `rule-<rule>` line for each check that fails, said as one answer. Keep the arc's rival tell as the statement when the contest already has another candidate's filing (facts `opponent` and `when`, from the elections engine's filings for that contest). Add the arc field this needs in purpose-arcs.json, for example a `stateMoves` list read only when present, so other arcs are untouched. (2) Make the endings follow the checks. A filing with a failed rule ends `left-there` and keeps nothing. A filing with every rule met and the asker's `accept` ends `filed` or `sized-up`, which open the form. (3) In src/bench/filing.ts and src/bench/handler.ts, keep the counter screen's race pick: the CTO kept the counter as the player's action screen on Nov 1, 16:05. Picking a race composes the scene with `composeSceneTalk(core, director, { askerId: clerkId, askedId: playerId, causeId: contestId }, filingCounterType, facts)`. Here `filingCounterType` is a `filing-counter` situation type in src/director/data/situation-types.json (purpose `filing-clerk`, asker `clerk`, asked `candidate`, tag key `routine`) with no cause and a note that the bench stages it. The facts are those `pickContest` and `counterNarration` build now. The talk box plays the scene like any other, and part 1a's reader opens `FilingOverlay` (rules, platform, party, file) when it ends in `opens: "filing"`. (4) Delete `openFilingVisit`, `pickContest`, `raceTold`, `visitLine`, `FilingVisit.lines` and `FilingVisit.choices`, and the talk path of `/api/filing/choose`. Move `counterNarration` into the scene's narration facts or delete it. Count the removal in the PR body. Close SG-WORDS-filing-counter-prompts in src/director/data/stopgaps.json. (5) Never write under data/english/parts/. If a reply's follow or close has no piece that fits a first visit (the probe saw only the statement fail), list the lines needed in the PR body and in a `Needs from others:` line for the Story session, and keep the scene composing with `includeHeld` in tests until they land.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the duplicate is deleted in the same change and the PR body counts it. A scene is staged from the record that causes it (scene-producers). No hand-written player text: words come from the English banks. One rule, all 56 places.

**Done when.** A second session files for office in two drawn places, named with seeds (Deer Park, Washington seed 393dad669a24a488:1 and Topsfield, Massachusetts seed 6a7f8264-ee6f-4845-854e-60ff289f587a among them). In each, it sees the clerk's talk play in the talk box as the `filing-counter` scene (dev mode's trace names the type and the contest record id), with the race, the dates, the duty and any failed rule each citing the contest record id. It sees a reply chosen (ask or leave), the form opening only after an ending that files, and "Not today" closing the counter with no filing record. `git grep -n "openFilingVisit\|pickContest" -- src` finds nothing.

**Waits on.** Nothing.

**Files.** src/director/filing-visit.ts, src/director/filing-visit.test.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/director/data/situation-types.json, src/director/data/stopgaps.json, src/bench/filing.ts, src/bench/handler.ts, src/bench/filing-visit-talk.test.ts, src/bench/play.mjs

**Notes.** Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:32 UTC) on branch claude/pool-words-director-one-path-part-1-filing-scene-situation-type.

Released (2026-11-11): Cause no longer matches main: the after-filing talk is already the filing scene; the pre-filing counter is SG-WORDS-filing-counter-prompts, kept by the CTO's Nov 1 ruling (see the item's PR). Continue on branch claude/pool-words-director-one-path-part-1-filing-scene-situation-type.

Nov 11 (cause finder for Fable B): the earlier "needs a new design" was three concrete gaps. First, the visit picks its own moves. Second, the `filing-clerk` arc's statement has pieces only for a rival or an incumbent, so `composeSceneTalk` skips a first visit in three of three drawn towns (probe undone). Third, no bench code reads an ending's `opens`. The third is split out as part 1a, which this part waits on. The visit already uses the one word maker (`wordSceneMove`), so no second word engine exists. The duplicate is only the move order.

Nov 13 (Words builder W3): built on `claude/words-w3-counter-main` under Fable A's rulings on #8928 (04:19Z, 05:03Z). The three gaps above are closed: the visit no longer picks its moves (the talk after the race is named is `composeSceneTalk` on the `filing-clerk` arc); the arc's statement is the race told, through the arc's new `stateMoves` (tell-running, tell-race, tell-duty, tell-deadline), so a first visit composes; and each reply is a `scene.reply` record. Per Fable A's 05:03Z ruling the race pick and a rule refusal stay the counter screen's own steps, so `openFilingVisit` and `pickContest` remain as those steps; the Done when's "git grep finds nothing" line is replaced by that ruling, and Fable A is asked to confirm. "Not today" (the leave reply) closes the counter with no filing record; the form is the counter's own, opened by the reply that files.
