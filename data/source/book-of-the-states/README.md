# Preserved salary research, excluded from shipping

The three captured CSG salary tables and their artifact lock are retained as historical research evidence. Their noncommercial use restriction prevents their use as paid-game salary inputs. Do not import or copy these captures into production data or public assets.

`export:office-pay` now reads only independently researched official facts in `data/source/official-office-pay/facts.json`. The build's `check:data-shipping` rejects these captured artifacts, their source URLs, filenames and recorded hashes. Other non-salary institutional sources are outside this correction's scope.
