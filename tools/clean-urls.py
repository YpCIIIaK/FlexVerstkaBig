import glob
import os
import posixpath
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = re.compile(r"^(https?:|mailto:|tel:|#|data:|javascript:|blob:|/|\{)")


def clean(url):
    m = re.match(r"^((?:\.\./)*|/)?([\w/.-]*?)([\w-]+)\.html([?#].*)?$", url)
    if not m:
        return url
    up, folder, name, rest = m.group(1) or "", m.group(2), m.group(3), m.group(4) or ""
    path = up + folder if name == "index" else up + folder + name
    return (path or "./") + rest


def exists(path):
    p = os.path.join(ROOT, path.lstrip("/"))
    return os.path.isfile(p) or os.path.isdir(p) or os.path.isfile(p + ".html") or path == "/"


def absolute(url, page_dir):
    if not url or SKIP.match(url):
        return url
    m = re.match(r"^([^?#]*)(.*)$", url)
    path, rest = m.group(1), m.group(2)
    if not path:
        return url
    resolved = posixpath.normpath(posixpath.join("/" + page_dir, path))
    if path.endswith("/") or path in (".", "./"):
        resolved = resolved.rstrip("/") + "/"
    if not exists(resolved):
        return url
    return resolved + rest


def process(src, page_dir):
    def attr(m):
        name, q, val = m.group(1), m.group(2), m.group(3)
        if name in ("href", "action"):
            val = clean(val)
        if name == "srcset":
            parts = [p.strip().split(None, 1) for p in val.split(",") if p.strip()]
            val = ", ".join(" ".join([absolute(p[0], page_dir)] + p[1:]) for p in parts)
        else:
            val = absolute(val, page_dir)
        return f"{name}={q}{val}"
    return re.sub(r'\b(href|src|srcset|poster|action|data-[a-z-]+)=(["\'])([^"\']*)', attr, src)


if __name__ == "__main__":
    os.chdir(ROOT)
    n = 0
    for f in glob.glob("**/*.html", recursive=True):
        if f.startswith(("tools", "deploy", "node_modules")):
            continue
        page_dir = os.path.dirname(f).replace("\\", "/")
        t = open(f, encoding="utf-8").read()
        u = process(t, page_dir)
        if u != t:
            open(f, "w", encoding="utf-8").write(u)
            n += 1
    print(n)
