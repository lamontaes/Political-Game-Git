# The bill screens (play-vote-and-bill-screens-redesign, bill half)

Bench 1440×900, Brookside, Delaware (County of New Castle commission), seed `4d50e1f88df997f9`. Replay: `BENCH_SEED=4d50e1f88df997f9 SHOTS_DIR=<dir> node src/bench/bill-screens.browser.mjs`.

- `draft-before.png` (main): the draft line is a dropdown named by its group ("Highways"), a bare 0 and Draft; no current amount, no unit.
- `draft-after.png`: a Draft a bill card: the issue, "In force today 0%" beside "The new amount 2 %", and Draft.
- `paper-before.png` (main): the paper's estimate reads "Highways ... to $0.00 · Budget line · no pay effect"; today's amount is nowhere.
- `paper-after.png`: the estimate card shows today's amount beside the new one: "In force today 37% top rate → The bill makes it 2% top rate".

Where it still differs: (1) The card and the paper now say one thing: both read the law in force through the chain (`lawInForceRow`, the row a bill's section cites), checked by `bill-screens.browser.mjs` on Fife, Washington (sales tax 6.5% both), East Dorset, Vermont and Broomtown, Alabama. That value is the first level of the chain that holds a row (for the income tax in Brookside, the federal 37% top rate, not the county's own 0%); whether "before" should be the bill's own level is a records question for the laws lead. (2) A budget-line bill has no "today" amount because the body's catalog holds none for the line (`inForce: null`), so its estimate shows the new amount only. (3) The paper's layout is the existing two-column document; the owner's "illustrated bill paper you click part by part" (Oct 26) is only the section buttons plus this card.
