# M1-jobs: openings, hiring, quitting and layoffs

**Contract:** M1-04 in `docs/roadmap/features.json`. Over a year in a random place, unemployment, hiring and quitting stay within real ranges (federal job-turnover data), and every job change on record has a reason. This work order also emits the job-loss events M1-11 turns into drives.

**Builder:** a new Codex session, CODEX-JOBS, at **high**: it changes the work writer that every wage passes through, which is also the slowest path in the core.
**Finisher:** a new Claude session, **Sonnet at high**.
**Branch:** `pool/M1-jobs`, stacked on `pool/M1-regional`. **Starts:** when M0-08 (money that works for a year) has passed, so hiring isn't built on firms that are about to fold.
**Owns:** `src/core2/modules/jobs.ts`, `src/core2/jobs-*.ts`, `src/core2/data/jobs/`, `data/research/jobs/`, and their tests. Changes to `src/core2/modules/work.ts` are shared core changes for SOL-1258's review. Read `M1-common.md` first.

## What exists

- **Old core:** `src/simulation/job-market.ts` (`openWeeklyListings`, `applyForJob`, `advanceApplications`, `answerJobOffer`, `startJob`, `leaveJob`); quarterly quits and layoffs in `src/simulation/living-world/town-labor-market.ts` (`reviewTownJobs`, `decideTownWorkerQuit`, `recordTownJobLoss`, reasons in `TOWN_JOB_END_REASONS`); pay from OEWS in `town-pay.ts`; room to hire and layoffs from the books in `town-business-books.ts`.
- **Don't carry over:** last-in-first-out and youngest-quits tie-breaks in `town-labor-market.ts`, and an employer's pay period drawn from national shares (`town-pay.ts` line 480).
- **Lifted rules:** `isApplicantBetterPlacedFromFacts` and the hiring, layoff, tenure and pay files in `src/rules/economy`. 26 of 30 job functions are listed as not liftable; port the math.
- **New core:** shifts, paydays and employer closure exist. There's no call to open a position, apply, hire, quit or lay off, no unemployment state, and no record of why a job ended.

## Research first

1. **Job turnover:** JOLTS openings, hires, quits and layoffs rates by industry and region, monthly, from BLS. Answer `docs/research/requests/job-market-calibration.json` (its 8 placeholders).
2. **Who does which job where:** the OEWS industry-by-occupation staffing matrix (BLS), replacing the authored job mix (stopgap `SG-P8-authored-job-mix`).
3. **How long hiring takes** and how long people stay unemployed (BLS CPS duration tables).

## Build

1. **Openings come from need.** A business opens a position when its books show work it can't cover and money to pay for it (from M1-regional's demand and its own sales), for the occupations its industry actually staffs. Openings are records with pay set from the area's OEWS wages, the business's pay position and the law-in-force minimum.
2. **Looking and applying are choices.** People without work, or unhappy with theirs, get offers to look and apply, scored from needs, money, traits, commute, pay and their drives. A person's job search is a record with a start date.
3. **Hiring on fit.** The employer ranks applicants with `isApplicantBetterPlacedFromFacts` on recorded skills, experience and schooling, and makes an offer the person accepts or declines through the chooser.
4. **Quits and layoffs for reasons.** A quit is the person's choice (a better offer, pay, a bad boss, a move, family). A layoff is the business's choice from its books, deciding who goes from recorded roles and tenure, with reasons. Every job end records its reason and, for a layoff, who decided it.
5. **Unemployment** is a recorded state with a start date. Benefits come from M1-07; until then the state is recorded and benefits are a registered stopgap.
6. **Work writer.** Add job start, pay change and job end to the work module as the smallest shared core change, so new hires get scheduled and paid on the employer's payday and an ended job stops cleanly with any unpaid wages kept.
7. **Event for drives.** A layoff emits `work.job-lost` naming the person, the employer and the person who decided it as responsible. `src/core2/data/drives.json` on the drives branch already has a row for it; M1-11 calibrates it.
8. **Speed.** Job searches, openings and reviews run from indexes of seekers and open positions, never a scan of all residents. Measure the payroll path before and after.
9. **Bench:** a person's job history with the reason for each change, and the town's openings and job-turnover rates against JOLTS.

## Out of scope

Unemployment benefits (M1-07), founding businesses and new locations (M1-08), people moving for work (M1-09), and the drive itself (M1-11).

## Hand-off

The finisher runs a year in a random place: unemployment, hires and quits inside JOLTS ranges for the place's region and industry mix; every job change has a recorded reason; one named layoff names who decided it; and a year is no more than 5% slower than its base.
