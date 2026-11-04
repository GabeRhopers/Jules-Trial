# Downloads the CC0 (public domain) assets used by the DTI HDD explainer from Poly Haven (polyhaven.com,
# license: CC0, no attribution required). Re-run to restore them: python3 scripts/hdd-fetch-cc0.py
import json, os, sys, urllib.request
OUT = "public/hdd/cc0"
TEX = ["asphalt_02", "brushed_concrete", "red_brick_03", "grey_plaster_02", "brown_mud_02", "brown_mud_dry", "aerial_sand",
       "bicolour_gravel", "grass_path_2", "clean_pebbles", "coast_sand_rocks_02", "forest_leaves_02", "metal_plate"]
MODELS = ["shrub_02", "fire_hydrant", "street_lamp_01", "concrete_road_barrier", "grass_medium_01"]
HDRI = "kloofendal_48d_partly_cloudy_puresky"
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "hdd-explainer-asset-fetch"})).read()
def save(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        open(path, "wb").write(get(url))
log = []
for t in TEX:
    f = json.loads(get(f"https://api.polyhaven.com/files/{t}"))
    for kind, key in [("diff", "Diffuse"), ("nor", "nor_gl"), ("rough", "Rough")]:
        if key in f and "1k" in f[key]:
            save(f[key]["1k"]["jpg"]["url"], f"{OUT}/tex/{t}_{kind}.jpg")
    log.append(f"texture {t}")
for m in MODELS:
    f = json.loads(get(f"https://api.polyhaven.com/files/{m}"))
    g = f["gltf"]["1k"]["gltf"]
    save(g["url"], f"{OUT}/models/{m}/{m}.gltf")
    for rel, inc in g.get("include", {}).items():
        save(inc["url"], f"{OUT}/models/{m}/{rel}")
    log.append(f"model {m}")
f = json.loads(get(f"https://api.polyhaven.com/files/{HDRI}"))
save(f["hdri"]["1k"]["hdr"]["url"], f"{OUT}/hdri/{HDRI}_1k.hdr")
log.append(f"hdri {HDRI}")
open(f"{OUT}/README.md", "w").write("# CC0 assets from Poly Haven\n\nAll files in this folder come from https://polyhaven.com (license CC0 1.0: public domain, commercial use allowed, no attribution required). Downloaded by scripts/hdd-fetch-cc0.py.\n\n" + "\n".join(f"- {x}: https://polyhaven.com/a/{x.split(' ')[1]}" for x in log) + "\n")
print("\n".join(log))
