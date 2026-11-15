---
id: words-slogan-cause-takes-only-the-coalition-form
title: "A group whose cause is itself a slogan takes only the Coalition form"
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
root: rc2-done-from-records
source: "Words lead's stamp on #9137, Nov 14, 2026: slogan causes should take only the Coalition form; filed by F5"
checked:
---

**What.** A stance group is named from the cause its side would put on a sign. A cause that is itself a slogan ("No Income Tax", "America First", "One Rate for Everyone", "Keep Groceries Tax-Free") reads wrong inside a form that says "for": "Citizens for No Income Tax", "Neighbors for America First". Seen: the names the namer makes for those causes, listed in /mnt/project-files/words-lead/9137/every-name.txt.

**Cause.** Found in code: `stanceGroupName` in `src/english/group-names.ts` pairs every cause with every form in `data/english/group-names.json` `stanceForms`, skipping only a form that says "for" when the cause holds "for". The bank (`data/english/group-causes.json`) does not say which causes are slogans, so nothing keeps them out of the "for" forms.

**Fix.** Mark each slogan cause in `data/english/group-causes.json` (a `slogan` list per question and side, written by the Words lead, as a class: any cause that is a slogan, not only these examples) and have `stanceGroupName` give a slogan cause only the "{cause} Coalition" form. If that name is taken in the town, the group takes its other cause. Add a test over the catalog: no slogan cause appears inside a "for" form, and every question and side still gets a name, distinct in a town of all 160 groups.

**Time box.** 1 hour for one session.

**Rules.** No hand-written player text in code: the slogan marks are data. The two causes of each side stay the Words lead's.

**Done when.** A second session plays a campaign in a drawn place, named with its seed, where a group formed over a question whose side has a slogan cause endorses a candidate, and reads News: the group's name is the slogan with "Coalition" after it, never a "for" form. The catalog test passes.

**Waits on.** #9137 folded; the Words lead's slogan marks.

**Files.** src/english/group-names.ts, src/english/group-names.test.ts, data/english/group-causes.json, data/english/group-names.json
