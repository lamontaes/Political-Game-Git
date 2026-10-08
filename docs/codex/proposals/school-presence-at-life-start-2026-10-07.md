# School presence at life start: a proposal for the CTO

HOLD: needs CTO design call. This draft is kept out of the merge loop.

Nothing in the game put a child in a room with a classmate. The opening scene list is empty, the corridor beat is withheld, and a child's life began at home. This proposal places a pupil whose first moment falls in class at their school, with the same-grade pupils the enrollment records hold. In 6 random places, 4 pupils began with classmates in the room and a school conversation open to them, and 2 began alone in an empty class, which is true of those schools.

## What I found

- A child's start was always "at home". The school week is already recorded: school staff work the weekday school hours, and a shared school calendar says when a term is in session.
- The school conversation (`schoolConversationRoom`) and the school scene context both read recorded school presence, and tests had to write it by hand because no producer did.
- Classmates arrive late. The opening brings in more people after the start placement runs, so placing the pupil early found 1 to 2 classmates where 3 to 4 exist at the end. The pupil is now placed last, after the opening finishes.

## The rule

A pupil is in class at a moment when they are enrolled in a school program, a term is in session on the shared calendar, it is a school weekday, and the moment is inside the school day. Their classmates are the alive pupils in the same grade, in class, who share a school with them on the education record. Nothing is drawn. A shift outranks class, as it already does for whereabouts.

## The watched lives

Each life is drawn from the 56 places by seed, sharing a home. The start moment is 9:10 a.m. on Monday, January 5, 2026, inside the school term.

| Seed            | Place                                 | Age | Where the player starts             | Classmates in the room | School conversation |
| --------------- | ------------------------------------- | --- | ----------------------------------- | ---------------------- | ------------------- |
| h1-school-6-1   | Kokomo, Indiana                       | 6   | Cedar Grove Elementary School       | 3                      | open                |
| h1-school-10-2  | Chena Ridge, Alaska                   | 10  | Chena Ridge Elementary School       | 4                      | open                |
| h1-school-15-1  | Belle Vernon, Pennsylvania            | 15  | Chestnut Hill High School           | 1                      | open                |
| h1-school-17-2  | Winn Parish, Louisiana                | 17  | Winn Parish High School             | 1                      | open                |
| h1-school-10-1  | San Vicente, Northern Mariana Islands | 10  | San Vicente Elementary School       | 0                      | none                |
| h1-school-17-1  | Uintah County, Utah                   | 17  | Rolling Hills High School           | 0                      | none                |
| h1-school-adult | Schoolcraft, Michigan                 | 34  | not at school (no pupil enrollment) | none                   | none                |

The two empty classes are real: nobody else of that grade is recorded at that school. A Saturday, a 6:30 p.m. Monday and a July morning are not class for the 10-year-old in Alaska.

## What emerged

- HARDWIRED, `src/simulation/living-world/school-presence.ts`: the pupil rule above, from the enrollment record, the shared school calendar and the school week.
- HARDWIRED, `src/presentation/opening-school-location.ts` and the end of the opening in `src/presentation/opening-life.ts`: the start arrival at school, with the classmates as participants. A legacy replay descriptor places nobody, as before.
- DECIDED by the records: which pupils share the school and grade, and whether a shift or the calendar takes the pupil out of class.

## Decisions for the CTO

1. Is "grade" the right class? Same grade at the same school is a classroom, and it keeps a high school's whole building out of the room. A school with one pupil on record per grade leaves the room empty.
2. A school day is the weekday 7:30 a.m. to 3:30 p.m. pattern the school staff work, and the 40-week calendar has no winter break. Should enrollment or the district carry its own hours and breaks?
3. Should a child's later school days record presence too, as the travel writer would? That is the real fix after the first morning, and it is not built here.
4. Overlap with #3054 (home presence): its in-class test for housemates ignores the term and the grade rule. If both land, it should call this module.

## VITAL STATISTICS

- Tests added: a generated-world test over four classes, two empty schools, a quiet-hours case and an adult, 8 of 8 passing (seeds and places above).
- Typecheck, eslint, prettier, the release check and zero-dice pass on the changed files.
- Knock-on: I ran 12 test files that begin a full life at a child's age. They fail the same way with and without this change: 42 of 102 tests in the nine fast files and 7 of 16 in the other three. They were red on main first, so this change did not cause them.
