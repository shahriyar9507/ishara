import json, base64, time
from pathlib import Path
from urllib.request import Request, urlopen
CREDS=json.loads((Path.home()/".kaggle"/"kaggle.json").read_text())
USER,KEY=CREDS["username"],CREDS["key"]
BASIC="Basic "+base64.b64encode(f"{USER}:{KEY}".encode()).decode()
OUT=Path(__file__).resolve().parent.parent.parent/"web"/"public"/"models"/"words"
OUT.mkdir(parents=True, exist_ok=True)
url=f"https://www.kaggle.com/api/v1/kernels/output?userName={USER}&kernelSlug=ishara-word-train"
def out():
    try: return json.loads(urlopen(Request(url,headers={"Authorization":BASIC})).read())
    except Exception as e: return {"files":[],"log":"","err":str(e)}
time.sleep(180)
for i in range(160):  # up to ~2h
    d=out(); files=[f.get("fileName") for f in d.get("files",[])]
    print(f"[{i}] files={files}", flush=True)
    if "word_model.json" in files:
        for f in d["files"]:
            if f.get("url"): (OUT/f["fileName"]).write_bytes(urlopen(Request(f["url"])).read()); print("pulled",f["fileName"])
        print("DONE"); break
    log=d.get("log") or ""
    if '"TEST ACCURACY' in log or 'Traceback' in log:
        print("LOG TAIL:", log[-800:])
    time.sleep(45)
