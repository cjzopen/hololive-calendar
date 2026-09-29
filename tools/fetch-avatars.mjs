// 從 YouTube 頻道頁抓取成員頭像，存成 images/avatars/{slug}.jpg
// 用法：node tools/fetch-avatars.mjs            → 只下載缺少的頭像
//       node tools/fetch-avatars.mjs --force    → 全部重新下載
//       node tools/fetch-avatars.mjs sora miko  → 只下載指定成員
// 僅供開發時更新靜態圖檔使用，網站本身不需要 Node.js。
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "images", "avatars");
const avatarSize = 240;

const args = process.argv.slice(2);
const isForce = args.includes("--force");
const targetSlugs = args.filter(arg => !arg.startsWith("--"));

const fixedEvents = JSON.parse(await readFile(path.join(rootDir, "fixed-events.json"), "utf8"));
await mkdir(outDir, { recursive: true });

const imageCache = new Map();

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchAvatar(handle) {
  if (imageCache.has(handle)) return imageCache.get(handle);

  const res = await fetch(`https://www.youtube.com/@${handle}`, {
    headers: { "Accept-Language": "ja", "User-Agent": "Mozilla/5.0" }
  });
  const html = await res.text();
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? "";
  if (!ogImage) throw new Error("找不到頻道頭像（handle 可能錯誤）");

  const imageUrl = ogImage.replace(/=s\d+.*$/, `=s${avatarSize}-c-k-c0x00ffffff-no-rj`);
  const buffer = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
  const result = { buffer, title: ogTitle };
  imageCache.set(handle, result);
  return result;
}

let failCount = 0;

for (const [slug, member] of Object.entries(fixedEvents)) {
  if (targetSlugs.length > 0 && !targetSlugs.includes(slug)) continue;
  if (!member.youtube) {
    console.log(`SKIP ${slug}: fixed-events.json 沒有 youtube 欄位`);
    continue;
  }

  const outFile = path.join(outDir, `${slug}.jpg`);
  if (!isForce && targetSlugs.length === 0 && await exists(outFile)) continue;

  try {
    const { buffer, title } = await fetchAvatar(member.youtube);
    await writeFile(outFile, buffer);
    console.log(`OK   ${slug} (@${member.youtube}) ${title}`);
  } catch (err) {
    failCount++;
    console.log(`FAIL ${slug} (@${member.youtube}) ${err.message}`);
  }
}

process.exitCode = failCount > 0 ? 1 : 0;
