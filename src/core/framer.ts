import sharp from 'sharp';
import { getDevice } from '../devices.js';
import { frameOptionsSchema, type FrameOptions, type DeviceSpec } from '../types.js';

interface FrameInput {
  /** Path to the raw screenshot */
  input: string;
  /** Device slug (e.g., "iphone-6.9") */
  device: string;
  /** Frame styling options */
  options?: Partial<FrameOptions>;
  /** Title text overlay */
  title?: string;
  /** Subtitle text overlay */
  subtitle?: string;
  /** Orientation: portrait or landscape */
  orientation?: 'portrait' | 'landscape';
}

// ─── Device frame configuration ────────────────────────────

interface DeviceFrameConfig {
  bezelWidth: number; // ratio of phone width
  bodyRadius: number; // ratio of phone width
  screenRadius: number; // ratio of phone width
  dynamicIsland: boolean;
  homeButton: boolean;
  notchWidth: number; // ratio of phone width
  notchHeight: number; // ratio of phone width
  homeBarWidth: number; // ratio of phone width
  homeBarHeight: number; // ratio of phone width
  phoneScale: number; // phone width as ratio of canvas width
}

function getFrameConfig(spec: DeviceSpec): DeviceFrameConfig {
  if (spec.platform === 'ios' && spec.category === 'phone') {
    const isOlder = spec.slug === 'iphone-5.5' || spec.slug === 'iphone-4.7';
    if (isOlder) {
      return {
        bezelWidth: 0.05,
        bodyRadius: 0.1,
        screenRadius: 0.03,
        dynamicIsland: false,
        homeButton: true,
        notchWidth: 0,
        notchHeight: 0,
        homeBarWidth: 0,
        homeBarHeight: 0,
        phoneScale: 0.775,
      };
    }
    // Modern iPhones — exact LeanDine production ratios
    return {
      bezelWidth: 0.04,
      bodyRadius: 0.176,
      screenRadius: 0.136,
      dynamicIsland: true,
      homeButton: false,
      notchWidth: 0.36,
      notchHeight: 0.112,
      homeBarWidth: 0.4,
      homeBarHeight: 0.02,
      phoneScale: 0.775,
    };
  }

  if (spec.category === 'tablet') {
    return {
      bezelWidth: 0.025,
      bodyRadius: 0.06,
      screenRadius: 0.045,
      dynamicIsland: false,
      homeButton: false,
      notchWidth: 0,
      notchHeight: 0,
      homeBarWidth: 0.25,
      homeBarHeight: 0.012,
      phoneScale: 0.88,
    };
  }

  // Android phones
  if (spec.category === 'phone') {
    return {
      bezelWidth: 0.035,
      bodyRadius: 0.14,
      screenRadius: 0.11,
      dynamicIsland: false,
      homeButton: false,
      notchWidth: 0,
      notchHeight: 0,
      homeBarWidth: 0.35,
      homeBarHeight: 0.018,
      phoneScale: 0.775,
    };
  }

  // Desktop/other
  return {
    bezelWidth: 0.03,
    bodyRadius: 0.05,
    screenRadius: 0.04,
    dynamicIsland: false,
    homeButton: false,
    notchWidth: 0,
    notchHeight: 0,
    homeBarWidth: 0,
    homeBarHeight: 0,
    phoneScale: 0.85,
  };
}

// ─── Frame color presets ───────────────────────────────────

interface FrameColor {
  body: string;
  ring: string;
}

const FRAME_COLORS: Record<string, FrameColor> = {
  black: { body: '#1a1a1a', ring: '#333333' },
  silver: { body: '#C8C8CD', ring: '#E0E0E5' },
  gold: { body: '#A0824E', ring: '#C8A870' },
  blue: { body: '#1A2F4F', ring: '#2C4A7C' },
  red: { body: '#5C1010', ring: '#8B2020' },
  white: { body: '#E8E8E8', ring: '#FFFFFF' },
};

function resolveFrameColor(frameColor: string): FrameColor {
  if (FRAME_COLORS[frameColor]) return FRAME_COLORS[frameColor];
  return { body: darken(frameColor, 20), ring: frameColor };
}

function darken(hex: string, pct: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    Math.max(0, Math.round(r * (1 - pct / 100))),
    Math.max(0, Math.round(g * (1 - pct / 100))),
    Math.max(0, Math.round(b * (1 - pct / 100))),
  );
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── Main export ───────────────────────────────────────────

