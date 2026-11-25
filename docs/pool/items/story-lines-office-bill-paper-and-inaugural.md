---
id: story-lines-office-bill-paper-and-inaugural
title: "The bill paper's lines and the address's full parts come back"
area: words
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: Story lead, Nov 19 05:30Z on the Story thread (issue 9750), from the cut's src/english reds (#10063), filed at the CTO's word (04:53Z)
checked:
---

**What.** The cut of Nov 17 emptied the bill paper's bank and most of the address bank. The bill paper is what an officeholder reads at the desk, including the lawyer's warning on disputed authority. The address bank holds the parts of the President's, a governor's and a mayor's speeches. Seen: a member reads a bill with a legal warning, and the yearly addresses in office.

**Cause.** Measured: on the cut (#10063):

- `src/english/bill-paper-words.test.ts` fails 2 cases, both "expected null", because data/english/parts/bill-paper.json holds no lines (`CUT_BANKS` in tests/english-parts-banks.test.ts).
- data/english/parts/opening-speech.json went from 3,200 pieces on train/nov18 to 131. Story wrote the opening evening's greeting, standing, stance, reason and order lines back on Nov 19, 69 pieces. Still missing are the parts the yearly and later addresses use: occasion, oath, unity, creed, hope, pledge, the lines to Congress, the Vice President and the states, people, history, call, families, meaning, tie, question, change, subject, and the belief words that give a stance its reason.

Shown by `npx vitest run src/english/bill-paper-words.test.ts` on the cut.

**Fix.** Write the bill paper's lines in data/english/parts/bill-paper.json from the facts the paper's packet sets: the lawyer's title, the body and the authority in dispute. Then remove bill-paper from `CUT_BANKS`. Write the address parts in data/english/parts/opening-speech.json, in both voices, for every kind the speech outline asks. Take each `it.fails` mark off as its case passes.

**Time box.** 4 hours, in two writers' rounds.

**Rules.** No hand-written player text in code: every line is a bank row. A line of four words or more names a slot. A third of each move's cores are twelve words or fewer. People say how a sum feels, never the figure.

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), reads a bill paper that carries the lawyer's warning and hears a yearly address with a reason behind each stance. `bill-paper-words.test.ts` passes with its marks off.

**Waits on.** Nothing.

**Files.** data/english/parts/bill-paper.json, data/english/parts/opening-speech.json, src/english/bill-paper-words.test.ts, tests/english-parts-banks.test.ts

**Notes.** Nov 19 (Story): filed with the cut, as the CTO asked on #9750 at 04:53Z.
