# Escape closes what is open

Granville, New York, seed e5c4a9d2-71b3-4f0a-9c3e-2f6d8a1b7c40, 1440x900, Politics menu open, one press of Escape.

- `before/open-politics.png` and `before/closed-politics.png`: before, the press put Options over Politics (the sheet title reads "Options" 600 ms later) and left the clock covered.
- `after/open-politics.png` and `after/closed-politics.png`: after, one press closes the menu in 22 ms and the room and clock show; a second press opens Options and a third closes it.

`src/bench/escape-closes-what-is-open.browser.mjs` repeats this for every menu on the rail (each closed in 8 to 29 ms) and for a person's card over a talk.
