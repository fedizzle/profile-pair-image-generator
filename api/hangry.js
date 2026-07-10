import sharp from "sharp";

const WIDTH = 512;
const HEIGHT = 220;
const AVATAR_SIZE = 220;
const LEFT_X = 0;
const STRIP_X = 220;
const STRIP_WIDTH = 72;
const RIGHT_X = 292;

const THEMES = {
  ship: {
    accent: "#047857",
    strip: "#050505",
    text: "#ffffff",
    title: "SHIP"
  },
  mystery: {
    accent: "#050505",
    strip: "#050505",
    text: "#ffffff",
    title: "MYSTERY"
  },
  duel: {
    accent: "#047857",
    strip: "#050505",
    text: "#ffffff",
    title: "DUEL"
  }
};

const ALLOWED_HOSTS = new Set([
  "cdn.discordapp.com",
  "media.discordapp.net",
  "images-ext-1.discordapp.net",
  "images-ext-2.discordapp.net"
]);

function validateDiscordImageUrl(value, label) {
  if (!value) {
    throw new Error(`Missing ${label} avatar URL.`);
  }

  const url = new URL(value);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`${label} must be a Discord CDN image URL.`);
  }

  return url.toString();
}

function getTheme(value) {
  return THEMES[String(value || "").toLowerCase()] || THEMES.ship;
}

function getPercent(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return null;
  }

  return Math.max(0, Math.min(110, number));
}

const DIGITS = {
  0: ["a", "b", "c", "d", "e", "f"],
  1: ["b", "c"],
  2: ["a", "b", "g", "e", "d"],
  3: ["a", "b", "g", "c", "d"],
  4: ["f", "g", "b", "c"],
  5: ["a", "f", "g", "c", "d"],
  6: ["a", "f", "g", "c", "d", "e"],
  7: ["a", "b", "c"],
  8: ["a", "b", "c", "d", "e", "f", "g"],
  9: ["a", "b", "c", "d", "f", "g"]
};

function digitSvg(digit, x, y, scale, color) {
  const segments = DIGITS[digit] || [];
  const t = 4 * scale;
  const w = 24 * scale;
  const h = 42 * scale;
  const mid = y + h / 2 - t / 2;
  const rects = {
    a: [x + t, y, w - t * 2, t],
    b: [x + w - t, y + t, t, h / 2 - t],
    c: [x + w - t, mid + t, t, h / 2 - t],
    d: [x + t, y + h - t, w - t * 2, t],
    e: [x, mid + t, t, h / 2 - t],
    f: [x, y + t, t, h / 2 - t],
    g: [x + t, mid, w - t * 2, t]
  };

  return segments.map((segment) => {
    const [rx, ry, rw, rh] = rects[segment];
    return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="${t / 2}" fill="${color}"/>`;
  }).join("");
}

function percentSvg(value, x, y, scale, color) {
  const chars = String(value).split("");
  const digitWidth = 28 * scale;
  const percentWidth = 17 * scale;
  const totalWidth = chars.length * digitWidth + percentWidth;
  let cursor = x - totalWidth / 2;
  const parts = chars.map((char) => {
    const svg = digitSvg(char, cursor, y, scale, color);
    cursor += digitWidth;
    return svg;
  });

  parts.push(`
    <circle cx="${cursor + 4 * scale}" cy="${y + 8 * scale}" r="${3 * scale}" fill="${color}"/>
    <circle cx="${cursor + 14 * scale}" cy="${y + 34 * scale}" r="${3 * scale}" fill="${color}"/>
    <line x1="${cursor + 16 * scale}" y1="${y + 4 * scale}" x2="${cursor + 2 * scale}" y2="${y + 39 * scale}" stroke="${color}" stroke-width="${3 * scale}" stroke-linecap="round"/>
  `);

  return parts.join("");
}

function vsSvg(x, y, color) {
  return `
    <path d="M${x - 27} ${y - 19} L${x - 18} ${y + 19} L${x - 9} ${y - 19}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${x + 21} ${y - 17} C${x + 7} ${y - 22} ${x + 7} ${y - 2} ${x + 20} ${y} C${x + 36} ${y + 3} ${x + 32} ${y + 22} ${x + 10} ${y + 15}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
  `;
}

async function fetchImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "profile-pair-image-generator"
      }
    });

    if (!response.ok) {
      throw new Error(`Could not fetch image: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error("Avatar URL did not return an image.");
    }

    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

async function prepareAvatar(buffer) {
  return sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: "cover",
      position: "center"
    })
    .png()
    .toBuffer();
}

function middleStripSvg(theme, percent) {
  const isMystery = theme.title === "MYSTERY";
  const showPercent = percent !== null && !isMystery;

  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${STRIP_X}" y="0" width="${STRIP_WIDTH}" height="${HEIGHT}" fill="${theme.strip}"/>

      ${isMystery ? `
        ${vsSvg(STRIP_X + 36, 110, "#ffffff")}
      ` : ""}

      ${showPercent ? `
        <rect x="${STRIP_X}" y="0" width="${STRIP_WIDTH}" height="${HEIGHT}" fill="${theme.accent}"/>
        ${percentSvg(percent, STRIP_X + 36, 89, 0.82, theme.text)}
      ` : ""}
    </svg>
  `);
}

export default async function handler(req, res) {
  try {
    const leftUrl = validateDiscordImageUrl(req.query.left, "left");
    const rightUrl = validateDiscordImageUrl(req.query.right, "right");
    const theme = getTheme(req.query.theme);
    const percent = getPercent(req.query.percent);

    const [leftRaw, rightRaw] = await Promise.all([
      fetchImage(leftUrl),
      fetchImage(rightUrl)
    ]);

    const [leftAvatar, rightAvatar] = await Promise.all([
      prepareAvatar(leftRaw),
      prepareAvatar(rightRaw)
    ]);

    const image = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: "#050505"
      }
    })
      .composite([
        { input: leftAvatar, left: LEFT_X, top: 0 },
        { input: rightAvatar, left: RIGHT_X, top: 0 },
        { input: middleStripSvg(theme, percent), left: 0, top: 0 }
      ])
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(image);
  } catch (error) {
    res.status(400).json({
      error: error.message || "Could not create profile image."
    });
  }
}
