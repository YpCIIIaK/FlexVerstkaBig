import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATS = {"stiki": "sticks", "ustroystva": "devices"}
SKIP = ("http:", "https:", "mailto:", "tel:", "#", "/", "data:", "javascript:")


def relink(src, up):
    def fix(m):
        attr, q, url = m.group(1), m.group(2), m.group(3)
        if not url or url.startswith(SKIP) or not re.match(r"^[\w.-]+(?:/|\.(?:html|webp|png|jpe?g|svg|mp4|webm|css|js))", url):
            return m.group(0)
        return f"{attr}={q}{up}{url}"
    src = re.sub(r'\b(href|src|srcset|poster|data-[a-z-]+)=(["\'])([^"\']*)', fix, src)
    src = re.sub(r'"((?:\.\./)*assets/[^"]+)"', lambda m: '"' + (m.group(1) if m.group(1).startswith(up) else up + m.group(1)) + '"', src)
    return src


def build(base_dir, up_extra):
    src = open(os.path.join(ROOT, base_dir, "catalog.html"), encoding="utf-8").read()
    for slug, cat in CATS.items():
        out = relink(src, "../../")
        out = out.replace("<main class=\"catalog\"", f"<main class=\"catalog\" data-catalog-category=\"{cat}\"", 1)
        d = os.path.join(ROOT, base_dir, "catalog", slug)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(out)


if __name__ == "__main__":
    build("", "")
    if os.path.exists(os.path.join(ROOT, "kz", "catalog.html")):
        build("kz", "../")
