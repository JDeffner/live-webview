import { Resvg } from '@resvg/resvg-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const brand = new URL('docs/branding/', root);
const mark = await readFile(new URL('mark.svg', brand), 'utf8');
const drawing = mark.replace(/<\/?svg\b[^>]*>/g, '').replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '');
const font = {
  fontFiles: [fileURLToPath(new URL('Rubik-SemiBold.ttf', brand))],
  loadSystemFonts: false,
  defaultFontFamily: 'Rubik',
};

const icon = new Resvg(mark, { background: '#202623', fitTo: { mode: 'width', value: 256 } });
await mkdir(new URL('packages/extension/media/', root), { recursive: true });
await writeFile(new URL('packages/extension/media/icon.png', root), icon.render().asPng());

const header = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="400" viewBox="0 0 1280 400">
  <title>Live Webview: targeted reload for VS Code webviews</title>
  <rect width="1280" height="400" fill="#202623"/>
  <g transform="translate(48 56) scale(1.8)">${drawing}</g>
  <text x="368" y="204" fill="#F4F5ED" font-family="Rubik" font-weight="600" font-size="80" letter-spacing="-2">Live Webview</text>
  <text x="372" y="258" fill="#B5BFB8" font-family="Rubik" font-weight="600" font-size="27">Targeted reload for VS Code webviews.</text>
</svg>`;
await writeFile(new URL('header.png', brand), new Resvg(header, { font }).render().asPng());
console.log('Exported the README header and 256px extension icon from docs/branding/mark.svg.');
