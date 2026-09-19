import copy
import unittest
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw
from intake import fit_head, digest
from rig import JOINTS, JOINTS_V2, OWNERS, validate_profile, body_descriptor
from intake import IntakeError

class ProfileTests(unittest.TestCase):
    def profile(self):
        return {'schema':'modular-body-profile-v1','id':'unseen-body','revision':'1',
                'canvas':[600,1200],'confidence':'visual-estimate','provenance':'authored fixture',
                'ownership':{k:list(v) for k,v in OWNERS.items()},
                'headSize':{'heightRange':[140,170],'widthRange':[90,150],'preferredHeight':153},
                'poses':{'standing-neutral':{'view':'front','landmarks':{k:[300,600] for k in JOINTS},
                    'sourceTransform':{'scale':.78,'dx':-99.36,'dy':12}}}}

    def test_directional_profile_requires_authored_source_and_explicit_pose(self):
        p=self.profile();p['schema']='modular-body-profile-v2'
        pose=p['poses'].pop('standing-neutral');p['poses']['seated-left']=pose
        pose.update(view='three-quarter-left', supportedHeadViews=['three-quarter-left'],
          landmarks={k:[300,600] for k in JOINTS_V2},
          source={'path':'new-view.png','sha256':'authored'},sourceCanvas=[1200,2400],
          compatibleSourcePoses=['seated-left'],contacts={'feet':[300,1100],'leftFoot':[220,1100],'rightFoot':[380,1100],'seat':[300,700],'hands':{'left':[210,660],'right':[370,660]}})
        b=body_descriptor(p,'seated-left')
        self.assertEqual(b['view'],'three-quarter-left')
        self.assertEqual(b['compatibleSourcePoses'],['seated-left'])
        for hands in ('on thighs', {'left': [210, 660]}, {'left': [True, 660], 'right': None}, {'left': [610, 660], 'right': None}):
            invalid=copy.deepcopy(p)
            invalid['poses']['seated-left']['contacts']['hands']=hands
            with self.subTest(hands=hands), self.assertRaises(IntakeError):
                validate_profile(invalid)
        standing=copy.deepcopy(p)
        standing['poses']['seated-left']['contacts']['hands']={'left':None,'right':None}
        validate_profile(standing)
        del pose['source']
        with self.assertRaises(IntakeError):validate_profile(p)

    def test_unseen_profile_maps_without_name_rules(self):
        p=self.profile(); b=body_descriptor(p,'standing-neutral')
        self.assertEqual(b['neckOwnership'],'body-layer')
        self.assertEqual(b['socket']['attachment'],[300,600])
        q=copy.deepcopy(p);q['poses']['standing-neutral']['landmarks']['jaw'][1]-=4
        self.assertNotEqual(validate_profile(p),validate_profile(q))

    def test_no_invented_view_or_enlargement(self):
        for key,value,code in [('view','side','incompatible_view'),('sourceTransform',{'scale':1.01,'dx':0,'dy':0},'native_detail_shortfall')]:
            p=self.profile();p['poses']['standing-neutral'][key]=value
            with self.assertRaises(IntakeError) as e:validate_profile(p)
            self.assertEqual(e.exception.code,code)

    def test_missing_landmark_is_not_zero(self):
        p=self.profile();del p['poses']['standing-neutral']['landmarks']['seat']
        with self.assertRaises(IntakeError) as e:validate_profile(p)
        self.assertEqual(e.exception.code,'missing_geometry')

    def test_body_owned_neck_is_never_added_to_face(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            im=Image.new('RGBA',(200,200));ImageDraw.Draw(im).ellipse((50,10,149,159),fill=(180,120,80,255))
            mask=Image.new('L',im.size,255)
            def put(name,image):
                p=root/name;image.save(p);return {'path':name,'sha256':digest(p.read_bytes())}
            h={'schemaVersion':1,'id':'unseen-face','canvas':[200,200],
               'view':'front','pose':'standing-neutral',
               'calibration':{'status':'calibrated','version':'fixture','confidence':'specified','provenance':'synthetic curved-alpha fixture'},
               'geometry':{'anatomy':[50,10,150,160],'crown':[100,10],'chin':[100,160],'eyeLine':70,'attachment':[100,160]},
               'paint':put('paint.png',im),'anatomyMask':put('anatomy.png',mask),'ownershipMask':put('owner.png',mask),'materialMaps':{}}
            b=body_descriptor(self.profile(),'standing-neutral')
            b['socket'].update(heightRange=[150,150],widthRange=[100,100],preferredHeight=150,attachment=[300,200])
            p,m,r=fit_head(root,h,b)
            self.assertEqual(r['algorithm'],'semantic-fit-v2')
            self.assertEqual(p.getchannel('A').getbbox(),(250,50,350,200))
            self.assertEqual(p.getpixel((300,201))[3],0)
            self.assertEqual(m,{})

if __name__=='__main__':unittest.main()
