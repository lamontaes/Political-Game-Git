---
id: offices-registries-are-fields
impact: none
---

Four of the offices family's side registries are now fields of the engines' modules, read from the modules installed in a world (`fieldsOf`/`carriersOf`) instead of lists filled as files load: who succeeds an office's holder (`successorProviders`, carried by the offices and succession modules), the player's seat offer (`vacancyOffer`, the elections module), a vacancy's special election (`specialElections`, the voting module), the central bank board's appointer (`boardAppointer`, the succession module), and what may stop the player (`stopKinds`, each level's module). The records proof over two played years (seed offices-reg) is identical before and after. The one visible change: the list of stop kinds now starts with the local ones, since it follows the order the modules are installed rather than the order three files happened to load.
