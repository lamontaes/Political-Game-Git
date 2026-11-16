---
id: words-group-plural-name-then-it
title: 'A group named in the plural is followed by "It wants ..." in the same endorsement story'
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
root: none
lead: words
model: sonnet
effort: medium
source: Views thread, Nov 15 (the second reader's read of #9466's played file)
---

**What.** At Marshfield, Massachusetts (2538820), world seed 75d9b7ad, on Oct 13, 2025, WLBZ-TV printed "Citizens for Rental Rules endorse Judith York" followed by "It wants a lawyer for tenants facing eviction." The headline treats the group's name as plural, and the next sentence calls it "It". Seen: the News, in a cause group's endorsement story.

**Cause.** Needs cause. Looked at: the printed text only (played file /mnt/project-files/words-lead/9466/played-editorials.md). The `endorsement` builder in src/bench/printed-words.ts passes `plural-subject` for a founded group's plural name and passes the group's purpose as `work`; whether the piece that words `work` reads the plural flag is not checked.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** No hand-written player text in code: a new piece goes to the Story session. Ask why, by record: name the story id and the piece ids that printed both sentences.

**Done when.** A second session, on main, in a drawn place (place and seed named), plays to a group's endorsement printed with a plural name and reads a second sentence that agrees with it.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts

**Notes.**
