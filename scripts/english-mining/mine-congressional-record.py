# Mines Congressional Record day folders (unzipped CREC-YYYY-MM-DD.zip, House and Senate
# pages only) for sourced English parts. Usage: python3 -I mine-congressional-record.py <dir> [move]
# Day zips: https://www.govinfo.gov/content/pkg/CREC-YYYY-MM-DD.zip (public domain).
import re,glob,html,sys,json,collections
SPK=re.compile(r"^(?:Mr|Ms|Mrs)\. [A-Z][A-Z'-]+(?: of [A-Z][a-z]+(?: [A-Z][a-z]+)?)?\. (.+)$")
ADDR=re.compile(r"^(Madam|Mr\.) (Speaker|President|Chair|Chairman|Chairwoman), ")
def paras(t):
  t=re.sub(r'<[^>]+>','',html.unescape(t)); out=[]; cur=None
  for line in t.split('\n'):
    if re.match(r'^  \S',line):
      if cur: out.append(cur)
      cur=line.strip()
    elif line.strip() and cur is not None: cur+=' '+line.strip()
    else:
      if cur: out.append(cur); cur=None
  if cur: out.append(cur)
  return out
def first_sentence(s):
  m=re.search(r'(?<![A-Z][a-z])(?<!Mr)(?<!Ms)(?<!Mrs)(?<!Dr)[.?!](?=\s|$)',s)
  return s[:m.end()] if m else s
res=collections.OrderedDict()
for f in sorted(glob.glob(sys.argv[1]+'/**/*.htm',recursive=True)):
  gran=f.split('/')[-1][:-4]
  for p in paras(open(f,errors='ignore').read()):
    m=SPK.match(p)
    if not m: continue
    body=m.group(1); a=ADDR.match(body)
    if not a: continue
    rest=first_sentence(body[a.end():])
    words=rest.split()
    if len(words)>16 or len(words)<4: continue
    if re.search(r'\d|\(|"|;',rest): continue
    # drop proper nouns after first word
    if any(w[0].isupper() and w not in ('I',"I'm") for w in words[1:]): continue
    key=rest.lower()
    if key in res: continue
    res[key]={"text":"{chair}, "+rest,"source":{"document":"Congressional Record","granule":gran,"url":"https://www.govinfo.gov/app/details/"+gran.split('-Pg')[0][:15]+"/"+gran}}
OBJ=r"(?:this|the)(?: \w+)? (?:bill|resolution|legislation|amendment|motion|rule|nomination|measure|conference report)"
OPENERS=[r"I rise(?: today)? in(?: strong)? (?:support|opposition) (?:of|to) "+OBJ+r"\.",
 r"I rise(?: today)? (?:with a heavy heart|with a profound sense of loss)\.",
 r"I rise(?: today)? to (?:speak briefly|ask a point of parliamentary inquiry|be recognized)\.?(?: in gratitude today\.)?",
 r"I rise(?: today)? to (?:honor|recognize|celebrate|remember) (?:the life|a|an|my|our) [^.]{0,40}\.",
 r"I am here today because I (?:oppose|support) "+OBJ+r"\.",
 r"I thank (?:the|my) (?:gentleman|gentlemen|gentlewoman|chairman|chairwoman|chair|ranking member|vice chair of the committee|colleague|majority leader|minority leader)(?: from \w+)? for (?:yielding|the time|this time|yielding the time|yielding time|yielding me time)(?: to me)?(?: and for (?:his|her|your) (?:leadership|strong support))?\."]
mv=sys.argv[2] if len(sys.argv)>2 else None
for v in res.values():
  body=v['text'][len('{chair}, '):]
  if mv=='opener':
    if not any(re.fullmatch(r,body) for r in OPENERS): continue
    v['move']='opener'
  print(json.dumps(v))
