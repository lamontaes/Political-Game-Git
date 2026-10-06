---
id: currency-code-initialization-cycle
impact: none
---

Move the currency-code validator to a dependency-free leaf module so resource validation can run during world startup without a module initialization cycle.
