"""Download Layerize outputs from Scenario's signed CDN.

The page gives only each asset's id and Signature; the CloudFront Policy is
rebuilt here (same fixed expiry as every assets-transform link on the account).
Usage: python3 dl_layers.py layers/<person>.json
"""
import base64, json, subprocess, sys, os
from PIL import Image

def url(asset_id, sig, width):
    pol = ('{"Statement":[{"Resource":"https://cdn.cloud.scenario.com/assets-transform/%s?p=100*",'
           '"Condition":{"DateLessThan":{"AWS:EpochTime":1794095999}}}]}' % asset_id)
    p = base64.b64encode(pol.encode()).decode().replace('+', '-').replace('=', '_').replace('/', '~')
    s = sig.replace('+', '-').replace('=', '_').replace('/', '~')
    return ('https://cdn.cloud.scenario.com/assets-transform/%s?p=100&Policy=%s&Key-Pair-Id=K36FIAB9LE2OLR'
            '&Signature=%s&format=png&width=%d' % (asset_id, p, s, width))

info = json.load(open(sys.argv[1]))
d = os.path.splitext(sys.argv[1])[0]
os.makedirs(d, exist_ok=True)
items = [('base', info['base']['id'], info['base']['sig'], int(info['base']['size'].split('x')[0]))]
for L in info['layers']:
    items.append(('z%d' % L['z'], L['id'], L['sig'], int(L['size'].split('x')[0])))
for name, aid, sig, w in items:
    out = os.path.join(d, name + '.png')
    subprocess.run(['curl', '-sL', '-o', out, url(aid, sig, w)], check=True)
    try:
        im = Image.open(out); print(name, im.size, im.mode)
    except Exception as e:
        print(name, 'FAILED', open(out, 'rb').read(200))
