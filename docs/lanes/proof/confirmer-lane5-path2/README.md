# Confirmer replay: Lane 5, Path 2 (a year doesn't stop)

Run Nov 4, 2026 on main c60a509956 by a session that built none of it, one process at a time, Node heap 8,192 MB: `npm run speed:year -- --seed confirmer-<town>-1 --place <key> --years 3` (`run.sh`). The fixed towns list gives no replay number for these two, so the seeds are named here. Three years run January 20, 2025 to January 20, 2028, which takes in Madras's old crash point of May 11, 2026 and a full year after it.

| Town                              | Seed                     | Year 1  | Year 2  | Year 3  | Exit |
| --------------------------------- | ------------------------ | ------- | ------- | ------- | ---- |
| Madras, Oregon (4145250)          | confirmer-madras-1       | 116.9 s | 307.4 s | 329.6 s | 0    |
| Bloomingdale, Tennessee (4706640) | confirmer-bloomingdale-1 | 105.4 s | 165.0 s | 141.5 s | 0    |

Logs: `madras.log.txt`, `bloomingdale.log.txt` (heap and records per year). No error on stderr in either.

**Result: pass.** Path 3's bar (under two minutes a year) is not this path's; Madras's years 2 and 3 ran about 5 minutes each, heap 2.7 GB by year 3.
