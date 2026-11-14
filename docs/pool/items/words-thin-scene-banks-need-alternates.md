---
id: words-thin-scene-banks-need-alternates
title: "Scenes a player meets twice read the same twice: nine scene purposes hold fewer than 30 lines, and funeral-cause never plays at all"
area: words
kind: words
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: claude/project-thread-13bhdd
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead brief K, Nov 14 2026 (owner, Nov 14: "we also need many different alternate wordings and stuff, so every run doesn't look the same")
claimed-at: 2026-11-14T05:30:00.000Z
---

**What.** Nine scene purposes in `data/english/parts/scene-talk.json` hold fewer than 30 pieces each (protest-warning 15, betrayal-explain 16, campaign-answer 16, ally-return 17, favor-job 17, layoff-terms 19, funeral-cause 22, floor-debate 26, office-doubt 29), so a player who meets one twice reads the same scene twice, and several of them state things no record holds. One of them, funeral-cause, can never play: every line that states its request needs `{deceased}` and nothing wrote that fact. Seen: a funeral at the player's own family's loss, with the mourner naming the dead as they are to them and the cause the dead person cared about, and a different wording on a second meeting.

**Cause.** Found in code: `src/director/purpose-scene.ts` composeBinding writes no `deceased` fact (only a comment in `src/director/scheduling.ts` names it), so `scene-talk.state-request` pieces for funeral-cause cannot be worded ("the request that states funeral-cause cannot be worded from the records given"). The other eight purposes play, but with six to ten pieces per slot and lines whose claims (a police chief, an event on Saturday, a son who needs a job) the records do not hold.

**Fix.** Write `funeral-facts.ts` so a funeral reads the death record, the player's and the mourner's own family records and what the dead person did or cared about; then per purpose, in the order the played-years table sets, add lines for each spoken slot (six openings, four of each reply and follow, differing by the speaker's bearing) that read only facts the scene's packet holds, retire the lines that claim what no record holds, and run the words checks.

**Time box.** 12 hours across the nine purposes; each purpose pushed when its lines pass.

**Rules.** Wire to the world: every line names the fact it reads. Ask why: the funeral request names the record of what the dead person did. No dice: which wording plays is the speaker's bearing through the shared lean. Never raise a baseline or loosen a test; never delete a line the owner graded good (`scripts/dialogue-batch/liked-lines-kept.test.ts`).

**Done when.** A second session, on main, brings a funeral about with dev mode in a drawn place and sees the scene compose, names the fact each line reads, and meets one of the nine purposes twice in two drawn places and reads two different openings.

**Waits on.** Nothing. `law-reaches` waits for #9118.

**Files.** src/director/purpose-scene.ts, src/director/funeral-facts.ts (new), src/director/funeral-scene.test.ts (new), data/english/parts/scene-talk.json
