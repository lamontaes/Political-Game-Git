---
id: play-a-moments-second-scene-is-skipped-unless-the-first-ends-on-a-bare-reply
title: "When one moment stages two scenes, the second plays only if the first ended on a reply nobody answered, so the talk at home after filing is skipped"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
milestone: play-first
model: sonnet
effort: medium
root: rc2-done-from-records
source: Words builder W5's message to the lead, Nov 11, 2026 (the talk at home after the petition scene never came in plain play), then the lead's reading of the page
checked:
claimed-at:
---

**What.** A moment can stage more than one scene: after the player files, the petition scene plays and then the family talks about it at home. In plain play the second scene almost never comes. It plays only when the first scene ended on a reply of the player's that the other person did not answer. When the first scene ends on the other person's last line, as most do, the page closes the talk and the staged second scene is left behind. W5 built the talk at home after filing (pull request #8803) and could show it only through the tests. This is on the player's path: file for office, then hear what the household makes of it. Seen: file at the counter in a new life at 1440x900 and go home; the petition scene ends and the talk at home opens after it, without a click on anyone.

**Cause.** Found in code: `playExchange` in src/bench/play.mjs (line 2241) calls `nextScene(story)` in one place only, inside the handler of a chosen reply and only in its `else` branch, when that reply has no `next` (line 2286). A branch that ends on a node with no replies (the asker's closing line, `node.end.close`) never reaches it, and neither does a scene that is its narration alone. `nextScene` (line 2295) itself is right: it asks the server for the moment's story again and shows it when its type differs from the one just played.

**Fix.**

1. In src/bench/play.mjs, one function ends an exchange, whatever its last line was: it is called when a chosen reply has no `next`, when a node arrives with no replies, and when the narrator's Continue closes a scene with no talk. It waits for the reply the game is keeping, then calls `nextScene`.
2. `nextScene` keeps its test (a different type than the one just played), so a scene never plays twice.
3. A browser check files for office in a drawn place, plays the petition scene to its end by the first reply each time, and fails unless the talk at home opens next; a second run takes a path that ends on the other person's line.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record (owner, Oct 13): a scene the director staged and the page never opens is a record nobody reads. No hand-written player text in code: the change adds no words. One rule, all 56 places: the check draws its place and names it with its seed.

**Done when.** A second session, in the running game on main at 1440x900, starts a new life in a drawn place it writes down with its seed, files for a local office where that place files, and goes home. The petition scene plays, and when it ends the talk at home about the filing opens after it with no click, whichever reply ended the first scene (it tries two paths). The new browser check in src/bench passes on a fresh bench, and fails with the one call put back where it was.

**Waits on.** Nothing. Pull request #8803 (the words of the talk at home) is what plays second; the check can run against any moment with two scenes until it merges.

**Files.** src/bench/play.mjs, src/bench/second-scene-plays.browser.mjs (new)

**You will see.** The petition scene ends, and your father is already asking who will mind the house while you run.

**Screenshot.** The talk at home after filing, opened by the game itself, in a drawn place, with the scene before it.

**Notes.** Written by the lead (Fable B), Nov 11, 14:12 UTC. Related: director-a-waiting-scene-is-never-played (W7, a scene that waits and never opens) is a different fault; this one is a scene that is ready and is dropped by the page.
