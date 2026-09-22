import importlib.util,json,tempfile,unittest
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('intake',Path(__file__).with_name('import-firefly-returns.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class IntakeTests(unittest.TestCase):
 def test_original_dedup_and_new_revision_do_not_carry_approval(self):
  with tempfile.TemporaryDirectory() as d:
   r=Path(d);f=r/'returns'/'request';f.mkdir(parents=True)
   (r/'manifest.json').write_text(json.dumps({'schema':'playtest65-firefly-kit-v1','requests':[{'id':'request','returns':'returns/request','candidatePrefix':'candidate-r','templateVersion':'v1','provider':'Adobe Firefly'}]}))
   Image.new('RGB',(32,16),'red').save(f/'download.png')
   first=module.ingest(r);self.assertEqual(len(first['added']),1);original=r/first['added'][0]['original'];before=original.read_bytes()
   second=module.ingest(r);self.assertEqual(len(second['duplicates']),1)
   Image.new('RGB',(32,16),'blue').save(f/'another name.png')
   third=module.ingest(r);self.assertEqual(third['added'][0]['revision'],2);self.assertEqual(third['added'][0]['approval'],'unreviewed');self.assertEqual(original.read_bytes(),before)
   (f/'not-image.png').write_text('invalid')
   self.assertEqual(len(module.ingest(r)['rejected']),1)
 def test_path_escape_is_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   r=Path(d);(r/'manifest.json').write_text(json.dumps({'schema':'playtest65-firefly-kit-v1','requests':[{'id':'request','returns':'../outside'}]}))
   with self.assertRaises(ValueError):module.ingest(r)
if __name__=='__main__':unittest.main()
