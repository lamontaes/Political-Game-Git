---
id: laws-three-federal-budget-lines-reach-nobody
title: "Three federal budget lines pay nobody in the played world: community development, veterans and foreign affairs"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What the code does")
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Congress can raise or cut three federal budget lines and nothing in the game acts on the change: community development, veterans and foreign affairs. This is read in code, not measured; the audit found no part of the game that names them, and the law sweep in Marion, Mississippi (seed 7df73e53cd67) set budget lines to 1 of their unit, which proves only that such a bill passes. On main the three lines exist as data only (`communityAndRegionalDevelopment`, `veterans` and `internationalAffairs`), and no engine names any of them. The one payer every line shares, the treasury's monthly close, pays the part of a line that leaves the town to the town's outside account, split among groups called recipients elsewhere, so a raise on these lines moves federal money to the outside account and reaches no person, business or government in the played world. Give each line a reader in the engine that owns what the line buys: veterans' benefits paid to veterans (the population keeps no record of who is one today, so that fact comes first, from real counts by place and age, for full people and counted households by the same rule), community development grants paid to the governments and builders that carry out the work, and foreign affairs spending that a named engine reads when it decides or pays. A line the simulation cannot yet act on is taken off the list a member can draft, with its reason registered. Seen: the bill card and the News for a federal budget, which should name who the money for veterans, community development and foreign affairs reached.

**Cause.** Found in code: no .ts file under src/core2 outside tests names the keys `communityAndRegionalDevelopment`, `veterans` or `internationalAffairs` as budget lines; they appear only in data (src/core2/data/budgets/line-names.json, src/core2/data/budgets/spending-payees.json, src/core2/data/legislature/bill-catalog.json), and the generic line payer in the monthly close of src/core2/budgets-treasury.ts pays each line to a firm in town that won the work or else to the outside account by the shares in spending-payees.json.

**Fix.** Research who each line pays and give a reader that pays named people or businesses (veterans benefits, development grants); counted veterans same rule times count.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a budget line is finished only when one dollar of it is followed from the treasury to a named person or business and back out, by record id. An effect is a read, not a record: a line whose money only lands in the outside account is read by nobody. One model, two tiers: a benefit paid to a full veteran is paid to counted veterans by the same rule, times their count. Research before building: who a line pays, and how much each, comes from a fetched source. Owner, November 8, quoted by the audit: "they've got to spend money... They should be passing stuff."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows. For each of the three lines, introduce a one-section bill in Congress that raises the line by a tenth: in dev mode's Bills panel on the Government screen (Body, Sponsor, Law, Value, Introduce) once its Law list offers spending lines, or, until it does, by taking a seat in Congress through Advanced, Play as, and drafting the line from Your office. Force the vote with dev mode's own controls (Chair hears the bill, a Margin wide enough to clear the Senate's 60-vote rule, Executive: Signs, Pass). The bill page must show one section (screenshot). Run 180 days in the Run panel, run a second game on the same place and seed with no bill for the same days, and compare every cash account in the two worlds, with each payment named by its own label. The extra dollars must land on named accounts in the played world, by record id: a veteran's household for the veterans line, a government or a business that won the work for community development, and for foreign affairs the payee the reader names. Where the drawn place holds none of a line's recipients the proof says so from the place's records and draws again. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67, and a test in a drawn place for each line. The owner plays it: he votes to raise veterans' spending in Congress and a veteran in his town is paid more, and he can see who.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts (the line payer in the monthly close, lines 1470 to 1560), src/core2/data/budgets/spending-payees.json (lines 108 to 125), src/core2/data/budgets/line-names.json, src/core2/data/legislature/bill-catalog.json (`budget:federal:communityAndRegionalDevelopment`, line 941; `budget:federal:veterans`, line 2284; `budget:federal:internationalAffairs`, line 2324), src/core2/law-reach/group-b.ts (`runBudgetLine`, line 884)

**Notes.** From the Fable audit, Pillar 2: "Nothing acts on three federal budget lines either: community development, veterans and foreign affairs" (read). Checked on main, Nov 10: a search of every `.ts` file under `src/core2` outside tests finds none of the three line keys; they appear in `budget-line-axes.json`, `line-names.json`, `spending-payees.json`, `bill-catalog.json` and the office-day data. One thing the audit's wording leaves out: the lines are not wholly inert, because the generic line payer in `budgets-treasury.ts` pays every line's planned amount each month, to a firm in town that won the line's work where there is one and otherwise to the outside account by the shares in `spending-payees.json`. So the defect is that the money reaches nobody in the played world, not that no payment is made. Also checked: no `.ts` file under `src/core2` records a person as a veteran, so the veterans line has nobody to pay until that fact exists. And dev mode's `introduce` (`src/bench/dev-mode.ts`, line 735) builds only an amount or a yes-or-no section, and its law list (`lawSeriesCatalog`, line 252) leaves out the bill catalog's 23 budget-line policies, so on main a spending line cannot be introduced from the dev Bills panel; I could not confirm from the code how the audit's sweep introduced budget lines. Not measured by the audit: any dollar figure for these lines. Related: `laws-budget-lines-and-local-powers-pass-but-money-not-followed` (the same money trace for every budget line), `gov-federal-questions-rule-readers` (open; its Notes say defense spending and foreign aid are budget lines and may belong with the money readers), `office-budget-line-reaches-pay` (open).
