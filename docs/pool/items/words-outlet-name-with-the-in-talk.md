---
id: words-outlet-name-with-the-in-talk
title: 'A newspaper''s name is said with "the" in talk ("the Sheridan Enterprise says")'
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
source: Found while building #9279 (election results brought up in talk), Nov 14
---

**What.** Seen: talking to a neighbor after a count, the player hears "Sheridan Enterprise says Mark Mueller won." and replies "I saw that on Astoria Dispatch."; a paper's name is said without "the" in the middle of a sentence. Names that already start with "The" ("The Porchlight") read right.

**Cause.** Found in code: src/director/bring-it-up.ts `nameOf` returns `organizationName(org)` (src/director/words.ts), which is `properName(org.name)` for an outlet: the outlet's drawn name with no article. The same fact fills `{subject}` in every line of data/english/parts/bring-it-up.json ("I read in {subject} about {topic}.") and the outlet slot of the player's news replies in data/english/parts/conversation.json ("Yes, {outlet} had it."). Measured: Sheridan, Wyoming (5669845) and Astoria, Oregon (4103150), worlds opened Oct 27, 2026 and run to Nov 10 (/mnt/project-files/words-lead/8831/part1-lines.md).

**Fix.** Give an outlet's name its article where the name is spoken mid-sentence: one rule in `organizationName` (or the press module's own outlet name reader) that adds "the" to a newspaper's name that does not already begin with it, read from the outlet's kind record, never a list of names. A sentence-start "The" is capitalized by the renderer as it is now. Where the player sees it: every line that names a paper in talk.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No line changes in the banks; the fact's text changes. Every place: the rule reads the outlet's record, never a name.

**Done when.** A second session, on main, talks to neighbors in a drawn place after a paper prints, and every paper's name said mid-sentence reads "the <name>" or "The <name>", never a bare "Sheridan Enterprise says".

**Waits on.** Nothing.

**Files.** src/director/words.ts, src/director/bring-it-up.ts, src/director/conversation.ts
