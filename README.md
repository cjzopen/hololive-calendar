# HOLOLIVE CALENDER

https://cjzopen.github.io/hololive-calendar/

## tools

  - node tools/build-static-html.mjs：改完 fixed-events.json 後執行，把成員名冊預先寫進 index.html 的 static-members 區段
  - python tools/minify.py：產出 *.min.js 和 *.min.css。index.html 載入的是 min 版，所以改完原始檔要記得重跑
  - .github/workflows/update-avatars.yml：每月更新頭像