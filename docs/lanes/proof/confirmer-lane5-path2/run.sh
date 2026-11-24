#!/bin/bash
cd /home/user/Political-Game-Git
export OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192
O=/tmp/claude-0/-home-user-Political-Game-Git/39df252c-0e86-5c04-a0d3-e3e72f11d951/scratchpad/l5p2
echo "main $(git log --oneline -1)" > $O/commit.txt
for row in "madras 4145250" "bloomingdale 4706640"; do set -- $row
  SECONDS=0; npm run speed:year -- --seed confirmer-$1-1 --place $2 --years 3 --max-seconds 100000 --out $O/$1.json > $O/$1.out 2> $O/$1.err; echo "$? $SECONDS" > $O/$1.done
done
