from pathlib import Path
import subprocess, json, time, os
repo=Path('/workspace/Political-Game-Git')
base=Path('/tmp/session2-newspaper-baselines');base.mkdir(exist_ok=True)
refs=[('main','47c2ecb0eb9984be6c4f30696eb4daf56a0b88fd'),('placement','570d776ef60a87bb12e84c8041f23639d0d673ac')]
receipts=[]
for label,head in refs:
 root=base/(label+'-'+head[:7]);root.mkdir(exist_ok=False)
 archive=subprocess.Popen(['git','archive',head],cwd=repo,stdout=subprocess.PIPE)
 subprocess.run(['tar','-xf','-','-C',str(root)],stdin=archive.stdout,check=True);archive.stdout.close()
 if archive.wait()!=0:raise RuntimeError('archive failed')
 subprocess.run(['git','init','--quiet'],cwd=root,check=True)
 (root/'.git/objects/info/alternates').write_text(str(repo/'.git/objects')+'\n')
 (root/'.git/HEAD').write_text(head+'\n')
 subprocess.run(['git','read-tree',head],cwd=root,check=True)
 (root/'node_modules').symlink_to(repo/'node_modules',target_is_directory=True)
 status=subprocess.check_output(['git','status','--porcelain'],cwd=root).decode()
 if status:raise RuntimeError('snapshot is dirty: '+status[:500])
 tree=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=root).decode().strip()
 command=['./node_modules/.bin/vitest','run','src/presentation/living-scene-facts.test.ts','-t','updates real newspaper content only after a canonical publication correction','--reporter=verbose']
 log=base/(label+'-terminal.log');started=time.time()
 env=os.environ.copy();env['VITE_CONFIG_NATIVE_IGNORE_WARNING']='true'
 with log.open('w') as output:result=subprocess.run(command,cwd=root,env=env,stdout=output,stderr=subprocess.STDOUT)
 after=subprocess.check_output(['git','status','--porcelain'],cwd=root).decode()
 row={'label':label,'head':head,'tree':tree,'root':str(root),'command':command,'exitCode':result.returncode,'elapsedSeconds':round(time.time()-started,2),'sourceCleanBefore':not status,'sourceCleanAfter':not after,'log':str(log)}
 receipts.append(row);(base/'receipts.json').write_text(json.dumps(receipts,indent=2))
 print(json.dumps(row),flush=True)
