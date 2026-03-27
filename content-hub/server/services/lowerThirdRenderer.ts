import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOWER_THIRDS_DIR = path.resolve(__dirname, '../../data/lower-thirds');
const TEMPLATE_HTML = path.resolve(__dirname, '../../../temp/lower-third-templates.html');

if (!fs.existsSync(LOWER_THIRDS_DIR)) {
  fs.mkdirSync(LOWER_THIRDS_DIR, { recursive: true });
}

// Font resolution — try Montserrat, fallback to Arial
const FONT_CANDIDATES = [
  'C:/Windows/Fonts/montserrat/static/Montserrat-Bold.ttf',
  'C:/Windows/Fonts/Montserrat-Bold.ttf',
  'C:/Windows/Fonts/arial.ttf',
];
const FONT_MEDIUM_CANDIDATES = [
  'C:/Windows/Fonts/montserrat/static/Montserrat-Medium.ttf',
  'C:/Windows/Fonts/Montserrat-Medium.ttf',
  'C:/Windows/Fonts/arial.ttf',
];
const FONT_EXTRABOLD_CANDIDATES = [
  'C:/Windows/Fonts/montserrat/static/Montserrat-ExtraBold.ttf',
  'C:/Windows/Fonts/Montserrat-ExtraBold.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
];

function findFont(candidates: string[]): string {
  for (const f of candidates) {
    if (fs.existsSync(f)) return f.replace(/\\/g, '/').replace(/:/g, '\\:');
  }
  // Last resort: no fontfile param, use FFmpeg default
  return '';
}

const FONT_BOLD = findFont(FONT_CANDIDATES);
const FONT_MEDIUM = findFont(FONT_MEDIUM_CANDIDATES);
const FONT_EXTRABOLD = findFont(FONT_EXTRABOLD_CANDIDATES);

function fontParam(font: string): string {
  return font ? `fontfile='${font}':` : '';
}

interface LowerThirdRequest {
  type: 'name-id' | 'concept' | 'topic';
  text: string;
  subtitle?: string;
  productionId: string;
  blockId: string;
}

/**
 * Generates a lower-third PNG using Puppeteer/Playwright to render the HTML template.
 * Falls back to a simple canvas-based approach if Puppeteer is unavailable.
 */
export async function renderLowerThird(req: LowerThirdRequest): Promise<string> {
  const filename = `lt-${req.productionId.slice(0, 8)}-${req.blockId.slice(0, 8)}-${req.type}.png`;
  const outPath = path.join(LOWER_THIRDS_DIR, filename);

  // Use FFmpeg drawtext as a lightweight PNG generator (no Puppeteer dependency)
  // Creates a 1920x1080 transparent PNG with styled text
  const { type, text, subtitle } = req;

  const goldColor = 'F0BA3C';
  const whiteColor = 'FFFFFF';
  const bgColor = '000000@0.7';

  let filterChain: string;

  switch (type) {
    case 'name-id':
      filterChain = [
        `color=black@0:s=1920x1080,format=rgba`,
        // Background panel
        `drawbox=x=80:y=820:w=${Math.max(text.length, (subtitle || '').length) * 22 + 80}:h=100:color=${bgColor}:t=fill`,
        // Gold bar
        `drawbox=x=80:y=820:w=4:h=100:color=0x${goldColor}@1:t=fill`,
        // Name text
        `drawtext=text='${escapeText(text)}':${fontParam(FONT_BOLD)}fontsize=32:fontcolor=0x${whiteColor}:x=108:y=838`,
        // Subtitle
        subtitle ? `drawtext=text='${escapeText(subtitle)}':${fontParam(FONT_MEDIUM)}fontsize=18:fontcolor=0x${goldColor}:x=108:y=880` : '',
      ].filter(Boolean).join(',');
      break;

    case 'concept':
      filterChain = [
        `color=black@0:s=1920x1080,format=rgba`,
        // Centered text
        `drawtext=text='${escapeText(text)}':${fontParam(FONT_BOLD)}fontsize=36:fontcolor=0x${whiteColor}:x=(w-text_w)/2:y=860`,
        // Gold underline (approximated with drawbox)
        `drawbox=x=(1920-${text.length * 20})/2:y=910:w=${text.length * 20}:h=3:color=0x${goldColor}@1:t=fill`,
      ].join(',');
      break;

    case 'topic':
      filterChain = [
        `color=black@0:s=1920x1080,format=rgba`,
        // Top rule
        `drawbox=x=480:y=880:w=960:h=1:color=0x${goldColor}@0.5:t=fill`,
        // Chapter label
        subtitle ? `drawtext=text='${escapeText(subtitle)}':${fontParam(FONT_MEDIUM)}fontsize=14:fontcolor=0x${goldColor}:x=(w-text_w)/2:y=895` : '',
        // Main topic text
        `drawtext=text='${escapeText(text)}':${fontParam(FONT_EXTRABOLD)}fontsize=28:fontcolor=0x${whiteColor}:x=(w-text_w)/2:y=918`,
        // Bottom rule
        `drawbox=x=480:y=960:w=960:h=1:color=0x${goldColor}@0.5:t=fill`,
      ].filter(Boolean).join(',');
      break;

    default:
      throw new Error(`Unknown lower-third type: ${type}`);
  }

  try {
    execSync(
      `ffmpeg -y -f lavfi -i "${filterChain}" -frames:v 1 "${outPath}"`,
      { timeout: 15000, stdio: 'ignore' }
    );
    return outPath;
  } catch (err) {
    // Fallback: try simpler approach
    try {
      const simple = `color=black@0:s=1920x1080,format=rgba,drawtext=text='${escapeText(text)}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=880`;
      execSync(
        `ffmpeg -y -f lavfi -i "${simple}" -frames:v 1 "${outPath}"`,
        { timeout: 15000, stdio: 'ignore' }
      );
      return outPath;
    } catch {
      throw new Error('Failed to render lower third PNG');
    }
  }
}

function escapeText(text: string): string {
  return text
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '%%');
}
