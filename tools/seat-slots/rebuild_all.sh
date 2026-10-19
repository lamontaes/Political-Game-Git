#!/bin/bash
cd "$(dirname "$0")"
{
for r in "council-chamber-large ccl" "council-chamber-small ccs" "county-commission cco" "county-commission-rural ccr" "public-meeting-room pmr" "school-board-room sbr"; do set -- $r; echo "$1 $2 s-$2 seats/$1 x"; done
for r in "council-chamber cc" "council-chamber-large ccl" "council-chamber-small ccs" "county-commission cco" "county-commission-rural ccr" "public-meeting-room pmr" "school-board-room sbr"; do set -- $r; echo "$1 $2 s-$2-z none z"; done
echo "us-house-floor ush s-ush seats/us-house-floor x+y+w"
echo "state-house-chamber sth s-sth seats/state-house-chamber x+y+w"
echo "state-legislative-chamber-unicameral uni s-uni seats/state-legislative-chamber-unicameral x+y+w"
echo "us-senate-floor sen s-sen-add2 none y+w"
} | xargs -P 5 -n 5 sh -c 'PREFIXES="$(echo $4 | tr + " ")" ./build_place.sh $0 $1 $2 $3 > seats/build-$2.log 2>&1; echo "$2 $(tail -1 seats/build-$2.log)"'
echo REBUILT
