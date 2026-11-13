# A law that does not reach the reader is said as what it is

Ruling: Fable A on the crew line, Nov 13, 04:04Z: "the law-reaches tell always has words, from three record facts. 1. Enacted, not yet in force: said with its date. 2. In force in another state: said with that state and the reader's own. 3. In force where the reader lives: the lines that exist today. A reader never speaks of a law that does not reach them as if it had changed their own pay, rent or prices."

The red on main this answers (Red desk, Nov 13, `circumstance.test.ts`, seed `93ab4181cd158fb9e2b9f5f19ae6e8526180c322`): "the tell that states law-reaches cannot be worded from the records given", for `person_1b827590d2511e7b` (a printed `law-enacted` story about `law:US-OR:federal:snap-maximum:general:2026-10-01`, enacted but not yet in force) and `person_a4b9e7e29d4b6509` (a `law-took-effect` story about a Delaware law, heard in another state).

The tell as worded from the laws engine's own rows in three drawn places (`src/director/law-reaches-tell.test.ts`):

| Place (seed)                      | Not yet in force                                                                               | Another state's law                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Ashaway, Rhode Island (`w2lr1`)   | The Social Security payroll tax rate doesn't start until January 1, 2026.                      | Delaware did that, not Rhode Island.                          |
| Claypool Hill, Virginia (`w2lr2`) | The Social Security payroll tax rate doesn't start until January 1, 2026.                      | Delaware did that, not Virginia.                              |
| Nu'uuli, American Samoa (`w2lr3`) | Nothing changes before January 1, 2026, but I read about the Social Security payroll tax rate. | That's a law in Delaware. It doesn't apply in American Samoa. |

The played case is `circumstance.test.ts` at seed 93ab4181. On this machine one run of the whole file passed 100 minutes without finishing (the merger saw the same), so the played check is CI's unit job.
