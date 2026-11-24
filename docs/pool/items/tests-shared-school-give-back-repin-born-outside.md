---
id: tests-shared-school-give-back-repin-born-outside
title: "The school give-back test re-pinned once, after birthplaces stopped being all at home"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by: civic-roles-builder
pr:
after: people-birth-outside-state-counted-twice
blocked-on:
lead: words
model: sonnet
effort: medium
source: "Red on Train a62a2fda (Nov 16) after #9538 folded; Account lead's ruling Nov 16 04:42Z"
---

**What.** `src/director/shared-school-give-back.test.ts` is red on Train a62a2fda. At its pinned seed 7952d3f3e3253ee4 (Dortches, North Carolina) the player hears 0 of the 4 school questions it needs. The test plays two days of visits to schoolmates at work, and in this world almost none of the player's schoolmates work anywhere the player can go. Seen: in the test's final count.

**Cause.** Measured: at Dortches, North Carolina, seed 7952d3f3e3253ee4, with `npx vitest run src/director/shared-school-give-back.test.ts`. The pin's premise was the stopgap under which every grown resident was born at home and schooled in the town's district: 175 of 198 adults at Dortches had been. #9538 drew birthplaces from the survey instead, and with a birth outside the state counted once (#9643), about one adult in five went to the town's schools (Dortches 20%, Seneca Falls 21%, Bynum 24%). Over 69 seeds drawn through the test's own presses, none heard more than one school question. A trace at West Hazleton, Pennsylvania (four schoolmates in reach, none asked) found rules doing their jobs: two were off shift when the player came, and two opened on news of a law or a relative and ended there.

**Fix.** Re-pin once, per the Account lead: seed f574fd270912a678 (Golden Valley, North Dakota), where a school question comes through the player's own presses. The test needs one question from a schoolmate on record, followed by the asker's give-back. The two record checks are kept with ids re-read at the new seed. The old pin and its premise go in the test's header.

**Time box.** 1 hour, Sonnet.

**Rules.** Pinned tests: the place and seed are named in the file, and nothing is drawn at run time. One rule, all 56 places: no place is named in logic, only in the test's pin.

**Done when.** The test passes at seed f574fd270912a678, and fails when `shared-school` is taken out of `givesBack.kinds`. A second session runs it on main and sees, at Golden Valley, the Golden Valley line "It's been 30 years now." after the player's reply, and in a drawn place it names with its seed hears a schoolmate's question about a school answered back.

**Waits on.** people-birth-outside-state-counted-twice (#9643).

**Files.** src/director/shared-school-give-back.test.ts

**Notes.** Filed by hand by the civic roles builder, Nov 16. Seed hunt log: /mnt/project-files/civic-roles/school-repin/.
