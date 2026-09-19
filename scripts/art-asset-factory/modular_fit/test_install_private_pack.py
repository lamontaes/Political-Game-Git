"""Correction regressions adapted from R1 checkpoint 1 installer probes.
Original retained under output/r1-corrections/reviewer-baseline.
"""
"""Independent behavioural probes of install_private_pack.install (imported read-only)."""
import sys, os, json, hashlib, tempfile, unittest, io, contextlib, shutil
from pathlib import Path
from unittest import mock
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import install_private_pack as ipp

def sha(b):return hashlib.sha256(b).hexdigest()
class Base(unittest.TestCase):
    def setUp(self):
        self.tmp=Path(tempfile.mkdtemp()).resolve();self.pack=self.tmp/'pack';self.target=self.tmp/'target'
        (self.pack/'files/art').mkdir(parents=True);self.target.mkdir()
        (self.target/'src.py').write_bytes(b'code')
        self.files={'art/a.png':b'A'*10,'art/b.png':b'B'*10,'art/c.png':b'C'*10}
        for n,d in self.files.items():(self.pack/'files'/n).write_bytes(d)
    def tearDown(self):shutil.rmtree(self.tmp)
    def manifest(self,files=None,required=None,**extra):
        files=self.files if files is None else files
        m={'requiredSourceFiles':{'src.py':sha(b'code')} if required is None else required,'files':[{'path':n,'sha256':sha(d)} for n,d in files.items()],'sourceSha':'x','acceptance':'candidate',**extra}
        (self.pack/'manifest.json').write_text(json.dumps(m));self.seal();return m
    def run_install(self,apply=True):
        with contextlib.redirect_stdout(io.StringIO()) as out:ipp.install(self.pack,self.target,apply)
        return json.loads(out.getvalue())

    def seal(self):
        (self.pack/'manifest.sha256').write_text(sha((self.pack/'manifest.json').read_bytes())+'  manifest.json\n')

class InstallerCorrections(Base):
    def test_complete_and_idempotent(self):
        self.manifest();self.assertEqual(self.run_install()['copied'],3)
        self.assertEqual(self.run_install()['copied'],0)
    def test_mid_copy_failure_rolls_back_and_retry_succeeds(self):
        self.manifest();real=shutil.copyfileobj;calls=0
        def flaky(src,dst,*args):
            nonlocal calls
            calls+=1
            if calls==2:
                dst.write(b'partial');raise OSError('disk full')
            return real(src,dst,*args)
        with mock.patch.object(ipp.shutil,'copyfileobj',flaky):
            with self.assertRaises(OSError):self.run_install()
        self.assertFalse((self.target/'art/a.png').exists())
        self.assertFalse((self.target/'art/b.png').exists())
        self.assertEqual(list(self.target.glob('.modular-install-*')),[])
        self.assertEqual(self.run_install()['copied'],3)
    def test_publication_failure_rolls_back_owned_files_preserves_other_writer(self):
        self.manifest();real=os.link;calls=0
        def race(src,dest):
            nonlocal calls
            calls+=1
            if calls==2:dest.write_bytes(b'OWNER')
            return real(src,dest)
        with mock.patch.object(ipp.os,'link',race):
            with self.assertRaises(FileExistsError):self.run_install()
        self.assertFalse((self.target/'art/a.png').exists())
        self.assertEqual((self.target/'art/b.png').read_bytes(),b'OWNER')
    def test_bad_copy_never_published(self):
        self.manifest()
        with mock.patch.object(ipp.shutil,'copyfileobj',lambda src,dst:dst.write(b'TAMPERED')):
            with self.assertRaisesRegex(ValueError,'staged copy hash'):self.run_install()
        self.assertFalse((self.target/'art/a.png').exists())
    def test_duplicate_refused_before_writes(self):
        m=self.manifest();m['files'].append(m['files'][0])
        (self.pack/'manifest.json').write_text(json.dumps(m));self.seal()
        with self.assertRaisesRegex(ValueError,'duplicate'):self.run_install()
        self.assertFalse((self.target/'art/a.png').exists())
    def test_manifest_corruption_refused(self):
        self.manifest();(self.pack/'manifest.json').write_text('{}')
        with self.assertRaisesRegex(ValueError,'manifest hash'):self.run_install()
    def test_empty_source_contract_refused(self):
        self.manifest(required={})
        with self.assertRaisesRegex(ValueError,'source contract'):self.run_install()
    def test_relative_roots_supported(self):
        self.manifest();cwd=os.getcwd();os.chdir(self.tmp)
        try:
            with contextlib.redirect_stdout(io.StringIO()):ipp.install(Path('pack'),Path('target'),True)
        finally:os.chdir(cwd)
        self.assertEqual((self.target/'art/a.png').read_bytes(),b'A'*10)
    def test_existing_owner_file_preserved(self):
        self.manifest();(self.target/'art').mkdir();(self.target/'art/b.png').write_bytes(b'OWNER')
        with self.assertRaisesRegex(ValueError,'existing file differs'):self.run_install()
        self.assertFalse((self.target/'art/a.png').exists())
        self.assertEqual((self.target/'art/b.png').read_bytes(),b'OWNER')
    def test_source_drift_refused(self):
        self.manifest(required={'src.py':sha(b'other')})
        with self.assertRaisesRegex(ValueError,'incompatible source'):self.run_install()
    def test_escape_refused(self):
        self.manifest(files={'../evil':b'bad'})
        with self.assertRaisesRegex(ValueError,'escapes root'):self.run_install()
    def test_symlink_escape_refused(self):
        elsewhere=self.tmp/'elsewhere';elsewhere.mkdir();os.symlink(elsewhere,self.target/'art')
        self.manifest()
        with self.assertRaisesRegex(ValueError,'escapes root'):self.run_install()
        self.assertEqual(list(elsewhere.iterdir()),[])

if __name__=='__main__':unittest.main(verbosity=2)
