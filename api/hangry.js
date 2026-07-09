import sharp from "sharp";

const WIDTH = 1000;
const HEIGHT = 520;
const AVATAR_SIZE = 420;
const LEFT_X = 38;
const RIGHT_X = 542;
const AVATAR_Y = 42;

const THEMES = {
  mystery: {
    accent: "#d8d1c2",
    border: "#020202",
    divider: "#050505",
    background: "#050605",
    panel: "#111412",
    title: "MURDER MYSTERY",
    center: "VS",
    cobweb: true
  },
  ship: {
    accent: "#047857",
    border: "#047857",
    divider: "#047857",
    background: "#070b09",
    panel: "#101714",
    title: "SHIP CHECK",
    center: "+"
  },
  duel: {
    accent: "#047857",
    border: "#047857",
    divider: "#047857",
    background: "#07110d",
    panel: "#101a16",
    title: "MATCHUP",
    center: "VS"
  }
};

const ALLOWED_HOSTS = new Set([
  "cdn.discordapp.com",
  "media.discordapp.net",
  "images-ext-1.discordapp.net",
  "images-ext-2.discordapp.net"
]);

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanLabel(value, fallback) {
  const text = String(value || fallback).trim();
  return text.slice(0, 28) || fallback;
}

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

function getTheme(value) {
  return THEMES[String(value || "").toLowerCase()] || THEMES.mystery;
}

function getPercent(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return null;
  }

  return Math.max(0, Math.min(110, number));
}

function shipCenter(percent, fallback) {
  if (percent === 69) {
    return { main: "69%", icon: "fire" };
  }

  if (percent === 110) {
    return { main: "110%", icon: "heartFire" };
  }

  if (percent !== null) {
    return { main: `${percent}%`, icon: "" };
  }

  return { main: fallback, icon: "" };
}

function iconSvg(type) {
  if (type === "fire") {
    return `
      <g transform="translate(463 164) scale(0.9)">
        <path d="M42 92 C18 72 18 44 38 23 C37 43 52 48 54 66 C67 51 64 30 51 8 C86 30 98 62 78 92 C69 106 51 112 42 92 Z" fill="#f97316"/>
        <path d="M51 96 C38 83 42 65 54 52 C56 65 69 68 65 88 C63 100 55 106 51 96 Z" fill="#fde047"/>
      </g>
    `;
  }

  if (type === "heartFire") {
    return `
      <g transform="translate(454 160)">
        <path d="M46 98 C14 72 0 52 8 30 C14 12 35 10 46 25 C57 10 78 12 84 30 C92 52 78 72 46 98 Z" fill="#dc2626"/>
        <path d="M52 80 C36 67 39 48 52 34 C52 48 65 51 63 66 C72 56 70 41 62 26 C86 43 89 68 72 84 C64 91 56 92 52 80 Z" fill="#f97316"/>
        <path d="M60 79 C53 70 56 60 64 52 C65 60 72 63 69 73 C67 82 62 84 60 79 Z" fill="#fde047"/>
      </g>
    `;
  }

  return "";
}

function cobwebSvg() {
  return `
    <g opacity="0.38" stroke="#c8c0ad" stroke-width="2" fill="none">
      <path d="M24 28 L160 28 M24 28 L24 154 M24 28 L136 132 M24 72 Q72 66 112 28 M24 112 Q95 98 144 56 M62 28 Q58 82 24 124"/>
      <path d="M976 28 L840 28 M976 28 L976 154 M976 28 L864 132 M976 72 Q928 66 888 28 M976 112 Q905 98 856 56 M938 28 Q942 82 976 124"/>
    </g>
  `;
}

function backgroundSvg(theme) {
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${theme.background}"/>
      <rect x="16" y="20" width="968" height="480" rx="18" fill="${theme.panel}" stroke="${theme.border}" stroke-width="8"/>
      ${theme.cobweb ? cobwebSvg() : ""}
    </svg>
  `);
}

function frameSvg(leftName, rightName, theme, percent) {
  const left = escapeXml(leftName);
  const right = escapeXml(rightName);
  const title = escapeXml(theme.title);
  const centerContent = theme === THEMES.ship
    ? shipCenter(percent, theme.center)
    : { main: theme.center, icon: "" };
  const center = escapeXml(centerContent.main);
  const centerY = centerContent.icon ? 306 : 278;

  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <rect x="${LEFT_X - 8}" y="${AVATAR_Y - 8}" width="${AVATAR_SIZE + 16}" height="${AVATAR_SIZE + 16}" rx="8" fill="none" stroke="${theme.border}" stroke-width="10" filter="url(#glow)"/>
      <rect x="${RIGHT_X - 8}" y="${AVATAR_Y - 8}" width="${AVATAR_SIZE + 16}" height="${AVATAR_SIZE + 16}" rx="8" fill="none" stroke="${theme.border}" stroke-width="10" filter="url(#glow)"/>

      <rect x="486" y="28" width="28" height="464" rx="10" fill="${theme.divider}" filter="url(#glow)"/>
      <rect x="492" y="36" width="16" height="448" rx="7" fill="${theme.background}"/>
      ${iconSvg(centerContent.icon)}
      <text x="500" y="${centerY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="900" fill="${theme.accent}" filter="url(#glow)">${center}</text>

      <rect x="38" y="410" width="420" height="52" fill="${theme.background}" opacity="0.82"/>
      <rect x="542" y="410" width="420" height="52" fill="${theme.background}" opacity="0.82"/>
      <text x="248" y="445" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#ffffff">${left}</text>
      <text x="752" y="445" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#ffffff">${right}</text>

      <text x="500" y="505" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="${theme.accent}">${title}</text>
    </svg>
  `);
}

export default async function handler(req, res) {
  try {
    const leftUrl = validateDiscordImageUrl(req.query.left, "left");
    const rightUrl = validateDiscordImageUrl(req.query.right, "right");
    const leftName = cleanLabel(req.query.leftName, "Player 1");
    const rightName = cleanLabel(req.query.rightName, "Player 2");
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
        background: theme.background
      }
    })
      .composite([
        { input: backgroundSvg(theme), left: 0, top: 0 },
        { input: leftAvatar, left: LEFT_X, top: AVATAR_Y },
        { input: rightAvatar, left: RIGHT_X, top: AVATAR_Y },
        { input: frameSvg(leftName, rightName, theme, percent), left: 0, top: 0 }
      ])
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.status(200).send(image);
  } catch (error) {
    res.status(400).json({
      error: error.message || "Could not create profile image."
    });
  }
}