export async function frameScreenshot(params: FrameInput): Promise<Buffer> {
  const { input, device, title, subtitle, orientation = 'portrait' } = params;
  const opts = frameOptionsSchema.parse(params.options ?? {});

  const spec = getDevice(device);
  if (!spec) throw new Error(`Unknown device: ${device}`);

  const canvasW = orientation === 'portrait' ? spec.width : spec.height;
  const canvasH = orientation === 'portrait' ? spec.height : spec.width;

  const hasOverlay = !!(title || subtitle);
  const isPlainResize =
    !hasOverlay && opts.background === '#000000' && !opts.shadow && !opts.deviceFrame && !opts.pattern;

  if (isPlainResize) {
    return sharp(input)
      .resize(canvasW, canvasH, { fit: 'cover', position: 'center' })
      .png({ quality: 100 })
      .toBuffer();
  }

  const showFrame =
    opts.deviceFrame && (spec.category === 'phone' || spec.category === 'tablet');

  if (showFrame) {
    return frameWithDevice(input, spec, opts, canvasW, canvasH, title, subtitle, hasOverlay, orientation);
  }

  // Non-device-frame path — existing layout
  const padX = Math.round(canvasW * opts.padding);
  const padY = Math.round(canvasH * opts.padding * 0.6);
  const titleFontSize = Math.round(canvasW * opts.titleSize);
  const subtitleFontSize = Math.round(canvasW * opts.subtitleSize);
  const titleH = title ? Math.round(titleFontSize * 2) : 0;
  const subtitleH = subtitle ? Math.round(subtitleFontSize * 2.4) : 0;
  const topOffset = padY + titleH + subtitleH;
  const areaW = canvasW - padX * 2;
  const areaH = canvasH - topOffset - padY;

  return frameWithoutDevice(
    input, opts, canvasW, canvasH, areaW, areaH, padX, topOffset, padY,
    title, subtitle, titleH, subtitleH, titleFontSize, subtitleFontSize, hasOverlay,
  );
}

// ─── Frame WITH device bezel (LeanDine-style) ──────────────

