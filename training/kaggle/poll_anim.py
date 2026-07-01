import json, base64, time, os
from pathlib import Path
from urllib.request import Request, urlopen
CREDS=json.loads((Path.home()/".kaggle"/"kaggle.json").read_text())
USER,KEY=CREDS["username"],CREDS["key"]
BASIC="Basic "+base64.b64encode(f"{USER}:{KEY}".encode()).decode()
OUT=Path("../../web/public/animations").resolve(); OUT.mkdir(parents=True, exist_ok=True)
url=f"https://www.kaggle.com/api/v1/kernels/output?userName={USER}&kernelSlug=ishara-animations"
def out():
    try: return json.loads(urlopen(Request(url,headers={"Authorization":BASIC})).read())
    except Exception as e: return {"files":[],"err":str(e)}
time.sleep(150)
for i in range(120):
    d=out(); files=[f for f in d.get("files",[]) if f.get("fileName","").endswith(".json")]
    print(f"[{i}] json files={len(files)}", flush=True)
    if files:
        for f in files:
            if f.get("url"):
                (OUT/os.path.basename(f["fileName"])).write_bytes(urlopen(Request(f["url"].replace(" ","%20"))).read())
        print("pulled ->", OUT); break
    time.sleep(30)
