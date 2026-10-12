// 依 fixed-events.json 把成員名冊（名字、生日、出道日）預先寫進 index.html
// 讓 JS 載入前（或爬蟲、無 JS 環境）也看得到每位成員的資料；JS 載入後會重新渲染。
// 用法：node tools/build-static-html.mjs   → 修改 fixed-events.json 後執行一次
// 僅供開發時更新靜態 HTML 使用，網站本身不需要 Node.js。
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(rootDir, "index.html");
const startMarker = "<!-- static-members:start -->";
const endMarker = "<!-- static-members:end -->";
const indent = "              ";

const fixedEvents = JSON.parse(await readFile(path.join(rootDir, "fixed-events.json"), "utf8"));
const html = await readFile(htmlPath, "utf8");

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Lucide placeholder，由 icons.js 換成 <svg>
function icon(name) {
  return `<i class="icon" data-lucide="${name}"></i>`;
}

// 與 app.js 的 getAnniversarySlots 相同：manual 角色沒有生日、或生日和出道同一天，出道日當作爆誕日
function getDateRows(member) {
  const isSeitan = member.avatar === "manual" && member.debut && (!member.birthday || member.birthday === member.debut.slice(5));
  if (isSeitan) {
    return [{ icon: "cake", title: "爆誕", date: member.debut }];
  }
  return [
    { icon: "cake", title: "誕生日", date: member.birthday || "" },
    { icon: "megaphone", title: "デビュー日", date: member.debut || "" }
  ];
}

function renderStaticCard(slug, member) {
  const name = escapeHtml(member.name);
  const avatarHtml = member.youtube || member.avatar
    ? `<img class="avatar-img" src="images/avatars/${slug}.webp" alt="${name}" loading="lazy" width="240" height="240" />`
    : `<span class="avatar-emoji-fallback">${escapeHtml(member.emoji || "✨")}</span>`;

  return [
    `<article class="member-card" data-member="${slug}" style="--photo-color: var(--${slug}-color, var(--color-main));" onclick="openMemberSpotlight('${slug}')">`,
    `  <div class="member-card-img">`,
    `    <div class="member-avatar">${avatarHtml}</div>`,
    `  </div>`,
    `  <div class="member-card-body">`,
    `    <div class="photo-card-name">`,
    `      <span class="name-jp">${name}</span>`,
    `      <span class="name-en">${slug}</span>`,
    `    </div>`,
    `  </div>`,
    `  <div class="member-card-dates">`,
    ...getDateRows(member).map(row => `    <time datetime="${row.date}" title="${row.title}">${icon(row.icon)}${row.date || "—"}</time>`),
    `  </div>`,
    `</article>`
  ].map(line => indent + line).join("\n");
}

const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);
if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  console.error(`index.html に ${startMarker} / ${endMarker} が見つかりません`);
  process.exit(1);
}

// 團體（type: "group"）不是成員，不放進名冊
const members = Object.entries(fixedEvents).filter(([, member]) => member.type !== "group");
const cardsHtml = members.map(([slug, member]) => renderStaticCard(slug, member)).join("\n");
const nextHtml = html.slice(0, startIndex + startMarker.length)
  + "\n" + cardsHtml + "\n" + indent
  + html.slice(endIndex);

await writeFile(htmlPath, nextHtml);
console.log(`${members.length} 名のメンバーを index.html に書き込みました`);
