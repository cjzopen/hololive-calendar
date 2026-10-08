// ----------------------------------------------------
// Fun Days 特效（由 app.js 在今天沒有事件、且 fun-days.json 有對應節日時才載入）
// 每個節日各自實作：style 是該特效的 CSS，start(layer, { day, close }) 把特效元素放進整頁圖層，
// 可回傳清理函式；dismissible 的特效被關閉後當天不再出現
// fun-days.json 裡沒寫 effect（或還沒有對應特效）的節日，改跳出提醒卡片
// ----------------------------------------------------
(() => {
  const FUN_DAY_EFFECTS = {
    // 天使の日：羽毛從上方飄落
    // 每片羽毛分四層：落下（斜向漂移）> 搖曳（鐘擺）> 初始角度 > 立體翻轉
    angel: {
      style: `
        .fun-feather {
          position: absolute;
          top: 0;
          left: var(--x);
          width: var(--size);
          animation: fun-feather-fall var(--dur) linear var(--delay) infinite backwards;
          will-change: transform;
        }

        .fun-feather-sway {
          animation: fun-feather-sway var(--sway-dur) ease-in-out var(--delay) infinite alternate backwards;
        }

        .fun-feather-angle {
          transform: rotate(var(--angle)) scaleX(var(--flip));
        }

        .fun-feather img {
          display: block;
          width: 100%;
          height: auto;
          opacity: var(--alpha);
          /* 白色羽毛在淺色底上需要陰影才看得出輪廓 */
          filter: drop-shadow(0 2px 4px rgb(80 110 140 / .35));
          animation: fun-feather-tumble var(--tumble-dur) ease-in-out var(--delay) infinite alternate backwards;
          -webkit-user-drag: none;
        }

        @keyframes fun-feather-fall {
          from { transform: translate(0, -25vh); }
          to   { transform: translate(var(--drift), 115vh); }
        }

        /* 落葉式的鐘擺：擺到兩端時翹起，經過中間時往下沉 */
        @keyframes fun-feather-sway {
          0%   { transform: translate(calc(var(--sway) * -1), 0) rotate(calc(var(--tilt) * -1)); }
          50%  { transform: translate(0, var(--dip)) rotate(0deg); }
          100% { transform: translate(var(--sway), 0) rotate(var(--tilt)); }
        }

        @keyframes fun-feather-tumble {
          from { transform: perspective(500px) rotate3d(1, var(--axis), 0, calc(var(--turn) * -1)); }
          to   { transform: perspective(500px) rotate3d(1, var(--axis), 0, var(--turn)); }
        }
      `,
      start(layer) {
        const src = "https://cjzopen.github.io/amanekanata/assets/images/feather.webp";
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const count = isMobile ? 5 : 8;
        const scale = isMobile ? .75 : 1;
        const rand = (min, max) => min + Math.random() * (max - min);

        for (let i = 0; i < count; i++) {
          const feather = document.createElement("div");
          feather.className = "fun-feather";
          // 平均分散在畫面寬度上，再加一點隨機偏移
          feather.style.setProperty("--x", `${((i + Math.random()) / count) * 100}%`);
          feather.style.setProperty("--size", `${rand(100, 180) * scale}px`);
          feather.style.setProperty("--alpha", rand(.85, 1).toFixed(2));
          feather.style.setProperty("--dur", `${rand(22, 34)}s`);
          // 錯開出場，不要一開始全部同時落下
          feather.style.setProperty("--delay", `${(i / count) * 16 + rand(0, 3)}s`);
          feather.style.setProperty("--drift", `${rand(-15, 15)}vw`);
          feather.style.setProperty("--sway", `${rand(60, 140) * scale}px`);
          feather.style.setProperty("--sway-dur", `${rand(3.5, 5.5)}s`);
          feather.style.setProperty("--tilt", `${rand(25, 45)}deg`);
          feather.style.setProperty("--dip", `${rand(15, 35)}px`);
          feather.style.setProperty("--angle", `${rand(-60, 60)}deg`);
          feather.style.setProperty("--flip", Math.random() < .5 ? -1 : 1);
          feather.style.setProperty("--axis", rand(-1, 1).toFixed(2));
          feather.style.setProperty("--turn", `${rand(35, 65)}deg`);
          feather.style.setProperty("--tumble-dur", `${rand(4, 7)}s`);

          const sway = document.createElement("div");
          sway.className = "fun-feather-sway";
          const angle = document.createElement("div");
          angle.className = "fun-feather-angle";
          const img = document.createElement("img");
          img.src = src;
          img.alt = "";
          img.draggable = false;
          img.decoding = "async";
          angle.append(img);
          sway.append(angle);
          feather.append(sway);
          layer.append(feather);
        }
      }
    },

    // 七夕：夜空背景＋畫面中央垂下一張許願籤，直書由右到左逐字寫出願望，
    // 寫完被風吹得持續隨機翻轉，翻的同時淡出，特效結束（點一下或按 Esc 可提前關閉）
    // 願望文字來自 fun-days.json 的 lines（每個元素一行）
    tanabata: {
      dismissible: true,
      style: `
        .fun-day-layer.is-tanabata {
          z-index: 110;
          display: grid;
          place-items: center;
          pointer-events: auto;
          cursor: pointer;
          background: radial-gradient(ellipse at 50% 20%, rgb(52 62 130 / .6), rgb(12 16 46 / .82));
          animation: fun-tanabata-fade-in .8s ease both;
        }

        .fun-tanabata-star {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          background-color: #fffbe0;
          box-shadow: 0 0 6px 1px rgb(255 245 190 / .8);
          animation: fun-tanabata-twinkle var(--dur) ease-in-out var(--delay) infinite alternate;
        }

        .fun-tanzaku-drop {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: -6vh;
          transform-origin: 50% -30vh;
          perspective: 900px;
          animation: fun-tanzaku-drop 1.6s var(--ease-out) both;
        }

        .fun-tanzaku-sway {
          display: flex;
          flex-direction: column;
          align-items: center;
          transform-origin: 50% -30vh;
          transform-style: preserve-3d;
          animation: fun-tanzaku-sway 3.6s ease-in-out 1.6s infinite alternate;
        }

        /* 綁許願籤的紅繩，往上延伸出畫面 */
        .fun-tanzaku-cord {
          width: 2px;
          height: 30vh;
          margin-top: -30vh;
          margin-bottom: -10px;
          background-color: #d8434b;
        }

        .fun-tanzaku {
          position: relative;
          display: flex;
          justify-content: center;
          padding: 3.4rem 2rem 3rem;
          min-width: clamp(118px, 30vw, 150px);
          border-radius: 3px;
          background-color: #fff3b8;
          background-image:
            repeating-linear-gradient(100deg, rgb(255 255 255 / .25) 0 2px, transparent 2px 7px),
            linear-gradient(to bottom, #fff6c9, #ffe58a);
          box-shadow: 0 18px 40px rgb(0 0 0 / .35), inset 0 0 0 1px rgb(200 160 40 / .25);
          transform-style: preserve-3d;
          backface-visibility: hidden;

          /* 穿繩的小孔 */
          &::before {
            content: "";
            position: absolute;
            top: 1.2rem;
            left: 50%;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: rgb(12 16 46 / .7);
            translate: -50% 0;
            backface-visibility: hidden;
          }

          /* 背面：翻面時看到的是沒有字的紙（含同位置的小孔） */
          &::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background-image:
              radial-gradient(circle 5px at 50% calc(1.2rem + 5px), rgb(12 16 46 / .7) 4.5px, transparent 5px),
              repeating-linear-gradient(80deg, rgb(255 255 255 / .25) 0 2px, transparent 2px 7px),
              linear-gradient(to bottom, #fff1b5, #ffe07a);
            box-shadow: inset 0 0 0 1px rgb(200 160 40 / .25);
            transform: rotateY(180deg);
            backface-visibility: hidden;
          }
        }

        .fun-tanzaku-wish {
          writing-mode: vertical-rl;
          color: #3b2716;
          font-family: "Yuji Syuku", serif;
          font-size: clamp(24px, 6.5vw, 32px);
          line-height: 1.8;
          letter-spacing: .1em;
          white-space: nowrap;
          backface-visibility: hidden;
          user-select: none;
          -webkit-user-select: none;
        }

        /* 一個字一個字由上往下「寫」出來：遮罩從上往下掃過 */
        .fun-wish-char {
          display: inline-block;
          -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent 60%);
          mask-image: linear-gradient(to bottom, #000 40%, transparent 60%);
          -webkit-mask-size: 100% 250%;
          mask-size: 100% 250%;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: 0 100%;
          mask-position: 0 100%;
        }

        .is-writing .fun-wish-char {
          animation: fun-wish-write .42s ease-out var(--delay) forwards;
        }

        /* 寫完：停掉輕微擺動，改由 JS 持續隨機翻轉（見 startWind）；1.6 秒後連同夜空一起淡出 */
        .is-ending .fun-tanzaku-sway {
          animation: none;
        }

        .fun-day-layer.is-tanabata.is-ending {
          animation: fun-tanabata-fade-out 4.8s ease-in 1.6s forwards;
        }

        .fun-day-layer.is-tanabata.is-leaving {
          transition-duration: .4s;
        }

        @keyframes fun-tanabata-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes fun-tanabata-twinkle {
          from { opacity: .2; transform: scale(.7); }
          to   { opacity: 1; transform: scale(1.1); }
        }

        /* 從上方垂下來，擺動幾下後停住 */
        @keyframes fun-tanzaku-drop {
          0%   { transform: translateY(-110vh) rotate(0deg); }
          45%  { transform: translateY(0) rotate(7deg); }
          65%  { transform: rotate(-4deg); }
          82%  { transform: rotate(2deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes fun-tanzaku-sway {
          from { transform: rotate(-1.2deg); }
          to   { transform: rotate(1.2deg); }
        }

        @keyframes fun-tanabata-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        @keyframes fun-wish-write {
          to {
            -webkit-mask-position: 0 0;
            mask-position: 0 0;
          }
        }
      `,
      start(layer, { day, close }) {
        const lines = day.lines?.length ? day.lines : [day.name];
        const fontFamily = "Yuji Syuku";
        const charStep = .32;
        const lineGap = .5;
        const firstDelay = 1.3;

        // 夜空的星星
        for (let i = 0; i < 28; i++) {
          const star = document.createElement("i");
          star.className = "fun-tanabata-star";
          star.style.setProperty("--x", `${Math.random() * 100}%`);
          star.style.setProperty("--y", `${Math.random() * 100}%`);
          star.style.setProperty("--size", `${1.5 + Math.random() * 2.5}px`);
          star.style.setProperty("--dur", `${1.2 + Math.random() * 2}s`);
          star.style.setProperty("--delay", `${Math.random() * 2}s`);
          layer.append(star);
        }

        // 願望：每行一個直書欄（vertical-rl 會由右到左排），每個字各自延遲寫出
        const wish = document.createElement("div");
        wish.className = "fun-tanzaku-wish";
        let delay = firstDelay;
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) delay += lineGap;
          const lineEl = document.createElement("div");
          for (const char of line) {
            const charEl = document.createElement("span");
            charEl.className = "fun-wish-char";
            charEl.textContent = char;
            charEl.style.setProperty("--delay", `${delay.toFixed(2)}s`);
            lineEl.append(charEl);
            delay += charStep;
          }
          wish.append(lineEl);
        });

        const tanzaku = document.createElement("div");
        tanzaku.className = "fun-tanzaku";
        tanzaku.append(wish);

        const cord = document.createElement("div");
        cord.className = "fun-tanzaku-cord";

        const sway = document.createElement("div");
        sway.className = "fun-tanzaku-sway";
        sway.append(cord, tanzaku);

        const drop = document.createElement("div");
        drop.className = "fun-tanzaku-drop";
        drop.append(sway);
        layer.append(drop);

        // 只載入願望用到的字（Google Fonts text 參數），字型就緒後才開始寫字
        const text = [...new Set(lines.join(""))].join("");
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}&display=block&text=${encodeURIComponent(text)}`;
        const fontReady = new Promise(resolve => {
          link.onload = () => document.fonts.load(`32px "${fontFamily}"`, text).then(resolve, resolve);
          link.onerror = resolve;
        });
        document.head.append(link);
        // 字型太慢就不等了，用備用字型照樣寫
        Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 2500))])
          .then(() => {
            layer.classList.add("is-writing");
            // 最後一個字寫完（delay 已是下一個字的時間，扣掉 charStep 再加寫字時間）後開始翻面、淡出
            endTimerId = setTimeout(() => {
              layer.classList.add("is-ending");
              startWind();
            }, (delay - charStep + .42 + .3) * 1000);
          });

        // 淡出完成後結束特效，當天不再出現
        layer.addEventListener("animationend", event => {
          if (event.animationName === "fun-tanabata-fade-out") close();
        });

        let endTimerId = null;
        let windAnimation = null;

        // 被風吹動：在 -540° ~ 540° 之間不斷挑新的隨機角度，每段都 ease-out 轉過去，直到特效結束
        function startWind() {
          let angle = 0;
          const flipToNext = () => {
            let next;
            do {
              next = -540 + Math.random() * 1080;
            } while (Math.abs(next - angle) < 120); // 每次至少轉 120°，看得出翻面
            windAnimation = sway.animate(
              [{ transform: `rotateY(${angle}deg)` }, { transform: `rotateY(${next}deg)` }],
              { duration: 900 + Math.random() * 600, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" }
            );
            angle = next;
            windAnimation.onfinish = flipToNext;
          };
          flipToNext();
        }

        const onKeydown = event => {
          if (event.key === "Escape") close();
        };
        layer.addEventListener("click", close);
        document.addEventListener("keydown", onKeydown);

        return () => {
          clearTimeout(endTimerId);
          if (windAnimation) windAnimation.onfinish = null;
          document.removeEventListener("keydown", onKeydown);
        };
      }
    }
  };

  const BASE_STYLE = `
    .fun-day-layer {
      position: fixed;
      inset: 0;
      z-index: 70;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      transition: opacity 1s ease;

      &.is-leaving {
        opacity: 0;
      }
    }
  `;

  // 還沒有專屬特效的節日：右下角跳出提醒卡片（手機置中於底部）
  const NOTICE_STYLE = `
    .fun-day-notice {
      --notice-color: var(--color-main);
      position: fixed;
      right: 1.5rem;
      bottom: 1.5rem;
      z-index: 75;
      display: flex;
      align-items: center;
      gap: .9rem;
      width: min(340px, calc(100vw - 32px));
      padding: .9rem 2.6rem .9rem .9rem;
      border: 3px solid var(--notice-color);
      border-radius: var(--radius-lg);
      background-color: var(--color-white);
      box-shadow: 6px 6px 0 var(--notice-color), var(--shadow-soft);
      color: var(--color-black);
      font-family: var(--font-main);
      animation: fun-notice-in .6s var(--ease-out) both;

      &.is-leaving {
        animation: fun-notice-out .3s ease-in both;
      }
    }

    .fun-day-notice-avatar {
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      border: 2px solid var(--notice-color);
      border-radius: 50%;
      overflow: hidden;
      background-color: color-mix(in srgb, var(--notice-color) 25%, white);

      .avatar-emoji-fallback {
        font-size: 1.8rem;
      }
    }

    .fun-day-notice-label {
      display: block;
      color: color-mix(in srgb, var(--notice-color) 80%, black);
      font-family: var(--font-en);
      font-size: .75rem;
      font-weight: 700;
      letter-spacing: .08em;
    }

    .fun-day-notice-title {
      display: block;
      font-family: var(--font-title);
      font-size: 1.3rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .fun-day-notice-close {
      position: absolute;
      top: .4rem;
      right: .5rem;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--color-black);
      font-size: 1.3rem;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;

      &:hover {
        background-color: color-mix(in srgb, var(--notice-color) 20%, transparent);
      }
    }

    @media (max-width: 768px) {
      .fun-day-notice {
        right: 16px;
        bottom: 1rem;
        left: 16px;
        width: auto;
        max-width: 340px;
        margin-inline: auto;
      }
    }

    @keyframes fun-notice-in {
      0%   { opacity: 0; transform: translateY(40px) scale(.8) rotate(-4deg); }
      60%  { opacity: 1; transform: translateY(-6px) scale(1.03) rotate(1deg); }
      100% { opacity: 1; transform: none; }
    }

    @keyframes fun-notice-out {
      to { opacity: 0; transform: translateY(20px) scale(.9); }
    }

    @media (prefers-reduced-motion: reduce) {
      .fun-day-notice,
      .fun-day-notice.is-leaving {
        animation-duration: .01s;
      }
    }
  `;

  const DISMISS_STORAGE_KEY = "funDayDismissed";

  let activeKey = null;
  let stopActive = null;

  function setStyle(css) {
    let style = document.getElementById("fun-day-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "fun-day-style";
      document.head.append(style);
    }
    style.textContent = css;
  }

  // 關閉紀錄綁年份，明年同一天會再提醒
  function getDismissValue(key) {
    return `${new Date().getFullYear()}-${key}`;
  }

  function isDismissed(key) {
    try {
      return localStorage.getItem(DISMISS_STORAGE_KEY) === getDismissValue(key);
    } catch {
      return false;
    }
  }

  function rememberDismissed(key) {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, getDismissValue(key));
    } catch {
      // 無法儲存就只關閉這次
    }
  }

  function startEffect(key, effect, day) {
    setStyle(BASE_STYLE + effect.style);

    const layer = document.createElement("div");
    layer.className = `fun-day-layer is-${day.effect}`;
    layer.setAttribute("aria-hidden", "true");
    const close = () => {
      rememberDismissed(key);
      stopFunDay();
    };
    const cleanup = effect.start(layer, { day, close });
    document.body.append(layer);
    document.documentElement.dataset.funDay = day.effect;

    return () => {
      cleanup?.();
      delete document.documentElement.dataset.funDay;
      layer.classList.add("is-leaving");
      setTimeout(() => layer.remove(), 1000);
    };
  }

  function showNotice(key, day) {
    setStyle(NOTICE_STYLE);

    const notice = document.createElement("div");
    notice.className = "fun-day-notice";
    notice.setAttribute("role", "status");
    if (day.character) {
      notice.style.setProperty("--notice-color", `var(--${day.character}-color, var(--color-main))`);
    }

    const avatar = document.createElement("div");
    avatar.className = "fun-day-notice-avatar";
    avatar.innerHTML = renderMemberAvatarHtml(day.character, day.emoji);

    const text = document.createElement("div");
    const label = document.createElement("span");
    label.className = "fun-day-notice-label";
    label.textContent = "TODAY IS";
    const title = document.createElement("span");
    title.className = "fun-day-notice-title";
    title.textContent = day.name;
    text.append(label, title);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "fun-day-notice-close";
    close.setAttribute("aria-label", "閉じる");
    close.textContent = "×";

    notice.append(avatar, text, close);
    document.body.append(notice);

    const remove = () => {
      notice.classList.add("is-leaving");
      setTimeout(() => notice.remove(), 300);
    };
    close.addEventListener("click", () => {
      rememberDismissed(key);
      activeKey = null;
      stopActive = null;
      remove();
    });
    return remove;
  }

  function stopFunDay() {
    stopActive?.();
    activeKey = null;
    stopActive = null;
  }

  function startFunDay(key, day, { preview = false } = {}) {
    if (activeKey === key) return;
    stopFunDay();

    const effect = FUN_DAY_EFFECTS[day.effect];
    if (effect) {
      // 減少動態效果時不播特效
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // 可關閉的特效，今天關過就不再出現（預覽時一律顯示）
      if (effect.dismissible && !preview && isDismissed(key)) return;
      stopActive = startEffect(key, effect, day);
    } else {
      // 今天已經關過提醒就不再跳出（預覽時一律顯示）
      if (!preview && isDismissed(key)) return;
      stopActive = showNotice(key, day);
    }
    activeKey = key;
  }

  window.startFunDay = startFunDay;
  window.stopFunDay = stopFunDay;
})();
