"""Anatomy edge padding is bounded, hidden under fabric and material-owned."""
import unittest,tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from source_parts import separate
from intake import digest
class UnderlapTests(unittest.TestCase):
 def test_real_overlap_without_foreground_skin_or_expanded_silhouette(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)
   def ref(name,array):
    p=root/name;Image.fromarray(array).save(p);return {'path':name,'sha256':digest(p.read_bytes())}
   paint=np.full((20,20,4),(20,60,100,255),np.uint8);paint[:,:10]=(220,145,100,255)
   skin=np.zeros((20,20),np.uint8);skin[:,:10]=255;cloth=255-skin
   sr=ref('skin.png',skin)
   d={'source':ref('paint.png',paint),'canvas':[20,20],'outputCanvas':[20,20],'transform':{'scale':1,'dx':0,'dy':0},'ownershipMask':sr,'underlapPixels':4,'underlapIntoMask':ref('cloth.png',cloth),'materials':{'skin':{'mask':sr,'shadeLuminance':[40,145,240]}},'materialSampling':'coverage-normalized-area-v2'}
   body,maps=separate(root,d);a=np.array(body);m=np.array(maps['skin'])
   np.testing.assert_array_equal(a[:,10:14,:3],np.full((20,4,3),(220,145,100),np.uint8))
   self.assertTrue((a[:,10:14,3]==255).all());self.assertTrue((m[:,10:14,3]==255).all())
   self.assertTrue((a[:,14:,3]==0).all())
   top=paint.copy();top[:,:10,3]=0
   composite=np.array(Image.alpha_composite(body,Image.fromarray(top)))
   np.testing.assert_array_equal(composite,paint)
if __name__=='__main__':unittest.main()
