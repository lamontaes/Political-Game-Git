---
id: storage-guard
impact: none
---

Development tooling only: a storage guard (`scripts/storage/`) gives each
owner one registered workspace, holds reserved byte headroom through builds,
desktop staging/packaging and browser capture, removes disposable run output
only inside a registered output root, and refuses to retire a folder that is
active, unpublished, carries private inputs, that another checkout depends on,
or whose bytes differ from the manifest the owner approved. Nothing in shipped play changes.
