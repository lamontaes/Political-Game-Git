---
id: laws-three-yes-no-laws-reach-nobody
title: "Three laws Congress can pass change nothing for anyone: forgiving student loans, banning congressional stock trading, statehood for the District of Columbia (Marion, Mississippi)"
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
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What the code does" and "Every law in dev mode's list, tried at four bodies")
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Three yes-or-no laws can be introduced, passed and signed in Congress, and nothing in the game acts on them: forgiving student loans, banning congressional stock trading and statehood for the District of Columbia. Read in code: the audit found no part of the game that names them, and main agrees, since all three sit in the registered stopgap SG-LAWS-federal-position-no-reader ("no engine reads the law, so enacting one moves no money, person or place"). Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67), 180 days after each passed, against a twin world with no bill: the stock trading and statehood bills showed only their rider's change, and the student loan bill carried a different rider and its result matched, to the dollar, another bill carrying that rider, so the audit infers it added nothing of its own. Give each law a reader in the engine that already owns the thing it changes, for full people and counted households alike: a student loan balance on household books that forgiveness clears and whose payments stop, a rule on what members of Congress may hold or trade that their own money decisions read, and for statehood the change in who represents the District. A law the simulation cannot yet act on is taken off the list of bills a member can draft until it can, with its reason registered, so no player passes a law that does nothing.

**Cause.** Found in code: the comment and marker at src/core2/modules/laws.ts (lines 307 to 313) and stopgap SG-LAWS-federal-position-no-reader (src/core2/data/stopgaps/laws.json, line 51) list the three laws as read by no engine; src/core2/modules/credit.ts holds no student loan debt kind, though seed figures exist in data/research/credit/student-loan-debt-2026.json.

**Fix.** Add a student-loan debt kind in credit.ts and a reader for forgiveness, a reader for the stock-trading ban in the members' money decisions, and a reader for D.C. statehood (who represents the District); take off the bill list any law no engine can yet act on, with its reason registered.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a law row that no other engine reads when it decides or pays is an unregistered placeholder, and a registered one is still a law the player can pass for nothing. One model, two tiers: a balance cleared for a full person is cleared for a counted household by the same rule, times its count. Research before building: the size of a student loan balance and its payment come from a fetched source, never from memory. This is a game, not a spreadsheet: the reader moves money or a decision in the background and adds no step to the player's life. Owner, November 8, quoted by the audit: "when it finds these errors or finds that these laws don't pass, I want them fixed. I don't just want a report of everything that was broken."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows. For each of the three laws, in dev mode's Bills panel on the Government screen pick Congress as the Body, a Sponsor, the Law and the Answer Yes, press Introduce, tick Chair hears the bill, set the Margin wide enough to clear the Senate's 60-vote rule (the audit used 233 to 202 and 65 to 35) and the Executive to Signs, and press Pass. The bill page must show one section and no rider (screenshot). Run 180 days in the Run panel, then run a second game on the same place and seed with no bill for the same 180 days and compare. Each law must show a change of its own that the twin lacks, named by record id: for student loans, balances that fell and payments that stopped on named and counted households, in dollars; for the stock trading ban, a holding or trade a named member no longer makes; for statehood, the seats and the people who hold them. A law the builder could not give a reader no longer appears in the Law list, and the proof says so. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67, and a test in a drawn place for each reader. The owner plays it: he passes loan forgiveness in Congress and a household in his town stops making a loan payment, and he can see which one.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts (the comment and stopgap marker at lines 307 to 313), src/core2/data/stopgaps/laws.json (SG-LAWS-federal-position-no-reader, line 51), src/core2/modules/credit.ts, src/core2/data/legislature/bill-catalog.json, src/core2/data/laws/reach-group-a.json, data/research/credit/student-loan-debt-2026.json

**Notes.** From the Fable audit, Pillar 2. "Reach nobody" is read, not measured; the sweep's agreement is measured, and the student loan result is the audit's inference from a to-the-dollar match with another bill carrying the same rider. The audit also lists these among seven yes-or-no questions in Congress that did nothing of their own in 180 days; it names raising tariffs as another and does not name the rest. Marked done, still shows: `laws-federal-student-loan-debt-kind` (done) asked for a student loan debt kind in credit.ts and for the stopgap to lose this question. On main, Nov 10, the seed figures exist (`data/research/credit/student-loan-debt-2026.json`, `src/core2/student-loan-seed.test.ts`), but credit.ts holds no student loan, no engine reads the law and the stopgap still lists it. Overlap, not a twin: `gov-federal-questions-rule-readers` (open, priority 3, waits on `gov-federal-questions-answers-stances`) lists the stock trading ban and D.C. statehood among ten federal rule questions to give readers; the audit's evidence was added to its Notes on Nov 10. Whoever claims this item takes those two questions out of that one and says so in its Notes. The stopgap also names federal mandatory minimums, which the audit did not report on. Statehood changes representation and may be larger than this item's size; if so, split it into its own item before building, as the pool's size rule says. The bills in the sweep left with riders (see `gov-riders-added-when-every-vote-is-forced`), so until that lands the checker reads each bill's sections before trusting a pair.
