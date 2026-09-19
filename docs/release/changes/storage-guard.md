---
id: storage-guard
impact: none
---

Development tooling only: a storage guard (`scripts/storage/`) gives each
owner one registered workspace, reserves byte headroom before builds, desktop
staging/packaging and browser capture, bounds disposable run output, and
refuses to retire a folder that is active, unpublished, carries private inputs
or that another Git store depends on. Nothing in shipped play changes.
