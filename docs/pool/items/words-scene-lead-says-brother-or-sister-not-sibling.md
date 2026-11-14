---
id: words-scene-lead-says-brother-or-sister-not-sibling
title: "A scene names a nonbinary sibling as sibling, and the owner may want another word"
area: words
kind: bug
priority: 3
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
source: replay of the manager offer scene, Nov 14 2026
checked:
---

**What.** In Stony Creek VA (world seed 8f24b411dde6c73638211e2756d6f3899707979906e0ceff6fd58e6e4144ef03, seed `q4`) the manager-offer scene opens "Your sibling wants to talk about running your campaign." The coordinator's read: nobody says sibling in speech. Seen: the lead names a nonbinary brother or sister with the word the owner picks.

**Cause.** Found in code: `relationPhrase` in src/english/journal-words.ts picks the word by the relative's `looks.gender` and falls to the `other` form ("sibling", from src/director/data/journal-rows.json) when the gender is not female or male. The scene's lead reads that phrase at src/director/scene.ts line 143. Measured Nov 14: the asker in that world (Dakota Sutton, person_16c41af51ea0c69a) has `looks.gender` nonbinary, so the neutral form is what the record says; in Patrick AFB FL (seed `q3`) the asker is male and the lead says "father" correctly.

**Fix.** A design call for the owner, asked by decision card with the reading line: what a scene calls a nonbinary brother or sister (the neutral form today is "sibling"). If he wants a different word, change the `other` forms in src/director/data/journal-rows.json for every relation in one pass, not only sibling.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Plain American English; the word comes from the record, never from the bank. Review: words.

**Done when.** A second session plays a campaign in a drawn place (Stony Creek VA, seed `q4`, is the case where the asker is nonbinary) and sees the manager offer's lead name the asker with the word the owner chose.

**Waits on.** Nothing.

**Files.** src/director/scene.ts, src/english/journal-words.ts, src/director/data/journal-rows.json

**Notes.** Raised by the coordinator from the second reader's read of #9158.
