---
id: ui-person-card-closeness-band-word
title: "A person's card still says how close you are in a band word, which the owner ruled out"
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
lead: words
model: sonnet
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, while reading what a colleague's card shows (Account lead asked for the item)
---

**What.** When the player opens a person who has a tie to them, the card's first line under what they share is a band word for how close they are: "You barely know each other", "You know each other", "You are friendly", "You are close" or "You are very close". The owner ruled this out on Oct 29 (docs/coordination/OWNER-DECISIONS.md line 385): "No scale of what someone thinks of you, anywhere... none of that how close you are bullshit." That ruling bans any "bar, meter, scale, number, colored dot or band word for how a person feels about the player, on any screen". A relationship shows as what they are to you, what you share, what happened between you, and how they act and talk. The CTO took the bar off the card then; the band word stayed. Seen: open any colleague, coworker or neighbor on the bench's person card.

**Cause.** Found in code: src/bench/play.mjs:2645 maps the tie's `level` onto `labels.closenessWords` (src/bench/data/controls.json:204, five words), and line 2670 puts it first in the card's shared lines. The "Grew closer / Grew apart" change line just after it (`labels.tieChange`, from the tie's `latestChange`) is the same scale told as a direction (Words lead, Nov 15).

**Fix.** Words lead's ruling (Nov 15, from the same Oct 29 ruling): nothing takes the band word's place. Delete the band-word line and the five-word `closenessWords` list. Delete `tieChange.closer` ("Grew closer") and `tieChange.apart` ("Drifted apart"), which are the same scale told as a direction. The change line stays as the event only: "Last in touch", its cause and when, for every tie whichever way it moved. The cause list (`tieCauses`) holds only events and arrangements (a visit, care in a hard time, working together, sharing a home, being family), no feelings. No new wording is written in code.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** Player-screen text: words come from banks or controls, never typed in code. Replace, never layer: the list and the line are deleted, not hidden.

**Done when.** On the bench at a drawn place, the person card of a colleague the player has a tie with shows no band word for how close they are, and the card still shows what they share and what happened between them; a second session sees it in the running game.

**Waits on.** Nothing. Proof for the Words lead's stamp: the card for three people (kin, a friend, someone barely known) at the exact sha, as screenshots.

**Files.** src/bench/play.mjs, src/bench/data/controls.json
