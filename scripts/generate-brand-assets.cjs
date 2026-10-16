/* eslint-disable @typescript-eslint/no-require-imports -- this standalone asset generator runs as CommonJS */
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const root = path.resolve(__dirname, "..");
const brand = path.join(root, "public", "brand");

async function saveIcon(source, filename, size) {
  const icon = await loadImage(fs.readFileSync(path.join(brand, source)));
  const canvas = createCanvas(size, size);
  canvas.getContext("2d").drawImage(icon, 0, 0, size, size);
  fs.writeFileSync(path.join(brand, filename), canvas.toBuffer("image/png"));
}

async function saveSocialCard() {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6f8f5";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#e7ede8";
  ctx.fillRect(0, 0, 450, 630);

  const portrait = await loadImage(fs.readFileSync(path.join(brand, "inspector.svg")));
  ctx.drawImage(portrait, 9, 82, 454, 405);

  ctx.fillStyle = "#2d6258";
  ctx.font = "600 23px Arial";
  ctx.fillText("EVALUACIÓN PSICOLÓGICA", 510, 215);
  ctx.fillStyle = "#20302e";
  ctx.font = "600 70px Georgia";
  ctx.fillText("Test de las", 507, 316);
  ctx.fillText("Líneas", 507, 402);
  ctx.fillStyle = "#586a64";
  ctx.font = "28px Arial";
  ctx.fillText("Aplicación profesional", 510, 465);
  ctx.fillStyle = "#c94b2a";
  ctx.fillRect(510, 496, 84, 6);

  const card = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(brand, "social-card.png"), card);
  fs.writeFileSync(path.join(root, "app", "opengraph-image.png"), card);
  fs.writeFileSync(path.join(root, "app", "twitter-image.png"), card);
}

function saveMonochrome() {
  const colored = fs.readFileSync(path.join(brand, "inspector.svg"), "utf8");
  const monochrome = colored
    .replaceAll("#D3B16B", "#FFFFFF")
    .replaceAll("#C94B2A", "#242728")
    .replaceAll("#D84B25", "#242728")
    .replaceAll("#F3F1E9", "#FFFFFF")
    .replaceAll("#F1E8D5", "#FFFFFF");
  fs.writeFileSync(path.join(brand, "inspector-mono.svg"), monochrome);
}

async function main() {
  saveMonochrome();
  await Promise.all([
    saveIcon("favicon.svg", "apple-touch-icon.png", 180),
    saveIcon("favicon.svg", "icon-192.png", 192),
    saveIcon("favicon.svg", "icon-512.png", 512),
    saveSocialCard(),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
