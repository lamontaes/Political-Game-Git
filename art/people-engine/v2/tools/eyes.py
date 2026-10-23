import numpy as np
from PIL import Image
from scipy import ndimage
def eyes_facing(path):
    im=np.asarray(Image.open(path).convert('RGBA')).astype(int)
    a=im[:,:,3]>60
    rows=np.where(a.any(1))[0]; top,bot=rows.min(),rows.max(); h=bot-top
    band=slice(top,top+int(h*0.13))
    head=a[band]
    head=ndimage.binary_erosion(head,iterations=4)
    rgb=im[band][:,:,:3]
    lum=rgb.mean(2)
    dark=head&(lum<90)
    xs=np.where(head.any(0))[0]
    if not dark.sum() or not len(xs): return None,0
    cx=(xs.min()+xs.max())/2
    ex=np.where(dark)[1].mean()
    off=(ex-cx)/(xs.max()-xs.min())
    return ("right" if off>0 else "left"), round(off,3)
if __name__=='__main__':
    import sys
    for i in sys.argv[1:]: print(i, eyes_facing(f'out/figures/{i}.png'))
