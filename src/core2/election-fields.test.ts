/**
 * Election fields in a played world (Dev Tester, Nov 8, for the Elections
 * session). Measured by `tsx scripts/dev-tests/elections.ts <seed> 3` in six
 * random places (Washoe Valley NV, Carolina Meadows NC, Agana Heights GU,
 * Charlotte Amalie East VI, Tamuning GU, Stanardsville VA): 43 to 85 percent
 * of contests had one candidate or none (real local races run about 35 to 45
 * percent), fields were 1 to 3 candidates almost always (7 at most; no 8 to 15
 * candidate fields), and some races had no candidate and no winner (Carolina
 * Meadows, NC: 3 of 13; the U.S. Virgin Islands: 2 of 22). Each todo below is
 * a bar for the Elections session; make it a test when the cause is fixed.
 */
import { it } from "vitest";

it.todo(
  "a race with no candidate leaves its seat with a holder: the incumbent stays or the vacancy rule runs, never a seat with no one",
);
it.todo(
  "uncontested races are about a third to two fifths of local races over a drawn place's three years, not more than half",
);
it.todo(
  "an open seat draws more than three candidates in some places: fields run from 2 to 15 and the sizes follow the place's circumstances",
);
