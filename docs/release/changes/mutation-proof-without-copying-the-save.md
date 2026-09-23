---
id: mutation-proof-without-copying-the-save
impact: patch
section: Fixed
title: Long saves no longer take minutes to pass a year in the development build.
---

Two checks made every press slower as a save grew. The development build
proved that no scheduled event rewrites the world by copying the whole save
to text twice for every scheduled event; it now freezes the world instead and
walks only the records added since the last check. And after every press, the
play screen checked the whole save once for each piece of news it published;
it now checks once for the whole batch. On a 12.8 MB Alaska save, letting the
year run on went from 130 seconds to 11 in the browser. Saves are
byte-identical to before.
