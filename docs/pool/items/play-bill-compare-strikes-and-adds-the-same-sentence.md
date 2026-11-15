---
id: play-bill-compare-strikes-and-adds-the-same-sentence
title: "A bill's Compare view strikes a section and adds the same sentence back, so it shows no change"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: #8868
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: lead's play walk as a council member on Nov 11, 2026 (Lino Lakes, Minnesota, seed 046d2235-27df-4daa-a680-423d6f24d0d7, Ordinance 2025-6 at the meeting of February 4, 2025)
checked:
claimed-at:
---

**What.** A council member reading a bill before they vote presses Compare to see what the bill changes. On the walk above, Ordinance 2025-6 (to repeal the town's rules on affordable homes in new buildings) showed its one section struck through and then the same sentence, word for word, underlined as added: "Section 1. Be it ordained by the Lino Lakes City Council, That the rules now in force on affordable homes in new buildings are repealed and shall have no further effect." A reader cannot tell what the law says today or what the vote would change. The panel beside it says only that no dollar figure is on record for the section. Seen: the bill page's Compare view at a meeting or in Politics, Bills, at 1440x900, where the struck text is the law in force today and the added text is what the bill would make it.

**Cause.** Found in code: the bill page's view (`billPageView` in src/bench/bill-stage.ts) builds a section's struck side by wording the bill's own section a second time with the law in force's value put in (`clauseOf` with `value: before.value`), and the English engine words a yes-or-no section with a value of 0 or less as a repeal (src/english/bill-sections.ts, `repeal = p.operation ? p.operation === "repeal" : p.value <= 0`). So where no rule is in force (0), the struck side read "the rules now in force on ... are repealed": a false account of the law today, and word for word the bill's own sentence when the bill repeals. A section drafted from a catalog policy also carries `operation`, which the English engine reads before the value, so the struck side could repeat the bill's operation. Replayed in Lino Lakes, Minnesota (bench seed `046d2235-27df-4daa-a680-423d6f24d0d7`, Advanced as council member Astrid Shelton, two weeks run): Ordinance 2025-1 struck and added "the rules now in force on highway money used for transit are repealed" (its section 2), and its section 1 struck a repeal of immigration-cooperation rules that were not in force; Ordinance 2025-3's section 2 the same for limits on rent increases. Were those rules in force that day: no. The bills' own records give the law in force as 0 for each repealed question (`billForm(...).sections[i].before.value`), so the council filed, and passed, repeals of rules not in force; that is the world's filing, filed as its own item (`core-world-files-repeals-of-rules-not-in-force`).

**Fix.** The struck side strikes only a rule in force: a yes-or-no section with a law in force above 0, worded by its own value without the bill's catalog operation; with none in force it strikes nothing, and the Compare view shows only what the bill adds. Rates and amounts keep their struck side as before. A browser check (src/bench/bill-compare-differs.browser.mjs) reads every bill in Politics, Bills and fails on a struck sentence equal to the added one.

**Time box.** 2 hours for one Sonnet session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** An effect is a read, not a record: the Compare view reads the law in force from the one law record, never a second wording of the bill. No hand-written player text in code. One rule, all 56 places: the check draws its place and names it with its seed.

**Done when.** A second session, in the running game on main at 1440x900, steps in as a member of a local body in a drawn place it writes down with its seed, opens a bill with a yes-or-no section at a meeting or in Politics, Bills, and presses Compare: the struck text and the added text differ, the struck text says what the law is today, and a browser check in src/bench asserts the two differ for every section of three drawn bills.

**Waits on.** Nothing.

**Files.** src/bench/bill-stage.ts, src/bench/ui/bill-paper.mjs, src/english/bill-sections.ts, src/bench/bill-compare-differs.browser.mjs (new)

**Notes.** Written by the lead (Fable B), Nov 11, 2026, from a forty-day walk as a council member on main 382123f701. The same walk showed the meeting itself working: the player was held at the council's meeting of February 4 with three ordinances to read, speak on and vote (pull request #8807).
