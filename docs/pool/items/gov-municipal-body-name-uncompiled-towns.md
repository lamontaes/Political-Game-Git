---
id: gov-municipal-body-name-uncompiled-towns
title: "A town whose charter is not compiled names its council by the common name for its form of government in its state"
area: gov
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/offices-local.ts names a municipal body after the town plus "Council" unless the town is one of the 144 compiled municipal governments, whose readers now carry the charter's body name. The player sees this name on the Government screen and in every council scene. Source the common names by form of government and state (council, board of aldermen, commission, board of selectmen, village board, select board) from the Census of Governments and state municipal leagues, put them in the municipal data as ESTIMATED by form and state, and read them where no charter is compiled. Closes or narrows SG-GOV-municipal-body-name.

**Rules.** Estimate, never UNKNOWN: an uncompiled town's body name starts from the common name for its form of government in its state, marked ESTIMATED with its source. One rule, all 56 places: the names live in data by state and form, never in logic. No hand-written player text: the name is record data the screen shows.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place that is not compiled and a seed named in the PR body, the municipal body record's name comes from the state-and-form table, a test in src/core2/offices-local.test.ts checks a New England town gets a select board where its state's data says so, and a screenshot of the Government screen shows the name.

**Files.** src/core2/offices-local.ts, src/core2/offices-local.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the compiled-charter half was done in gov-municipal-body-name-from-charter; this is the remaining case of the open row SG-GOV-municipal-body-name.
