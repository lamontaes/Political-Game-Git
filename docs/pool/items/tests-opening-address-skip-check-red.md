---
id: tests-opening-address-skip-check-red
title: "opening-address.browser.mjs fails on main: Skip scene leaves the address's closing words in the talk box"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/opening-address.browser.mjs failed on a fresh bench on Nov 3 in Santa Isabel, Puerto Rico (seed fecc3ab9-7f3c-4efb-9845-569e4c79325d) with 'Skip scene ended the address': after Skip scene the talk box still contains 'Thank you all'. The file is unchanged since 36503ddd20, so either Skip scene no longer clears the address or the talk that follows now quotes the closing line.

**Rules.** Ask why: the fix names whether Skip scene or the following talk keeps the text, by file and line, before any assertion changes; loosening the assertion is a known cheat.

**Done when.** opening-address.browser.mjs passes on a fresh bench in three drawn places named with seeds, and the PR names the cause by file and line.

**Files.** src/bench/opening-address.browser.mjs

**Notes.** TODO
