# M0-01 through M0-05: ready for the independent finisher

PR #3940, `pool/M0-bench`. Open a 16 GB Codespace, run `npm run bench`, and open port 3000.

The integration was rebuilt from only `pool/P8-part-1` at `4a09398c9c19b1bbdb9fb4c3986275b2afcd4647` and `pool/P13-5` at `affb3b4e2745d4be5ea5d8fa6bb967390c2a2857`. These merged cleanly. Core and director source trees exactly match that merge; no manual conflict resolutions or edits. P10 drives and P15 people were dropped as instructed, pending their owners' re-integration. PR history is preserved; no force push or merge to main.

| Spec  | Builder result; independent acceptance remains pending                                                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0-01 | Three fresh UUID seeds drew three distinct jurisdictions. All openings built at the full core cohort size; every displayed household/job reference was checked.                                                                                                                                                                                 |
| M0-02 | Seven controlled days; 11 saved acts, each matched to its issued pause/offer answered on screen. 19,911 other acts continued. Unissued answers were rejected without record changes. The adapter fixture also rejects an unavailable offer on a valid outstanding pause without consuming it.                                                   |
| M0-03 | Day, Week and Calendar reached exact requested frontiers after screen answers. Skip stopped at the earliest queried fixed commitment, `2026-10-23` minute `480`, and identified it. The 0.50 equality interrupt and an owner-held deadline have labeled adapter edge checks. Skip probes one day at a time, avoiding a year of pending answers. |
| M0-04 | Twenty randomly sampled visible saved records opened explanations with existing record IDs. 6 had no saved scores; the screen said so plainly and listed them. Native resolver tests cover payments and preserve explicit missing sources. No display scores or reasons were synthesized.                                                       |
| M0-05 | All three openings showed steps 1–2 reachable, specific missing modules for 3–11, and all four world pieces missing. No step is marked reached.                                                                                                                                                                                                 |

[Actual screen receipt](screen-receipt.json), [gate receipt](gate-receipt.json), [repeatable screen verifier](verify.mjs), [adapter edge checks](player.test.ts), [usage and API limits](README.md).

| Drawn seed                             | Recorded jurisdiction / locality key | Resident references checked |
| -------------------------------------- | ------------------------------------ | --------------------------- |
| `f4893b84-7eea-4d09-b9ec-ae185096cf4f` | `US-UT` / `4900870`                  | 10,000                      |
| `8ed504d6-6db9-474a-b3f2-d63ecf3967fe` | `US-GA` / `1351670`                  | 10,001                      |
| `62c76b57-758e-4056-8b9d-c0da9826c3e2` | `US-GU` / `territory:GU:umatac`      | 10,001                      |

Saved-score gaps from the random sample (for Sol's follow-up):

- `person_c4f1368db715cfce`
- `person_c4f1368db715cfce:2010-08-30:past:person_c4f1368db715cfce:p8-deep-past-v1:school:middle:school:cohort-estimate`
- `work-relationship_a95fe12c1eee8025`
- `household_75a489b117edb74e`
- `person_c4f1368db715cfce:person_c4f1378db715d181`
- `person_c4f1368db715cfce:2013-08-26:past:person_c4f1368db715cfce:p8-deep-past-v1:school:high:school:cohort-estimate`

The director produces scored moments at its end-of-day callback. Its adapter registers qualifying new moments at the actual publication frontier, the next midnight, rather than inventing a within-day occurrence time. Historical opening moments do not interrupt play. No game deadline-offer producer is installed in the requested two-branch union; the bench honors actual core-registered deadlines and the held-deadline edge test proves it cannot waive them.

Without P15, the opening has 17-year-olds and adults starting at 19. The panel identifies an actual resident approaching 18, shows the recorded upcoming birthday and current contact offer, and calls them reachable. It does not invent an 18-year-old or claim a played birthday. The furthest reached golden-path step remains **none** because national economy, state government, federal government and other-place modules are absent; filing for office and the later steps also remain missing.

Checks passed: full repository typecheck; strict bench types; scoped ESLint/Prettier; PR release check; zero-dice; four geography checks; 58 published clock/stop/trace cases; six bench adapter cases; generated-world Chromium screen run. Feature acceptance flags remain unchanged for the finisher.

Failures corrected during building: an inherited health import was removed with P10; a stale server instance was restarted; opening birthday reachability now reflects the core-only cohort; the sampler earns more actual records when a resident has fewer than twenty; skip continuation is bounded to its current civil-day probe.

Model: **GPT-6**, the session's declared identity. Package preference: GPT-6.1 Sol at medium, because this is a developer client over an agreed public API. Actual runtime effort and token usage are not exposed; no helpers or model overrides were used. Recorded work window from the clean integration commit: `2026-10-11T01:30:43Z` to `2026-10-11T01:44:04.065428+00:00` (13.4 minutes); initial inspection before that commit was not instrumented. Finisher send-backs in this continuation: **0**.

GitHub API reads/writes return `Forbidden`, including PR body updates. This is an access denial, not an automatic approval-review rejection. This committed file is the handoff fallback; [PR_BODY.md](PR_BODY.md) contains the exact PR-body text for posting when API access is restored.
