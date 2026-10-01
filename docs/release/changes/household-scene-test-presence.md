---
id: household-scene-test-presence
impact: none
---

Test-only maintenance: the campaign filing and election fixtures record household co-presence, and newest-record lookups use ES2022-compatible array methods. Production behavior is unchanged. This covers src/presentation/contextual-scene-variants.test.ts, src/presentation/contextual-scenes-public.test.ts, and tests/fixtures/home-scene.ts.
