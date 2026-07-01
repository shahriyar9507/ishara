import json, base64, time
from pathlib import Path
from urllib.request import Request, urlopen
CREDS=json.loads((Path.home()/".kaggle"/"kaggle.json").read_text())
USER,KEY=CREDS["username"],CREDS["key"]
BASIC="Basic "+base64.b64encode(f"{USER}:{KEY}".encode()).decode()
OUT=Path(__file__).resolve().parent.parent.parent/"web"/"public"/"refs"/"words"
OUT.mkdir(parents=True, exist_ok=True)
url=f"https://www.kaggle.com/api/v1/kernels/output?userName={USER}&kernelSlug=ishara-refs"
def out():
    try: return json.loads(urlopen(Request(url,headers={"Authorization":BASIC})).read())
    except Exception as e: return {"files":[],"err":str(e)}
time.sleep(120)
for i in range(80):
    d=out(); files=[f for f in d.get("files",[]) if f.get("fileName","").endswith(".mp4")]
    print(f"[{i}] mp4 files={len(files)}", flush=True)
    if len(files) >= 55:  # got essentially all 60
        for f in files:
            if f.get("url"):
                (OUT/f["fileName"]).write_bytes(urlopen(Request(f["url"])).read())
        print("pulled", len(files), "ref clips ->", OUT); break
    time.sleep(30)
