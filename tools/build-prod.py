import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {".env.example", ".gitignore", ".vercelignore", "README.md", "middleware.js", "server.js", "vercel.json", "api/proxy.js"}
SKIP_DIRS = ("tools/", "deploy/")
SERVER = "deploy/plesk/"


def git(*args, cwd=ROOT):
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def main():
    if git("status", "--porcelain", "--untracked-files=no"):
        sys.exit("main has uncommitted changes")
    head = git("rev-parse", "--short", "HEAD")
    files = git("ls-files", "-z").split("\0")
    out = {}
    for f in filter(None, files):
        if f.startswith(SERVER):
            out[f[len(SERVER):]] = f
        elif f not in SKIP and not f.startswith(SKIP_DIRS):
            out.setdefault(f, f)

    tmp = tempfile.mkdtemp(prefix="flex-prod-")
    try:
        has_prod = subprocess.run(["git", "rev-parse", "--verify", "-q", "prod"], cwd=ROOT, capture_output=True).returncode == 0
        if has_prod:
            git("worktree", "add", "-f", tmp, "prod")
        else:
            git("worktree", "add", "-f", "--detach", tmp)
            git("checkout", "--orphan", "prod", cwd=tmp)
        for name in os.listdir(tmp):
            if name == ".git":
                continue
            p = os.path.join(tmp, name)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
        for dst, src in out.items():
            target = os.path.join(tmp, dst)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copyfile(os.path.join(ROOT, src), target)
        git("add", "-A", cwd=tmp)
        if not git("status", "--porcelain", cwd=tmp):
            print("prod is up to date")
            return
        git("commit", "-q", "-m", "prod из main " + head, cwd=tmp)
        print("prod <- main", head, len(out), "files")
    finally:
        subprocess.run(["git", "worktree", "remove", "--force", tmp], cwd=ROOT, capture_output=True)
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
