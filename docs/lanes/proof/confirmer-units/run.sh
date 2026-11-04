#!/bin/bash
cd /home/user/Political-Game-Git
export OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192
O=/tmp/claude-0/-home-user-Political-Game-Git/39df252c-0e86-5c04-a0d3-e3e72f11d951/scratchpad/units
echo "main $(git log --oneline -1)" > $O/commit.txt
while IFS='|' read lane pr seed files; do
  ex=""; for f in $files; do [ -f "$f" ] && ex="$ex $f" || echo "missing $f" >> $O/r$pr.missing; done
  SECONDS=0
  if [ "$seed" = "-" ]; then npx vitest run $ex --maxWorkers=1 > $O/r$pr.out 2>&1; else GOLDEN_PATH_SEED=$seed npx vitest run $ex --maxWorkers=1 > $O/r$pr.out 2>&1; fi
  echo "$lane #$pr exit $? ${SECONDS}s" >> $O/results.txt
done < $O/list.txt
echo ALLDONE >> $O/results.txt
