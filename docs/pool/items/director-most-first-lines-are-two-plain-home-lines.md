---
id: director-most-first-lines-are-two-plain-home-lines
title: "Most moments open on one of two plain home lines: 307 of 377 in two 120-day lives"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: director-street-news-scene-ends-after-its-opener
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: "Second reader's read of #9585, relayed by the Account lead, Nov 15, 2026 (owner's rule 120)"
checked:
claimed-at:
---

**What.** In two seated officials' lives of 120 days, 307 of the 377 moments the player can open begin with "It's early on <day>. You stay in." or "It's early on <day>. The house is quiet." Nearly every speech heard or retold, cause shared, vote and news story opens on the same empty home line, whatever it was about. That breaks the owner's rule 120 on varied scenes. Seen: the first line of each story and scene a moment opens.

**Cause.** Measured: the 307 is not what a player sees. It counts every moment the ledger keeps, read through /api/story, and almost none of them is ever staged. A player reads a moment's first line only when the director stages it as a scene: a stop, election night, a desk ask, or the opening (src/bench/play.mjs showStory callers at lines 671, 735, 753, 1163, 1759, 1903, 2034, 2987, 7387). Recounted over staged scenes the player was shown, played through presses on fafc6c3f: Sheridan, Wyoming (5669845), seed 7, the member person_0f713cf2e3e20027, 120 days, had 0 of 9. North Washington, Iowa (1957495), seed h1, member person_0b71588b44583992, Jan 1 to May 20, had 0 of 15: 2 floor speeches, 1 vote-ahead (it already names its bill), 6 constituent stops and 6 donor asks. File: /mnt/project-files/election-results/plain-first-lines-count.md, under "Recount".

"It's {landing}. The house is quiet." and "It's {landing}. You stay in." (scene-words.arrival-home-alone.*) can still be shown in two places, so they are not old text. 1. Every new life: the opening's landing at home after the address (src/bench/opening.ts landingLine, read by play.mjs at line 7375 and drawn by the landing function at line 1596). 2. A staged scene set at home whose cause names nothing (src/director/scene.ts arrival render). One case was seen: Sheridan, April 26, "It's early on April 26. The house is quiet. Sophie Ware has news for you." #9589 makes that moment a Journal line.

**Fix.** None to build. The Account lead ruled on Nov 16: neither the fix nor new pieces with slots, because no shown scene opens on these lines. The two pieces stay for the opening landing and for the home scene. Recommend closing this item when a second session confirms the recount at a third drawn place.

**Time box.** 3 hours for an Opus session at medium effort for the count; the build is sized after it.

**Rules.** Scene standard: a scene's first line says where you are and why, and never promises what it does not deliver. Owner's rule 120 on variance: scenes vary in setting and wording by the player's situation. No hand-written player text: new openers come from the Words lead's bank.

**Done when.** A second session plays a seated official in a drawn place, named with its seed, for three months on main. It reads every moment's first line through the screens a player reaches, and no more than half are one of the two plain home lines.

**Waits on.** The arrival part of director-street-news-scene-ends-after-its-opener (#9585).

**Files.** src/director/scene.ts, src/director/cause-facts.ts, data/english/parts/scene-words.json

**Notes.** Nov 16, election-results thread. The whole-ledger count (307 of 377, at 98f61441) split by what the cause record carries: 249 had a fact a line could name, and 52 had nothing nameable (cause.shared 43, town-hall 8, housing.purchase 1, person-birth 1). The Account lead first ruled to send the 37 bill moments to a code fix, the 184 speech moments and 30 org, office and outlet moments to new pieces, and the 52 to an item. The recount put all of it on hold: those moments are not staged, so their first lines reach nobody. No item was filed for the 52, because the record a line would read is shown to nobody. If a later change stages these causes as scenes, recount first.
