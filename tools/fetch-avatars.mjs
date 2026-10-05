// 以 YouTube Data API 取得成員頻道頭像與 banner，壓成 WebP（品質 75%）
//   頭像：240px → images/avatars/{slug}.webp
//   banner：置中裁成 1280×720 → images/banners/{slug}.webp（目前前端未使用，先備著）
// 金鑰：環境變數 YOUTUBE_API_KEY（GitHub Actions 由 Secrets 注入），本機可寫在 .env
// 用法：node tools/fetch-avatars.mjs            → 更新全部成員
//       node tools/fetch-avatars.mjs sora miko  → 只更新指定成員
// 取得失敗（API 錯誤、handle 變更、圖片異常）時保留原本的圖片，不會覆蓋；頭像與 banner 各自判斷。
// avatar: "manual" 的成員（黒様、AIこより等）為手動製作，一律略過。
// 由 .github/workflows/update-avatars.yml 每月 15 日自動執行，網站本身不需要 Node.js。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "images", "avatars");
const bannerDir = path.join(rootDir, "images", "banners");
const bannerSize = { width: 1280, height: 720 };
const requestTimeout = 15000;
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

const targetSlugs = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
const fixedEvents = JSON.parse(await readFile(path.join(rootDir, "fixed-events.json"), "utf8"));
await mkdir(outDir, { recursive: true });
await mkdir(bannerDir, { recursive: true });

async function loadApiKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY.trim();
  try {
    const env = await readFile(path.join(rootDir, ".env"), "utf8");
    return env.match(/^YOUTUBE_API_KEY=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "") || "";
  } catch {
    return "";
  }
}

async function readExisting(filePath) {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

// 內容相同就不寫入，避免每月產生無意義的 commit；回傳是否有更新
async function writeIfChanged(filePath, buffer) {
  const existing = await readExisting(filePath);
  if (existing?.equals(buffer)) return false;
  await writeFile(filePath, buffer);
  return true;
}

async function fetchChannelImages(handle, apiKey) {
  const params = new URLSearchParams({
    part: "snippet,brandingSettings",
    forHandle: `@${handle}`,
    fields: "items(snippet(title,thumbnails(medium(url))),brandingSettings(image(bannerExternalUrl)))",
    key: apiKey
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, {
    signal: AbortSignal.timeout(requestTimeout)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API ${res.status}: ${data.error?.message ?? "unknown error"}`);

  const item = data.items?.[0];
  const url = item?.snippet?.thumbnails?.medium?.url;
  if (!url) throw new Error("找不到頻道（handle 可能已變更）");
  return {
    url,
    title: item.snippet.title,
    bannerUrl: item.brandingSettings?.image?.bannerExternalUrl ?? null
  };
}

async function downloadJpeg(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(requestTimeout) });
  if (!res.ok) throw new Error(`圖片下載失敗 ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (!isJpeg || buffer.length < 1024) throw new Error("圖片格式異常");
  return buffer;
}

// banner 原圖多為 2560×1440（JPEG 或 PNG），置中裁成 16:9 再縮小
async function downloadBannerWebp(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(requestTimeout) });
  if (!res.ok) throw new Error(`banner 下載失敗 ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { width, height } = await sharp(buffer).metadata().catch(() => ({}));
  if (!width || !height || buffer.length < 1024) throw new Error("banner 格式異常");
  return sharp(buffer)
    .resize({ ...bannerSize, fit: "cover", position: "centre" })
    .webp({ quality: 75 })
    .toBuffer();
}

function warn(message) {
  console.log(isGitHubActions ? `::warning::${message}` : `FAIL ${message}`);
}

const apiKey = await loadApiKey();
if (!apiKey) {
  console.error("缺少 YOUTUBE_API_KEY（環境變數或 .env），已保留所有原本的圖片");
  process.exit(1);
}

const summary = { updated: 0, unchanged: 0, failed: 0, skipped: 0 };
const bannerSummary = { updated: 0, unchanged: 0, failed: 0 };

for (const [slug, member] of Object.entries(fixedEvents)) {
  if (targetSlugs.length > 0 && !targetSlugs.includes(slug)) continue;
  if (!member.youtube) {
    summary.skipped++;
    const reason = member.avatar === "manual" ? "頭像為手動製作（avatar: manual）" : "沒有 youtube 欄位";
    console.log(`SKIP ${slug}: ${reason}`);
    continue;
  }

  let channel = null;
  try {
    channel = await fetchChannelImages(member.youtube, apiKey);
    const jpegBuffer = await downloadJpeg(channel.url);
    const webpBuffer = await sharp(jpegBuffer)
      .webp({ quality: 75 })
      .toBuffer();
    if (await writeIfChanged(path.join(outDir, `${slug}.webp`), webpBuffer)) {
      summary.updated++;
      console.log(`OK   ${slug} (@${member.youtube}) ${channel.title}`);
    } else {
      summary.unchanged++;
    }
  } catch (err) {
    summary.failed++;
    warn(`${slug} (@${member.youtube}) ${err.message} → 保留原本的頭像`);
  }

  // 頻道查詢失敗時 banner 也無從取得，上面已經警告過
  if (!channel) continue;
  try {
    if (!channel.bannerUrl) throw new Error("頻道沒有設定 banner");
    const bannerBuffer = await downloadBannerWebp(channel.bannerUrl);
    if (await writeIfChanged(path.join(bannerDir, `${slug}.webp`), bannerBuffer)) {
      bannerSummary.updated++;
      console.log(`OK   ${slug} banner`);
    } else {
      bannerSummary.unchanged++;
    }
  } catch (err) {
    bannerSummary.failed++;
    warn(`${slug} (@${member.youtube}) ${err.message} → 保留原本的 banner`);
  }
}

console.log(`\n頭像：更新 ${summary.updated}、未變更 ${summary.unchanged}、失敗 ${summary.failed}（保留原圖）、略過 ${summary.skipped}`);
console.log(`banner：更新 ${bannerSummary.updated}、未變更 ${bannerSummary.unchanged}、失敗 ${bannerSummary.failed}（保留原圖）`);

// 頭像全部失敗（例如金鑰失效）時回傳錯誤，讓 GitHub Actions 通知；部分失敗只留警告
const attempted = summary.updated + summary.unchanged + summary.failed;
process.exitCode = attempted > 0 && summary.failed === attempted ? 1 : 0;
