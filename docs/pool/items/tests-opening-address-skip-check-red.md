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
effort: high
root: none
checked: fable 2026-11-10
---

**What.** src/bench/opening-address.browser.mjs failed on a fresh bench on Nov 3 in Santa Isabel, Puerto Rico (seed fecc3ab9-7f3c-4efb-9845-569e4c79325d) with "Skip scene ended the address": after Skip scene the talk box still contains "Thank you all". The file is unchanged since 36503ddd20, so either Skip scene no longer clears the address or the talk that follows now quotes the closing line. The browser check ends the opening address with Skip scene and then reads the talk box (lines 58 to 70), so the failure is in what Skip clears or in what the next talk quotes. Nobody has decided which.

**Cause.** Needs cause. Looked at src/bench/opening-address.browser.mjs lines 58 to 70, which assert the talk box lacks "Thank you all" after Skip scene: whether Skip scene keeps the text or the following talk quotes the closing line was not read. Measured: Santa Isabel, Puerto Rico, seed fecc3ab9-7f3c-4efb-9845-569e4c79325d.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Ask why: the fix names whether Skip scene or the following talk keeps the text, by file and line, before any assertion changes; loosening the assertion is a known cheat. One rule, all 56 places: the check runs in drawn places named with seeds.

**Done when.** A second session runs src/bench/opening-address.browser.mjs on a fresh bench in three drawn places named with seeds, including Santa Isabel, Puerto Rico, and sees every run pass, the talk box no longer holding the address's closing words after Skip scene. The PR names the cause by file and line.

**Waits on.** Nothing.

**Files.** src/bench/opening-address.browser.mjs

**Notes.** TODO
