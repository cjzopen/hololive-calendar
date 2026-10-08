"""
Minify style.css, app.js, and icons.js into *.min.* files.
Usage:
  python tools/minify.py
"""
import os
import re

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

try:
    import rcssmin
    import rjsmin

    def minify_css(content):
        return rcssmin.cssmin(content)

    def minify_js(content):
        return rjsmin.jsmin(content)

except ImportError:
    # Fallback basic minifier if packages are not installed
    def minify_css(content):
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'\s+', ' ', content)
        content = re.sub(r'\s*([\{\}\:\;\,])\s*', r'\1', content)
        return content.strip()

    def minify_js(content):
        content = re.sub(r'//.*?\n', '\n', content)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        return re.sub(r'^\s+', '', content, flags=re.MULTILINE).strip()

tasks = [
    ("style.css", "style.min.css", minify_css),
    ("app.js", "app.min.js", minify_js),
    ("icons.js", "icons.min.js", minify_js),
    ("fun-days.js", "fun-days.min.js", minify_js),
]

for src_name, dst_name, minifier in tasks:
    src_path = os.path.join(root_dir, src_name)
    dst_path = os.path.join(root_dir, dst_name)
    with open(src_path, "r", encoding="utf-8") as f:
        src_code = f.read()
    min_code = minifier(src_code)
    with open(dst_path, "w", encoding="utf-8") as f:
        f.write(min_code)
    reduction = (1 - len(min_code) / len(src_code)) * 100
    print(f"{src_name} ({len(src_code):,} B) -> {dst_name} ({len(min_code):,} B) [{reduction:.1f}% reduction]")
