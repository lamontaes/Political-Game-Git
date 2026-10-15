cd "$(dirname "$0")"
{ cat head.py; cat screens2.py; cat tail.py; } > build2.py
sed -i '' 's/CSS = open("screens.css").read()/CSS = open("screens.css").read() + open("screens2.css").read()/' build2.py
python3 build2.py || exit 1
for k in ${@:-$(ls page/shot | sed 's/.html//')}; do "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=4000 --screenshot=shots2/$k.png "file://$PWD/page/shot/$k.html" 2>/dev/null; done
