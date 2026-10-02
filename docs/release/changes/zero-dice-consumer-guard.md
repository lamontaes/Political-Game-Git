---
id: zero-dice-consumer-guard
impact: none
---

The source guard now detects random choices, raw draw values and arithmetic
noise across formatting and RNG aliases. Existing callers remain visible as
guard failures until their owners resolve them; the allowance does not expand.
