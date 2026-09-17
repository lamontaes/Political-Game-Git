"""Verify and copy a private candidate pack; refuse overwrite and source drift.

Usage: python3 install_private_pack.py PACK TARGET [--apply]
Default is a complete preflight without writes. Existing unequal files are never
replaced; use a fresh compatible worktree, retaining the owner's current pack.
"""
from pathlib import Path
import hashlib,json,shutil,sys

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def within(root,name):
 path=(root/name).resolve()
 if not path.is_relative_to(root):raise ValueError('Pack path escapes root: '+name)
 return path

def install(pack,target,apply=False):
 manifest=json.loads((pack/'manifest.json').read_text());errors=[];missing=[]
 for name,digest in manifest['requiredSourceFiles'].items():
  p=within(target,name)
  if not p.is_file() or sha(p)!=digest:errors.append('incompatible source: '+name)
 for entry in manifest['files']:
  name=entry['path'];p=within(pack/'files',name);dest=within(target,name)
  if not p.is_file() or sha(p)!=entry['sha256']:errors.append('pack hash mismatch: '+name)
  if dest.exists():
   if not dest.is_file() or sha(dest)!=entry['sha256']:errors.append('existing file differs (preserved): '+name)
  else:missing.append((p,dest))
 if errors:raise ValueError('\n'.join(errors))
 if apply:
  for p,dest in missing:
   dest.parent.mkdir(parents=True,exist_ok=True)
   # Refuse even if another writer appeared after preflight.
   with dest.open('xb') as out, p.open('rb') as src:shutil.copyfileobj(src,out)
 print(json.dumps({'verified':len(manifest['files']),'missing':len(missing),'copied':len(missing) if apply else 0,'sourceSha':manifest['sourceSha'],'acceptance':manifest['acceptance']}))

if __name__=='__main__':install(Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve(),'--apply' in sys.argv[3:])
