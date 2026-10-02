---
id: app-typecheck-skips-tsx-tests
impact: none
---

The app type check already left out `*.test.ts` files; it now also leaves out `*.test.tsx`, which removes the two false TS6307 errors every checker had to explain away.
