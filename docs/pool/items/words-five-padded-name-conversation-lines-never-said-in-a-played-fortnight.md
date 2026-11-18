---
id: words-five-padded-name-conversation-lines-never-said-in-a-played-fortnight
title: "Show five player-news and own-view replies said in a talk, then take their names off"
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
source: Account lead thread, Nov 14, 2026: five of the fourteen padded-name conversation lines could not be shown said, so they stayed out of the padded-name pull request
checked:
---

**What.** Five conversation.json replies still say the listener's name at their end and have never been shown said in a played talk: "I'll be okay, {first}. Thanks.", "I'll be careful, {first}. I promise.", "Somebody has to run for {office}, {first}.", "You think it's a mistake, {first}?" and "We'll have to agree to disagree, {first}.". The second reader stamps only lines seen said at the exact head, so they stayed out of the pull request that took the other nine off. Seen: in about thirty drawn-place runs (the home-talk fortnight with the player's job offer taken, and a day-by-day circle walk that presses these replies whenever offered) none of the five was ever offered.

**Cause.** Found in code: the player-news replies are gated on `stance-worry`, `stance-steady` and `office`, which `playerNewsFacts` in `src/director/conversation.ts` sets only from a loss (a job lost, an election lost) or a filed or civic mark on the player's ledger, by the housemate's tie and risk trait (`PLAYER_NEWS.stances` in conversation-rules.json); a fortnight of good news (a job taken) gives glad, tease and proud only. The own-view "agree to disagree" reply is offered only after an own-view question the other person answers with the opposite view.

**Fix.** Bring each moment about through the game's own path at one named place and seed: the player files for an open race (the filing route) with a cautious parent or partner at home, and the player loses a job or a race with a cautious parent or partner at home. Show each reply said, then take the name off in the same pull request; any that no path reaches comes out of the bank as unreachable.

**Time box.** 2 hours, Sonnet.

**Rules.** Follow the standing rule "Wire to the world" and the other standing rules in AGENTS.md; no line text changes except the name, and the second reader stamps at the exact head.

**Done when.** At a named place and seed, each of the five is shown said in a talk through the game's own route and the names are off the five lines. In three drawn places (name each place and seed), the played fortnight offers the worry and steady replies after a loss. A second session, on main, plays the same and sees them without the name.

**Waits on.** The padded-name pull request #9337 folding into the train.

**Files.** data/english/parts/conversation.json

**Notes.** Result on branch claude/project-thread-nue48y-p9: three of the five are shown said at that head (Sherrodsville, place key 3972242, world seed "scan-25", fixed after scanning seeds scan-1 to scan-30 for a home with two risk-low parents; the engine entered the player in the 2025-11-04 races and the player lost, and the housemates' talks offered the replies: "Somebody has to run for Mayor.", "You think it's a mistake?", "I'll be careful. I promise."). "I'll be okay. Thanks." keeps its name because it is a thank-you. "We'll have to agree to disagree." was not reached by play (own-view exchanges with opposite views did not offer that variant in the runs) and is deleted; it was one of eight variants of the same reply. The player's own filing press was not used: the filing route showed no open contest for the player at game start.
