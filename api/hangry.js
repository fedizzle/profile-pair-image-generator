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
        <text x="${STRIP_X + 36}" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="#ffffff">VS</text>
      ` : ""}

      ${showPercent ? `
        <rect x="${STRIP_X}" y="0" width="${STRIP_WIDTH}" height="${HEIGHT}" fill="${theme.accent}"/>
        <text x="${STRIP_X + 36}" y="122" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="900" fill="${theme.text}">${percent}%</text>
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
