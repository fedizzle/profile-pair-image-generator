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
        "user-agent": "hangry-image-generator"
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
    return { main: "69%", icon: "🔥" };
  }

  if (percent === 110) {
    return { main: "110%", icon: "❤️‍🔥" };
  }

  if (percent !== null) {
    return { main: `${percent}%`, icon: "" };
  }

  return { main: fallback, icon: "" };
}

function cobwebSvg() {
  return `
    <g opacity="0.38" stroke="#c8c0ad" stroke-width="2" fill="none">
      <path d="M24 28 L160 28 M24 28 L24 154 M24 28 L136 132 M24 72 Q72 66 112 28 M24 112 Q95 98 144 56 M62 28 Q58 82 24 124"/>
      <path d="M976 28 L840 28 M976 28 L976 154 M976 28 L864 132 M976 72 Q928 66 888 28 M976 112 Q905 98 856 56 M938 28 Q942 82 976 124"/>
    </g>
  `;
}

function overlaySvg(leftName, rightName, theme, percent) {
  const left = escapeXml(leftName);
  const right = escapeXml(rightName);
  const title = escapeXml(theme.title);
  const centerContent = theme === THEMES.ship
    ? shipCenter(percent, theme.center)
    : { main: theme.center, icon: "" };
  const center = escapeXml(centerContent.main);
  const icon = escapeXml(centerContent.icon);
  const showIcon = centerContent.icon ? "block" : "none";
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

      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${theme.background}"/>
      <rect x="16" y="20" width="968" height="480" rx="18" fill="${theme.panel}" stroke="${theme.border}" stroke-width="8"/>
      ${theme.cobweb ? cobwebSvg() : ""}

      <rect x="${LEFT_X - 8}" y="${AVATAR_Y - 8}" width="${AVATAR_SIZE + 16}" height="${AVATAR_SIZE + 16}" rx="8" fill="none" stroke="${theme.border}" stroke-width="10" filter="url(#glow)"/>
      <rect x="${RIGHT_X - 8}" y="${AVATAR_Y - 8}" width="${AVATAR_SIZE + 16}" height="${AVATAR_SIZE + 16}" rx="8" fill="none" stroke="${theme.border}" stroke-width="10" filter="url(#glow)"/>

      <rect x="486" y="28" width="28" height="464" rx="10" fill="${theme.divider}" filter="url(#glow)"/>
      <rect x="492" y="36" width="16" height="448" rx="7" fill="${theme.background}"/>
      <text x="500" y="228" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="900" display="${showIcon}">${icon}</text>
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
        { input: leftAvatar, left: LEFT_X, top: AVATAR_Y },
        { input: rightAvatar, left: RIGHT_X, top: AVATAR_Y },
        { input: overlaySvg(leftName, rightName, theme, percent), left: 0, top: 0 }
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
