# Hololive Calendar（ホロこよみ）改版目標與規範

## 1. 專案改版目標
- **全面視覺重構**：將現有的「hololive曆（非公式）」行事曆網頁改版為兼具精緻感、偶像活力與動畫感的現代 Web 介面。
- **改善使用者體驗**：優化月份切換、成員搜尋、類型篩選、日期卡片以及多成員特殊事件展示的資訊架構與微交互體驗。
- **保持輕量高效**：維持純原生靜態網頁（Vanilla HTML / CSS / JS），不依賴龐大框架或構建工具，可直接部署於 GitHub Pages。

---

## 2. 設計風格參考：[TVアニメ『おでかけホロライブ』(odeholo.com)](https://odeholo.com/)

以「出遊、活力、手帳、動畫紀念」為核心視覺調性：

### 2.1 字體規範 (Typography)
- **主標題 / 震撼標題**：`Zen Maru Gothic`（Google Fonts, Weight 700 / 900）
- **英文 / 數字 / 裝飾字**：`Fredoka`（Google Fonts）
- **日文主要字型 / 圓體**：`Zen Maru Gothic`、`M PLUS Rounded 1c`（Google Fonts）
- **輔助內文字型**：`Noto Sans JP`, sans-serif

### 2.2 色彩與層次 (Color Palette)
- **主視覺色**：
  - 活力主色（Odekake Pink）：`#FF6E9D`
  - 清爽副色（Mint Turquoise / Holo Cyan）：`#31D8D4`、`#42B9EF`
  - 溫暖底色：`#FFFDF9`、`#F7FBFD`
  - 文字主色：`#434343` / `#2D3142`（避免死黑，保持柔和炭黑高閱讀對比度）
- **成員代表色系統**：
  - 保留並完整擴充每位成員的專屬色碼變數（如 `--sora-color`, `--mela-color`, `--tsuzuri-color` 等）。
  - 事件標籤（Badge）運用成員代表色並兼顧文字可讀性（採用明亮色調與柔和半透明膠囊背景，嚴禁死板使用 border-left）。

### 2.3 元件外觀與氛圍 (Aesthetics & Components)
- **拍立得 / 手帳貼紙感**：
  - 大圓角設計（`border-radius: 12px ~ 24px`）
  - 柔和立體感陰影（Soft Drop Shadow）與精緻細外框
  - 膠囊型篩選鈕（Pill-shaped toggle buttons）與精緻搜尋框
- **微動態與互動感**：
  - 按鈕與日期格子的 Hover 上浮動態（Smooth Lift & Scale）
  - 切換月份平滑過渡
  - 多成員特殊活動的摺疊展開優化

---

## 3. 技術規格與瀏覽器支援

- **瀏覽器支援標準**：
  - **CSS support Chrome 152 以上**
  - 可充分運用現代原生 CSS 特性（Modern Web Standards）：
    - 原生 CSS Nesting
    - `:has()` 選取器
    - CSS Grid & Flexbox
    - CSS 自訂屬性（Custom Properties / Variables）
    - 現代色彩與漸層函式
    - CSS `transition` & 微動畫
- **靜態檔案規範**：
  - 核心檔案：`index.html`, `style.css`, `app.js`
  - 資料檔案：`fixed-events.json`, `special-events.json`
  - 嚴格維持純前端靜態運作，不引入需 Node.js 構建之打包套件。

---

## 4. 代碼風格規範 (Code Style Guidelines)
- **縮排**：HTML、CSS、JS 統一為 **2 格空格**。
- **CSS 規範**：
  - 使用現代原生巢狀（**CSS Nesting**，如 `&.birthday`, `&:hover`, `&:has(...)`）。
  - Class 名稱、ID、變數命名一律使用 kebab-case（例如：`calendar-grid`, `day-cell`, `event-member`）。
- **JavaScript 規範**：
  - 變數、函式命名一律使用 camelCase（例如：`calendarGrid`, `monthLabel`, `searchKeyword`, `filterCheckboxes`）。
- **風格一致性**：後續新增與修改皆嚴格遵循此風格。

---

## 5. 頁面架構與視圖規範 (Views & Navigation)

### 5.1 側邊欄導航 (Sidebar Navigation)
- 項目包含：
  - 🏠 **首頁**：今日與近期焦點流
  - 📅 **完整月曆**：自訂查看完整月份行事曆
  - 👥 **成員**：成員名冊與專屬頁面
- 手機版與桌機版一致：頂部漢堡選單（Hamburger Menu）+ 平滑滑出的手帳抽屜（Drawer），側欄預設不呈現，首屏空間留給內容。
- 抽屜內容：Logo、導航按鈕、當前活動視圖切換；點遮罩或按 Esc 關閉。

### 5.2 視圖 1：首頁 (First-View: Today & Upcoming)
- **非死板月曆**：預設進入不直接顯示大表格。
- **今日有什麼 (Today's Events)**：
  - 拍立得/應援卡片風格大幅呈現當日的壽星、出道紀念或重大 Live。
- **最近有什麼 (Upcoming Events + Countdown)**：
  - 依日期先後列出即將到來的事件清單。
  - 每一張活動卡片清楚標記「**還有多久**」（倒數天數，例如「今天」、「明天」、「還有 3 天」等精準標籤）。

### 5.3 視圖 2：完整月曆 (Full Calendar View)
- 點擊側邊欄「完整月曆」後切換。
- 現代 7 欄卡片式月曆，附帶年月切換按鈕、回到今天、類型篩選膠囊與搜尋欄。

### 5.4 視圖 3：成員專屬視圖 (Member Spotlight View)
- 點擊側邊欄「成員」進入成員列表。
- 點擊特定成員後，**畫面整體以該成員為主**：
  - 該成員專屬的主題配色風格與頭像/推符 Banner。
  - 成員固定紀念日（生日、出道日）以及「距離下次還有多久」倒數計時。
  - 該成員所有參與過的特殊活動（Live、見面會等）歷史與未來日程卡片。


