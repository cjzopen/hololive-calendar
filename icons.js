// UI 圖示：Lucide（ISC License, https://lucide.dev）
// 以 ESM 只載入用到的圖示，不載入任何 CSS / 字體。
// 頁面上寫 <i class="icon" data-lucide="cake"></i>，這裡會換成 <svg>；
// app.js 之後動態產生的圖示由 MutationObserver 自動替換。
import replaceElement from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/replaceElement.mjs";
import Cake from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/cake.mjs";
import CalendarCheck from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/calendar-check.mjs";
import CalendarDays from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/calendar-days.mjs";
import Coffee from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/coffee.mjs";
import House from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/house.mjs";
import Megaphone from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/megaphone.mjs";
import MicVocal from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/mic-vocal.mjs";
import PartyPopper from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/party-popper.mjs";
import Search from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/search.mjs";
import Sparkles from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/sparkles.mjs";
import Star from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/star.mjs";
import UserRound from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/user-round.mjs";
import Users from "https://cdn.jsdelivr.net/npm/lucide@1.49.0/dist/esm/icons/users.mjs";

const icons = { Cake, CalendarCheck, CalendarDays, Coffee, House, Megaphone, MicVocal, PartyPopper, Search, Sparkles, Star, UserRound, Users };
const placeholderSelector = "i[data-lucide]";

function renderIcons(root = document) {
  root.querySelectorAll(placeholderSelector).forEach(element => {
    replaceElement(element, { nameAttr: "data-lucide", icons, attrs: {} });
  });
}

renderIcons();

let isQueued = false;
new MutationObserver(() => {
  if (isQueued) return;
  isQueued = true;
  requestAnimationFrame(() => {
    isQueued = false;
    renderIcons();
  });
}).observe(document.body, { childList: true, subtree: true });
