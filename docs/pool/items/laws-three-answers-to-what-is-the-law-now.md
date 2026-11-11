---
id: laws-three-answers-to-what-is-the-law-now
title: "Three separate pieces of code answer 'what is the law now'; keep one lookup and delete the other two"
area: laws
kind: cleanup
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-laws-three-answers-to-what-is-the-law-now
pr: #8582
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What the code does", and "Duplicate systems worth merging", item 3)
model: opus
effort: medium
root: design-guards
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:51:37.192Z
---

**What.** Three separate pieces of code answer "what is the law now". This is read in code, not measured in play. The laws engine has the full lookup, `lawInForce`, which reads every level of the town's chain on a date. The outcome web has its own, `lawValue`, which scans a question's rows, keeps the latest per jurisdiction and returns 1 if any says yes. The death taxes file has a third, `rowInForce`, which reads one jurisdiction's latest row. They do not follow the same rules: `rowInForce` skips a row past its end date, `lawValue` never looks at an end date, and each sorts ties its own way. So the same law can be in force for one engine and not for another, and a fix to how a law ends or is set aside has to be made three times. Keep `lawInForce` as the one lookup, point the outcome web and the death taxes at it, and delete `lawValue` and `rowInForce` with their tests. Every reader of the law, in every engine, then gets the same answer on the same day. Seen: the bill card's "in force today" line, which three lookups answer three ways (one engine per mechanic).

**Cause.** Found in code: src/core2/modules/outcome-web.ts lawValue (line 195), src/core2/laws-death-taxes.ts rowInForce (line 58) and lawInForce in modules/laws.ts duplicate each other with different end-date and tie rules.

**Fix.** List where the three disagree, keep lawInForce, point the other two at it and delete them.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the two extra lookups are deleted in the same change that points their callers at the one, and the PR body counts the lines removed. An effect is a read, not a record: every engine must read the same law at the moment it decides or pays. Speed: the one lookup keeps its per-day memo, so the outcome web's monthly pass and the estate tax must not scan every law row again. Owner, October 27, quoted by the audit: "Sessions should not be building their own shit." Owner, October 27 (AGENTS.md): one engine per mechanic; a view that computes its own version of a fact is a duplicate.

**Done when.** A search of `src` finds one function that resolves the law in force, `lawInForce` and its helpers in `src/core2/modules/laws.ts` and `src/core2/laws-in-force.ts`, and no `lawValue` in `src/core2/modules/outcome-web.ts` and no `rowInForce` in `src/core2/laws-death-taxes.ts`. Before deleting, the builder lists each case where the three disagree today (an ended row, a row set aside, a tie on the effective date, a law before the opening) and says which answer the one lookup gives and why. A second session then checks it in the running game: start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) in a drawn place, write down the place and seed, run one year in dev mode's Run panel on the base and on the branch, and save dev mode's records proof for each (`POST /api/dev/proof/save`, then `GET /api/dev/proof/compare`). The two proofs match table by table, or every table that differs is explained by one of the listed cases, by record id. In the same played world one estate is taxed and one outcome-web law link fires, and each names the law row it read. The four-year speed check, `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run speed:year`, is no more than 20 percent slower than its base on the same machine. The existing tests for the outcome web and the death taxes pass on fresh draws. The owner plays it: nothing looks different, and the next fix to how a law is read is made once.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts (`lawInForce`, line 569; `readLawInForce`, line 662; `yesLevels`, line 791), src/core2/modules/outcome-web.ts (`lawValue`, line 195; called at lines 441, 482 and 596), src/core2/laws-death-taxes.ts (`rowInForce`, line 58; called at lines 120 and 162), src/core2/laws-in-force.ts (`resolveLawInForce`, line 310)

**Notes.** From the Fable audit, Pillar 2 ("Three separate pieces of code answer 'what is the law now' (read)") and its duplicates list. All three functions are at the lines the audit cites, on main, Nov 10. Not measured: any case in play where the three disagree; the differences above are read from the code. `lawValue` also has a fallback for a world where the laws module is not open (it reads the outcome web's own `laws` table of law-took-effect events) and a `realOnly` mode that reads only the starting law; both need a home in the one lookup or a reason they are no longer needed. This is structure work in the style of `.agents/skills/slim-down/SKILL.md` (diff the bodies first; copies that look the same can differ on an edge), but it may change an answer on those edges, so it belongs to the laws lead and not to the slim-down session. Other in-force helpers exist and are not part of this item unless they repeat the lookup: `questionInForce` in `src/core2/law-reach/group-b.ts` (it calls `yesLevels`), `billValueInForce`, `stateLawInForce`, `propertyTaxRateInForce`. Related: `law-levels-death-tax-zero-restoration` (claimed; it edits `laws-death-taxes.ts`, so talk to its owner before touching that file), `web-lag-law-before-opening-reads-none` (done; an earlier fix made only in `lawValue`), `laws-bill-before-reads-bill-level` (claimed; a bill's "in force today" and its paper's "before" read different rows), `laws-federal-repeal-cannot-remove-a-value-that-was-not-there`.
