from pathlib import Path
import subprocess,json,hashlib
root=Path('/workspace/Political-Game-Git');base='8c63a1e87b674cc65956b78f69efc059d239a640'
files=json.loads((root/'docs/codex/effect-batches/team-1/a76-title-proof/source.json').read_text())['sourceFiles']
saved={};baseline={}
for name in files:
 r=subprocess.run(['git','show',f'{base}:{name}'],cwd=root,capture_output=True)
 if r.returncode==0:
  saved[name]=(root/name).read_bytes();baseline[name]=r.stdout
receipt={'base':base,'candidate':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'method':'Exact existing source roots from main in the reused checkout; unused new leaf/test files remain but are not imported by this baseline file. Restore only if each temporary source still equals its admitted baseline bytes.','sources':{name:{'candidateSha256':hashlib.sha256(saved[name]).hexdigest(),'baselineSha256':hashlib.sha256(data).hexdigest()} for name,data in baseline.items()}}
Path('/tmp/team1-a76-main-before-source.json').write_text(json.dumps(receipt,indent=2)+'\n')
try:
 for name,data in baseline.items():(root/name).write_bytes(data)
 with open('/tmp/team1-a76-main-before-full.log','wb') as out:
  result=subprocess.run(['npm','run','storage','--','run','test','--','npx','vitest','run','src/simulation/dc-council-acts.test.ts'],cwd=root,stdout=out,stderr=subprocess.STDOUT,env={**__import__('os').environ,'OCD_MANAGED_ROOT':'/workspace','OCD_STORAGE_STATE_DIR':'/workspace/.ocd-dev'})
 receipt['testExitCode']=result.returncode
finally:
 for name,data in baseline.items():
  if (root/name).read_bytes()!=data:raise RuntimeError('Concurrent source change preserved without overwrite: '+name)
  (root/name).write_bytes(saved[name])
 receipt['restoredSourceHashes']={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in saved}
 Path('/tmp/team1-a76-main-before-source.json').write_text(json.dumps(receipt,indent=2)+'\n')
