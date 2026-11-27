---
id: leaf-constants
impact: none
---

Eight modules move their literal constants (module ids and fixed lists) into a file that imports nothing, and seven importers read them there. Same values, fewer import cycles.
