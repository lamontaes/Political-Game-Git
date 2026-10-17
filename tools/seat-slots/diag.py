"""Print the recorded reasons from one completed seat-slot build."""
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
print((root / 'report.json').read_text())
for file in sorted((root / 'rejected').glob('*/diag.txt')):
    item = json.loads(file.read_text())
    print(item['source'], item['instance'], item['chair'], ', '.join(item['reasons']))
