import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
def job(p):
    if os.path.exists(f"backdrops/{p}__night.jpg"):
        subprocess.run([sys.executable, "seat_lights.py", f"final3/{p}", f"backdrops/{p}__midday.jpg",
                        f"morning=backdrops/{p}__morning.jpg", f"night=backdrops/{p}__night.jpg", f"rain=backdrops/{p}__rain.jpg"],
                       check=True, capture_output=True)
    r = subprocess.run([sys.executable, "pack_atlas.py", f"final3/{p}", f"pack3/{p}"], check=True, capture_output=True, text=True)
    return r.stdout.strip()
with ThreadPoolExecutor(4) as ex:
    for line in ex.map(job, sorted(os.listdir("final3"))):
        print(line, flush=True)
print("PACKED")
