# Hamburg: Congress passes a rule, then repeals it

Congress enacted a Medicaid work requirement and later repealed it. New Jersey's original answer returned after the repeal, including when the older opening law's January 2027 phase was queried. Both bills have native bill-paper screenshots.

Hamburg, New Jersey, place `3429220`, replay `8d5e52aae98296b1`, world seed `8d7626e2436513a931b1b81a4ac846ecda301b2b4ffb642a4544f941d44d0155`. This is the same drawn place as the [state reversal](../law-levels-state-reversal-2026-11-07/README.md), in a separate new game.

| Bill | Passage / effective date | Senate | House            | Result                             |
| ---- | ------------------------ | ------ | ---------------- | ---------------------------------- |
| S. 1 | January 21 / 22, 2025    | 95–5   | 409–25, 1 absent | Federal Medicaid rule governs      |
| S. 2 | January 22 / 23, 2025    | 63–37  | 261–174          | Original New Jersey answer returns |

President Teresa Robinson signed both bills through the ordinary executive desk. Senator Julie Kim sponsored them. The restored record is `law:US-NJ:state:us-policy-positions:health-human-services.medicaid-work-requirement:general:starting`. The federal records are `law:US:federal:us-policy-positions:health-human-services.medicaid-work-requirement:general:2025-01-22:S. 1` and its repeal `law:US:federal:us-policy-positions:health-human-services.medicaid-work-requirement:general:2025-01-23:S. 2`.

[Enactment paper](enact-paper.png) and [repeal paper](repeal-paper.png) come from Politics → Your office → Read the bill after passage and signature, before each effective date. The [enactment decision](enact-decision.png) and [repeal decision](repeal-decision.png) show the bottom of each paper after scrolling past the long roll call. S. 2 says the Medicaid work requirement is repealed and identifies S. 1 as the amended law. [Records](records.json) retain the writer output, law-reader answers, actual roll calls and signatures. The current whip estimate differs from the recorded vote; the table above uses recorded votes.

The route uses ordinary new-life generation, `draftBill`, `offerDeal`, `holdVote`, the executive desk and the game clock. It inserts no laws, votes, members, preferences or voting weights. It is an engine-driven played route with native browser proof, not a claim that every action was clicked. Each opposing member receives at most one offer to back that member's item per bill, through the existing negotiation engine. Acceptance and chamber votes are the engine's decisions; accepted offers create the usual obligations. S. 1 had 326 offers, 296 accepted; S. 2 had 249 offers, 38 accepted. The president lets the existing nomination engine select cabinet nominees to settle the office's nomination decision before switching characters.

The compromises matter: S. 1 also repeals the modeled SNAP work-requirement question; S. 2 also lowers the federal income-tax rate from 37 to 36 percent. They remain in the records and paper. Earlier single-policy and swapped-policy attempts lost; nothing was tuned to make those votes pass. The papers expose existing wording gaps: the federal tax is called “local income tax,” the SNAP question says “cash assistance,” and a repeal's generic title still says “require.” The actual sections, jurisdictions and law records establish the actions; this proof does not fix those English templates.

The Medicaid mandate's preemption source remains Public Law 119-21 § 71119, codified at [42 U.S.C. § 1396a(xx)(1)](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1396a&num=0&edition=prelim). The shared resolver applies the requirement while enacted and releases the lower answer on repeal. This proves New Jersey's return to its recorded no-requirement answer; it does not establish unilateral state authority to impose Medicaid work conditions without a federal waiver. Opening researched laws remain carried into the game's January 2025 start under the existing baseline; this is a simulated legislative reversal, not a claim that these historical votes occurred.

Reproduce from the repository root:

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 LAW_PROOF_OUTPUT=/tmp/law-levels-congress-proof node --import tsx scripts/law-levels-congress-proof.ts 8d5e52aae98296b1
```

Playwright Chromium must be installed; set `PLAYWRIGHT_BROWSERS_PATH` when it uses a custom directory. The script writes both screenshots and full records under `LAW_PROOF_OUTPUT`, asserts both enactments and restoration, then exits. `--serve` keeps the bench running; without a replay argument it draws a fresh place and a losing vote fails the proof. The committed replay passed on main-derived code after #7321–#7324 merged. This proof-only change adds no annual simulation work. Exhaustive starting-law repeal coverage and federal authority for the remaining policy questions are still open.
