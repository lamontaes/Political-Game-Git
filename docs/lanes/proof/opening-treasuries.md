# Opening treasury stocks — incomplete

Pool item: world-government-opening-fund-balance. This is a partial implementation and observation, not a Built or Verified played path. State and local stocks, the fixture removal, the played year, New Game and relative timing remain unfinished.

Running Water, South Dakota (4656820), replay **3c16bfebaea9cae1**, world seed `7c8bbdbdc3d169e27abe8651447dd8cbb058d0c419e111dc86f5d5f8b617bb61`. Both observations use `buildBenchWorld` with all ordinary modules, January 20 through March 6, 2025. No law, vote, benefit or person payment is supplied by the observer.

On base `6dbda302b9605005e7eb685430e8abcf4522909e`, the completed opening has $1,903 in the federal treasury from setup collections, and zero in South Dakota and Bon Homme County. All three nevertheless pay their February and March closes without line or public-pay shortfalls. This draw reproduces missing opening stocks; it does **not** reproduce missed first-month payments.

The federal slice calibrates operating cash from Treasury's FY 2024 and FY 2025 observations, $870.8 billion and $871.9 billion. The mean and two-year range generate the fictional opening stock once; they do not choose a person's outcome. Other monetary assets are excluded. [Treasury source](https://fiscal.treasury.gov/accounting/us-financial-report/government-financial-position). The estimate remains registered under `SG-WORLD-government-opening-fund-balance`.

The corrected opening posts **$871,077,383,155.06** through the existing `accounts.transfer` writer. `journal:2025-01-20:0`, source `opening-treasury:US`, debits `cash:outside-market:jurisdiction_79f9487139aa3014:residual` and credits `cash:organization:treasury:US:residual` by equal amounts. It is opening stock, not current-year revenue or a new appropriation. The government's opening marker is read to prevent another deposit.

Ordinary spending then pays **Valerie Arnold**, `person_5943ca9e1bf2f900`, **$23**, in `journal:2025-01-21:674`, source `reach-b:benefit:snap-maximum:US|person_5943ca9e1bf2f900:2025-01-20@2025-01-21`. There are 13 captured federal payments to named people during the 45 days. This proves the funded account remains connected to spending, not that the added stock caused an extra payment; the base already paid Valerie.

The existing calendar rejects a second `openBudgets` call. The corrected observer checks that rejection after the ordinary 45 days and confirms no second deposit or journal entry. Its first attempt incorrectly expected the entire opening API to be repeatable; it stopped at `Duplicate institutional calendar key`, without changing production. The guard is retained.

Typecheck passes. Research-reader, tripwire and calibration guards pass: 3 files, 33 checks. Raw observations and the failed observer attempt remain in `/tmp/lane-2-opening-treasuries-{before,federal}.json`, the matching logs and `federal-calendar-error.log` on the builder's machine.

Research still to resolve: Census discontinued W01/W31/W61 after 2021; W61 also includes restricted holdings and securities. NASBO general-fund balances can include rainy-day reserves. Neither total can simply become freely spendable cash. The [Michigan CLOSUP March 2026 report](https://closup.umich.edu/sites/closup/files/2026-03/CLOSUP-Fiscal-Health-Local-Gov-2024-Final.pdf) supplies government-type cash and unrestricted-balance observations, but extrapolating outside Michigan must remain an estimate. Its direct download returned HTTP 403; the web connector read the primary report.