async function frameWithDevice(
  input: string,
  spec: DeviceSpec,
  opts: FrameOptions,
  canvasW: number,
  canvasH: number,
  title: string | undefined,
  subtitle: string | undefined,
  hasOverlay: boolean,
  orientation: string,
): Promise<Buffer> {
  const fc = getFrameConfig(spec);
  const { body: bodyColor, ring: ringColor } = resolveFrameColor(opts.frameColor);

  // Phone dimensions — proportional to canvas width
  const phoneW = Math.round(canvasW * fc.phoneScale);
  const bezel = Math.round(phoneW * fc.bezelWidth);
  const screenW = phoneW - bezel * 2;
  const nativeW = orientation === 'portrait' ? spec.width : spec.height;
  const nativeH = orientation === 'portrait' ? spec.height : spec.width;
  const screenH = Math.round(screenW * (nativeH / nativeW));
  const phoneH = screenH + bezel * 2;

  // Center horizontally
  const phoneX = Math.round((canvasW - phoneW) / 2);

  // Vertical position — phone extends beyond canvas edge
  let phoneY: number;
  if (opts.textPosition === 'top') {
    // Phone from bottom: extends below canvas
    phoneY = canvasH - phoneH + Math.round(phoneH * 0.056);
  } else {
    // Phone from top (default): extends above canvas
    phoneY = -Math.round(phoneH * 0.074);
  }

  const bodyRadius = Math.round(phoneW * fc.bodyRadius);
  const screenRadius = Math.round(phoneW * fc.screenRadius);
  const ringWidth = Math.max(2, Math.round(phoneW * 0.008));

  // Resize screenshot to screen area (crop from top, like object-position: top)
  const resizedScreenshot = await sharp(input)
    .resize(screenW, screenH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // Mask screenshot with rounded rect for screen shape
  const screenMask = Buffer.from(
    `<svg width="${screenW}" height="${screenH}">
      <rect width="${screenW}" height="${screenH}" rx="${screenRadius}" ry="${screenRadius}" fill="white"/>
    </svg>`
  );
  const maskedScreen = await sharp(resizedScreenshot)
    .ensureAlpha()
    .composite([{ input: screenMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Background
  const bgSvg = buildBackgroundSvg(canvasW, canvasH, opts.background);

  // Pattern overlay
  const patternSvg = opts.pattern
    ? buildPatternSvg(canvasW, canvasH, opts.pattern, opts.patternColor, opts.patternOpacity)
    : null;

  // Phone body SVG (body rect + metallic ring)
  const phoneSvg = `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}"
      rx="${bodyRadius}" ry="${bodyRadius}"
      fill="${bodyColor}" stroke="${ringColor}" stroke-width="${ringWidth}"/>
  </svg>`;

  // Notch + home bar overlay
  const overlaysSvg = buildPhoneOverlaysSvg(
    canvasW, canvasH, phoneX, phoneY, phoneW, phoneH, bezel, fc,
  );

  // Shadow buffer (canvas-sized, composited at 0,0)
  let shadowBuf: Buffer | null = null;
  if (opts.shadow) {
    shadowBuf = await buildPhoneShadow(
      canvasW, canvasH, phoneX, phoneY, phoneW, phoneH, bodyRadius,
    );
  }

  // Text overlay
  const textSvg = hasOverlay
    ? buildDeviceTextSvg(canvasW, canvasH, title, subtitle, opts)
    : null;

  // Composite: bg → pattern → shadow → phone body → screen → overlays → text
  const layers: sharp.OverlayOptions[] = [];

  if (patternSvg) {
    layers.push({ input: Buffer.from(patternSvg), top: 0, left: 0 });
  }

  if (shadowBuf) {
    layers.push({ input: shadowBuf, top: 0, left: 0 });
  }

  layers.push({ input: Buffer.from(phoneSvg), top: 0, left: 0 });

  layers.push({
    input: maskedScreen,
    top: phoneY + bezel,
    left: phoneX + bezel,
  });

  layers.push({ input: Buffer.from(overlaysSvg), top: 0, left: 0 });

  if (textSvg) {
    layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
  }

  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  return sharp(bg).composite(layers).png({ quality: 100 }).toBuffer();
}

// ─── Phone overlays (notch, home bar) ──────────────────────

function buildPhoneOverlaysSvg(
  canvasW: number,
  canvasH: number,
  phoneX: number,
  phoneY: number,
  phoneW: number,
  phoneH: number,
  bezel: number,
  fc: DeviceFrameConfig,
): string {
  const screenX = phoneX + bezel;
  const screenY = phoneY + bezel;
  const screenH = phoneH - bezel * 2;

  let notchSvg = '';
  if (fc.dynamicIsland && fc.notchWidth > 0) {
    const nw = Math.round(phoneW * fc.notchWidth);
    const nh = Math.round(phoneW * fc.notchHeight);
    const nx = phoneX + Math.round((phoneW - nw) / 2);
    const ny = screenY + Math.round(bezel * 0.8);
    const nr = Math.round(nh / 2); // pill shape
    notchSvg = `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}"
      rx="${nr}" ry="${nr}" fill="#000000"/>`;
  }

  let homeBarSvg = '';
  if (fc.homeBarWidth > 0 && !fc.homeButton) {
    const bw = Math.round(phoneW * fc.homeBarWidth);
    const bh = Math.round(phoneW * fc.homeBarHeight);
    const bx = phoneX + Math.round((phoneW - bw) / 2);
    const by = screenY + screenH - Math.round(bezel * 0.8) - bh;
    const br = Math.round(bh / 2);
    homeBarSvg = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}"
      rx="${br}" ry="${br}" fill="rgba(255,255,255,0.25)"/>`;
  }

  let homeButtonSvg = '';
  if (fc.homeButton) {
    const btnR = Math.round(phoneW * 0.05);
    const btnCx = phoneX + Math.round(phoneW / 2);
    const btnCy = phoneY + phoneH - Math.round(bezel * 2.2);
    homeButtonSvg = `<circle cx="${btnCx}" cy="${btnCy}" r="${btnR}"
      fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>`;
  }

  return `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
    ${notchSvg}${homeBarSvg}${homeButtonSvg}
  </svg>`;
}

// ─── Phone shadow ──────────────────────────────────────────

async function buildPhoneShadow(
  canvasW: number,
  canvasH: number,
  phoneX: number,
  phoneY: number,
  phoneW: number,
  phoneH: number,
  bodyRadius: number,
): Promise<Buffer> {
  const sigma = Math.max(1, Math.round(phoneW * 0.08));
  const offsetY = Math.round(phoneH * 0.05);
  const pad = sigma * 3; // 3-sigma covers 99.7% of Gaussian spread

  const svgW = canvasW + pad * 2;
  const svgH = canvasH + pad * 2;

  // Phone rect positioned within padded SVG (pad offset accounts for canvas origin)
  const rectX = phoneX + pad;
  const rectY = phoneY + pad + offsetY;

  const svg = `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${rectX}" y="${rectY}" width="${phoneW}" height="${phoneH}"
      rx="${bodyRadius}" ry="${bodyRadius}" fill="rgba(0,0,0,0.4)"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .blur(sigma)
    .extract({ left: pad, top: pad, width: canvasW, height: canvasH })
    .png()
    .toBuffer();
}

// ─── Device-mode text overlay ──────────────────────────────

function buildDeviceTextSvg(
  canvasW: number,
  canvasH: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: FrameOptions,
): string {
  const cx = Math.round(canvasW / 2);
  const font = `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  const titleFontSize = Math.round(canvasW * opts.titleSize);
  const subtitleFontSize = Math.round(canvasW * opts.subtitleSize);
  const titleAttrs = `text-anchor="middle" font-size="${titleFontSize}" font-weight="800" fill="${opts.titleColor}" font-family="${font}"`;
  const subtitleAttrs = `text-anchor="middle" font-size="${subtitleFontSize}" font-weight="500" fill="${opts.subtitleColor}" font-family="${font}"`;

  let textElements = '';

  if (opts.textPosition === 'top') {
    const topPad = Math.round(canvasH * 0.072);
    let y = topPad;

    if (title) {
      const lines = title.split('\\n');
      y += Math.round(titleFontSize * 1.15);
      textElements += renderMultilineText(lines, cx, y, titleFontSize, 1.15, titleAttrs);
      y += (lines.length - 1) * Math.round(titleFontSize * 1.15);
    }

    if (subtitle) {
      y += Math.round(titleFontSize * 0.4) + subtitleFontSize;
      textElements += `<text x="${cx}" y="${y}" ${subtitleAttrs}>${escapeXml(subtitle)}</text>`;
    }
  } else {
    const bottomPad = Math.round(canvasH * 0.086);
    let y = canvasH - bottomPad;

    if (subtitle) {
      textElements += `<text x="${cx}" y="${y}" ${subtitleAttrs}>${escapeXml(subtitle)}</text>`;
      y -= Math.round(subtitleFontSize * 1.8);
    }

    if (title) {
      const lines = title.split('\\n');
      const lineH = Math.round(titleFontSize * 1.15);
      const firstLineY = y - (lines.length - 1) * lineH;
      textElements += renderMultilineText(lines, cx, firstLineY, titleFontSize, 1.15, titleAttrs);
    }
  }

  return `<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
    ${textElements}
  </svg>`;
}

function renderMultilineText(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  attrs: string,
): string {
  if (lines.length === 1) {
    return `<text x="${x}" y="${y}" ${attrs}>${escapeXml(lines[0])}</text>`;
  }
  const dy = Math.round(fontSize * lineHeight);
  let svg = `<text ${attrs}>`;
  for (let i = 0; i < lines.length; i++) {
    svg += `<tspan x="${x}" ${i === 0 ? `y="${y}"` : `dy="${dy}"`}>${escapeXml(lines[i])}</tspan>`;
  }
  svg += '</text>';
  return svg;
}

// ─── Frame WITHOUT device bezel ────────────────────────────

async function frameWithoutDevice(
  input: string,
  opts: FrameOptions,
  canvasW: number,
  canvasH: number,
  areaW: number,
  areaH: number,
  padX: number,
  topOffset: number,
  padY: number,
  title: string | undefined,
  subtitle: string | undefined,
  titleH: number,
  subtitleH: number,
  titleFontSize: number,
  subtitleFontSize: number,
  hasOverlay: boolean,
): Promise<Buffer> {
  const cornerR = Math.round(areaW * opts.borderRadius);

  const resized = await sharp(input)
    .resize(areaW, areaH, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  const roundedMask = Buffer.from(
    `<svg width="${areaW}" height="${areaH}">
      <rect width="${areaW}" height="${areaH}" rx="${cornerR}" ry="${cornerR}" fill="white"/>
    </svg>`
  );
  const rounded = await sharp(resized)
    .ensureAlpha()
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const bgSvg = buildBackgroundSvg(canvasW, canvasH, opts.background);
  const patternSvg = opts.pattern
    ? buildPatternSvg(canvasW, canvasH, opts.pattern, opts.patternColor, opts.patternOpacity)
    : null;
  const textSvg = hasOverlay
    ? buildTextSvg(canvasW, padY, titleH, subtitleH, titleFontSize, subtitleFontSize, title, subtitle, opts)
    : null;

  let shadowBuf: Buffer | null = null;
  if (opts.shadow) {
    const sp = 40;
    const shadowSvg = `<svg width="${areaW + sp * 2}" height="${areaH + sp * 2}">
      <rect x="${sp}" y="${sp}" width="${areaW}" height="${areaH}"
        rx="${cornerR}" ry="${cornerR}" fill="rgba(0,0,0,0.35)"/>
    </svg>`;
    shadowBuf = await sharp(Buffer.from(shadowSvg)).blur(20).png().toBuffer();
  }

  const layers: sharp.OverlayOptions[] = [];
  if (patternSvg) {
    layers.push({ input: Buffer.from(patternSvg), top: 0, left: 0 });
  }
  if (shadowBuf) {
    layers.push({ input: shadowBuf, top: topOffset - 40 + 8, left: padX - 40 });
  }
  layers.push({ input: rounded, top: topOffset, left: padX });
  if (textSvg) {
    layers.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
  }

  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  return sharp(bg).composite(layers).png({ quality: 100 }).toBuffer();
}

// ─── Background SVG ────────────────────────────────────────

function buildBackgroundSvg(w: number, h: number, background: string): string {
  const gradientMatch = background.match(
    /linear-gradient\(\s*(\d+)deg\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/
  );

  if (gradientMatch) {
    const angle = parseInt(gradientMatch[1], 10);
    const color1 = gradientMatch[2].trim();
    const color2 = gradientMatch[3].trim();
    const { x1, y1, x2, y2 } = angleToCoords(angle);

    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
    </svg>`;
  }

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${background}"/>
  </svg>`;
}

// ─── Pattern SVG ───────────────────────────────────────────

const PATTERNS: Record<string, (size: number, color: string) => string> = {
  dots: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.08}" fill="${c}"/>`,

  grid: (s, c) =>
    `<line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="${c}" stroke-width="1"/>
     <line x1="${s}" y1="0" x2="${s}" y2="${s}" stroke="${c}" stroke-width="1"/>`,

  diagonal: (s, c) =>
    `<line x1="0" y1="${s}" x2="${s}" y2="0" stroke="${c}" stroke-width="1.5"/>`,

  'cross-dots': (s, c) =>
    `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.06}" fill="${c}"/>
     <line x1="${s * 0.3}" y1="${s / 2}" x2="${s * 0.7}" y2="${s / 2}" stroke="${c}" stroke-width="1"/>
     <line x1="${s / 2}" y1="${s * 0.3}" x2="${s / 2}" y2="${s * 0.7}" stroke="${c}" stroke-width="1"/>`,

  waves: (s, c) => {
    const h = s / 2;
    return `<path d="M0 ${h} Q${s / 4} ${h - s * 0.3} ${s / 2} ${h} T${s} ${h}"
      fill="none" stroke="${c}" stroke-width="1.5"/>`;
  },

  diamonds: (s, c) => {
    const m = s / 2;
    return `<polygon points="${m},${s * 0.1} ${s * 0.9},${m} ${m},${s * 0.9} ${s * 0.1},${m}" fill="none" stroke="${c}" stroke-width="1"/>`;
  },
};

function buildPatternSvg(
  w: number, h: number, pattern: string, color: string, opacity: number,
): string | null {
  const builder = PATTERNS[pattern];
  if (!builder) return null;

  const tileSize = Math.round(Math.min(w, h) * 0.025);
  const tile = builder(tileSize, color);

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="pat" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">
        ${tile}
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#pat)" opacity="${opacity}"/>
  </svg>`;
}

// ─── Text SVG (non-device mode) ────────────────────────────

function buildTextSvg(
  canvasW: number,
  padY: number,
  titleH: number,
  subtitleH: number,
  titleFontSize: number,
  subtitleFontSize: number,
  title: string | undefined,
  subtitle: string | undefined,
  opts: FrameOptions,
): string {
  const cx = Math.round(canvasW / 2);
  const font = `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

  let textElements = '';

  if (title) {
    const titleY = padY + Math.round(titleFontSize * 1.25);
    textElements += `<text x="${cx}" y="${titleY}" text-anchor="middle"
      font-size="${titleFontSize}" font-weight="800" fill="${opts.titleColor}"
      font-family="${font}">${escapeXml(title)}</text>`;
  }

  if (subtitle) {
    const subtitleY = padY + titleH + Math.round(subtitleFontSize * 1.4);
    textElements += `<text x="${cx}" y="${subtitleY}" text-anchor="middle"
      font-size="${subtitleFontSize}" font-weight="500" fill="${opts.subtitleColor}"
      font-family="${font}">${escapeXml(subtitle)}</text>`;
  }

  return `<svg width="${canvasW}" height="${padY + titleH + subtitleH}" xmlns="http://www.w3.org/2000/svg">
    ${textElements}
  </svg>`;
}

// ─── Helpers ───────────────────────────────────────────────

function angleToCoords(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50);
  const y1 = Math.round(50 - Math.sin(rad) * 50);
  const x2 = Math.round(50 + Math.cos(rad) * 50);
  const y2 = Math.round(50 + Math.sin(rad) * 50);
  return { x1, y1, x2, y2 };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
