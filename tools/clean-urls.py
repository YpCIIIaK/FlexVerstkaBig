import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def clean(src):
    def fix(m):
        attr, q, url = m.group(1), m.group(2), m.group(3)
        if re.match(r"^(https?:|mailto:|tel:|#|data:|javascript:)", url):
            return m.group(0)
        mm = re.match(r"^((?:\.\./)*|/)?([\w/-]*?)([\w-]+)\.html([?#].*)?$", url)
        if not mm:
            return m.group(0)
        up, folder, name, rest = mm.group(1) or "", mm.group(2), mm.group(3), mm.group(4) or ""
        if name == "index":
            path = up + folder or "./"
        else:
            path = up + folder + name
        return f"{attr}={q}{path}{rest}"
    return re.sub(r'\b(href|action)=(["\'])([^"\']*)', fix, src)


if __name__ == "__main__":
    os.chdir(ROOT)
    n = 0
    for f in glob.glob("**/*.html", recursive=True):
        if f.startswith(("tools", "deploy", "node_modules")):
            continue
        t = open(f, encoding="utf-8").read()
        u = clean(t)
        if u != t:
            open(f, "w", encoding="utf-8").write(u)
            n += 1
    print(n)
