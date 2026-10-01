# A10 — The saved court stage reaches its actual due date

The existing production composer charges five named defendants on their saved referral due dates, then schedules their next stage from the admitted timing reader. This renews a bounded integration proof; it does not close the whole court slice.

## 1. Why-chain

A saved referral creates a dated court due item. The existing composer routes that item to the prosecution handler. The saved charge supplies the next stage's origin date, and the existing timing reader supplies its delay. Replaying the same due item must not create another charge or deadline.

## 2. Research

No timing estimate or legal rule is added. `prosecutionTimingFor` preserves the existing disposition table's SOURCED and ESTIMATED FROM AVERAGE distinctions. The charging delay remains that reader's labeled estimate.

## 3. Revisions

The old composer fixture built a full opening life and expected the national trial delay for every place. It now uses the admitted shared `smallWorld` builder and the actual place's existing timing reader. All five seeded places, original assertions and stock test limits remain. There is no production change.

## 4. What gets built

Only `src/simulation/justice/prosecution-composer.test.ts` changes. Its existing consumer is `composeWorldTimeHandlers`, using the actual saved referral, defendant and due item. No new export or replacement engine exists. The small-world fixture replaces the old full-opening fixture; `prosecutionTimingFor` replaces the obsolete national-delay expectation.

## 5. Simulated, records, world pieces, checks

The five samples are Iowa, Louisiana, Texas, Connecticut and North Dakota. Each uses generated residents, the canonical referral writer and the full production time-handler composer. Unrelated commitments are cancelled through the existing cancellation writer. This is controlled court-clock integration, not natural crime generation, actual prosecutor authority, a whole-world year or browser play.

## 6. Proof run

Executed source is `791232cfa4d86ad5489e7afeb409dd3afdae92c4`, stacked on A105 `6150c2280b3c0e5699af9be47b8e51ab72f9552b`. The complete changed test file passed 5 of 5 in 22.63 seconds with one worker and unchanged limits. One changed-file strict root compiled 1006 dependency files with zero diagnostics; changed-file lint, formatting and whitespace passed. Node world import exited 0. The mandated macro LOAD exited 0 in 19.38 seconds, collecting 29 cases and executing none. No extra behavioral files, full suite, app-wide type check or repository-wide sweep ran.

Local evidence is retained at `/tmp/team9-a10-small-composer.log`, `/tmp/team9-a10-small-composer-records.json`, `/tmp/team9-a10-small-composer-types.log`, `/tmp/team9-a10-small-composer-world-load.log` and `/tmp/team9-a10-small-composer-macro-load.log`. Raw logs are not added to this PR. Earlier A10 and A105 receipts remain preserved.

## 7. Worked example

Carmen Reynolds (`person_f02d8c7d383b5495`) in Iowa has referral `event_66764b3d179b53dc`. Due item `future-due-item_bf214507fdfe7011` saves charge `event_f118d854c0b21795` on March 6, 2026. The next saved stage is August 5, 2026, using Iowa's SOURCED disposition timing. Canonical reload and repeat preserve the charge and future due records. North Dakota's next date is July 22; the other three samples retain the labeled average date, July 6.

## Ownership and next contracts

This branch owns only the composer test and this handback/declaration. A105 remains unchanged and is the explicit stack dependency. A25 numeric age/transfer authority and A104 actual dated prosecutor authority await CTO decisions; A103's import boundary remains Claude-owned. No threshold, prosecutor, governor substitute, federal forum or counsel producer is invented.
