---
id: tests-opening-address-skip-check-red
title: "opening-address.browser.mjs fails on main: Skip scene leaves the address's closing words in the talk box"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/bench/opening-address.browser.mjs failed on a fresh bench on Nov 3 in Santa Isabel, Puerto Rico (seed fecc3ab9-7f3c-4efb-9845-569e4c79325d) with "Skip scene ended the address": after Skip scene the talk box still contains "Thank you all". The file is unchanged since 36503ddd20, so either Skip scene no longer clears the address or the talk that follows now quotes the closing line. The browser check ends the opening address with Skip scene and then reads the talk box (lines 58 to 70), so the failure is in what Skip clears or in what the next talk quotes. Nobody has decided which.

**Cause.** Found in code: the opening address now begins with a narration lead, and the check reads the talk box before it. The director gives the address scene a lead (`address` is in the `leads` list of src/director/data/scene-rows.json), so the talk box first shows a line like 'Late on January 20th finds you at home.' with only Continue (`#talk-next`), and the address and Skip scene come after it. src/bench/opening-address.browser.mjs reads `#talk` the moment it is visible (line 48) and asserts more than 80 characters (line 53). Measured on main (Nov 11) on a fresh bench: Mongmong-Toto-Maite, Guam (check seed b162be8e-b60a-4dfc-bde7-a1fb6eb421b8) failed with 'the talk box says the address', the box holding only that lead; a copy of the check that presses Continue until Skip scene shows (run once, deleted) passed in Booneville, Kentucky (d64b5622-327c-43cd-9119-74133a12ea42) and Middletown, Virginia (d2d267bf-551a-4c16-9756-ba3c931a19ed), including 'Skip scene ended the address'. So the Nov 3 Skip failure does not reproduce once the lead is passed.

**Fix.** Change the check only: after `#talk` is visible, press `#talk-next` while it is shown and `#talk-skip` is not (a few times, waiting briefly between), then read the address and run the rest of the check as it is. Keep every assertion.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: the fix names whether Skip scene or the following talk keeps the text, by file and line, before any assertion changes; loosening the assertion is a known cheat. One rule, all 56 places: the check runs in drawn places named with seeds.

**Done when.** A second session runs src/bench/opening-address.browser.mjs on a fresh bench in three drawn places named with seeds, including Santa Isabel, Puerto Rico, and sees every run pass, the talk box no longer holding the address's closing words after Skip scene. The PR names the cause by file and line.

**Waits on.** Nothing.

**Files.** src/bench/opening-address.browser.mjs

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** `node src/bench/opening-address.browser.mjs` (BENCH_BROWSER as above) on a fresh bench. The check draws its own place; BENCH_SEED is not read, so Santa Isabel was not replayed. Run in Medora, North Dakota, check seed 6b0e7a72-83db-4781-81ff-f01adba62e25: red, earlier than the item's assertion. As printed: `AssertionError [ERR_ASSERTION]: the talk box says the address` (actual false, expected true) at src/bench/opening-address.browser.mjs:53.

Cause found (Nov 11, 2026, cause finder for Fable B): one failing run of the unchanged check and one passing run of a copy that passes the lead first, both on a fresh bench.
