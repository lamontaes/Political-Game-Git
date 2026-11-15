---
id: parties-hold-conventions-where-their-rules-do
title: "Parties hold conventions where their own rules hold them, with a keynote speaker chosen from the party's people, so a keynote is a real occasion"
area: elections
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "owner, Nov 15, 2026, 02:27Z (a keynote at a partisan national convention, 10 to 20 clicks); Account lead's scene build-out (the build-out's rulings-and-briefs, section 1, in the project's shared files)"
model: fable
effort: medium
root: none
---

**What.** The owner, Nov 15 02:27Z: "if I'm doing like a keynote speech for a partisan national convention in the game, that might end up being, you know, 10 to 20 total clicks". No engine holds a convention, so there is no occasion for that speech. Seen: the convention as an occasion on the calendar and in the paper, the invitation to speak when the party picks the player, and the keynote itself built in 10 to 20 stages.

**Cause.** Design: docs/coordination/prior-rulings/elections.md lines 105 to 114 (R15 and R16, Sept 28): conventions "happen only when real actors (sponsors, parties, campaigns) set them up", and "no fake debates or conventions in any place without a real producer"; the owner's ask of Nov 15 02:27Z. Found in code: src/core2/modules/parties.ts keeps each party's `nominationMethod` from data/research/elections/party-nomination-rules-2026.json, which lists only primaries (48 party primaries, top-two in 2, top-four in 1, none for 5 territories) and no conventions; src/director/speech-builder.ts fixes a speech at four stages (`SPEECH_STAGES`, line 39).

**Fix.** Research first (researcher skill): which parties hold conventions and when, national (every presidential year, each national party) and state (a state party's own convention where its rules or state law use one), with citations, into the party research data, never a state named in code. The parties engine then writes a convention record for each one (party, level, dates, place) and its program: the speakers the party's leaders choose from their own people, read from the record (office held, standing in the party, the leaders' ties to them, how the person's views sit with the party's). A person asked can say no. The player, when chosen, gets the invitation as a scene and the keynote as a speech whose stage count comes from the occasion (the speeches thread's stages-by-occasion change). Delegates and nominations are out of scope unless the research shows a convention the game's elections need.

**Time box.** 8 hours: research (Sonnet, 2 hours) and the engine record and speaker choice (Fable design, Sonnet build).

**Rules.** No fake convention: only from the research data and the party's own records. No dice: the speaker is chosen by the leaders' reasons, never drawn. One rule, all 56 places. A played year stays under two minutes: the program is chosen on the convention's date, not daily.

**Done when.** A second session, on main, in a place drawn from all 56 and a seed nobody chose, plays to a presidential year and sees each national party's convention on its dates, the paper's story, and the keynote speaker named with the leaders' reasons by record id; in a world where the player is the party's pick, the invitation scene plays and the keynote runs 10 to 20 stages.

**Waits on.** The speeches thread's change that sets a speech's stage count by occasion (step 4 of the scene build-out plan).

**Files.** src/core2/modules/parties.ts, data/research/elections/party-nomination-rules-2026.json, src/director/speech-builder.ts, src/core2/modules/speech.ts
