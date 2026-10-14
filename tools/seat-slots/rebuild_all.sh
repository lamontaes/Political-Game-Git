#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
BUILD=${1:?Usage: rebuild_all.sh NEW_BUILD_DIRECTORY [PLACE ...]}
shift
if [[ $# -eq 0 ]]; then
  set -- council-chamber council-chamber-large council-chamber-small county-commission county-commission-rural public-meeting-room school-board-room state-house-chamber state-legislative-chamber-bicameral state-legislative-chamber-unicameral us-house-floor us-senate-floor
fi
for place in "$@"; do
  python3 "$ROOT/tools/seat-slots/rebuild_room.py" "$place" "$BUILD/$place"
done
