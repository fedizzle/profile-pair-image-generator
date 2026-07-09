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
  const percentWidth = 18 * scale;
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

function smallNumberSvg(value, x, y) {
  return percentSvg(value, x, y, 0.42, "#bdbdbd").replace(/<circle[\s\S]*?\/>|<line[\s\S]*?\/>/g, "");
}

function vsSvg(x, y, color) {
  return `
    <path d="M${x - 22} ${y - 20} L${x - 10} ${y + 20} L${x + 2} ${y - 20}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${x + 24} ${y - 18} C${x + 8} ${y - 24} ${x + 8} ${y - 2} ${x + 23} ${y} C${x + 42} ${y + 3} ${x + 38} ${y + 24} ${x + 12} ${y + 16}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
  `;
}

function specialIconSvg(percent) {
  if (percent === 69) {
    return `
      <g transform="translate(${STRIP_X + 20} 16) scale(0.42)">
        <path d="M42 92 C18 72 18 44 38 23 C37 43 52 48 54 66 C67 51 64 30 51 8 C86 30 98 62 78 92 C69 106 51 112 42 92 Z" fill="#f97316"/>
        <path d="M51 96 C38 83 42 65 54 52 C56 65 69 68 65 88 C63 100 55 106 51 96 Z" fill="#fde047"/>
      </g>
    `;
  }

  if (percent === 110) {
    return `
      <g transform="translate(${STRIP_X + 16} 15) scale(0.42)">
        <path d="M46 98 C14 72 0 52 8 30 C14 12 35 10 46 25 C57 10 78 12 84 30 C92 52 78 72 46 98 Z" fill="#dc2626"/>
        <path d="M52 80 C36 67 39 48 52 34 C52 48 65 51 63 66 C72 56 70 41 62 26 C86 43 89 68 72 84 C64 91 56 92 52 80 Z" fill="#f97316"/>
      </g>
    `;
  }

  return "";
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
      ` : `
        <g stroke="#8a8a8a" stroke-width="1" opacity="0.75">
          <line x1="${STRIP_X}" y1="56" x2="${STRIP_X + 19}" y2="56"/>
          <line x1="${STRIP_X + 53}" y1="56" x2="${STRIP_X + STRIP_WIDTH}" y2="56"/>
          <line x1="${STRIP_X}" y1="110" x2="${STRIP_X + 19}" y2="110"/>
          <line x1="${STRIP_X + 53}" y1="110" x2="${STRIP_X + STRIP_WIDTH}" y2="110"/>
        </g>

        ${smallNumberSvg(75, STRIP_X + 36, 48)}
        ${smallNumberSvg(50, STRIP_X + 36, 102)}
        ${specialIconSvg(percent)}
      `}

      ${showPercent ? `
        <rect x="${STRIP_X}" y="158" width="${STRIP_WIDTH}" height="62" fill="${theme.accent}"/>
        ${percentSvg(percent, STRIP_X + 36, 174, 0.78, theme.text)}
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
