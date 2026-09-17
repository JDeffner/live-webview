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

const header = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="440" viewBox="0 0 1280 440">
  <title>Live Webview: live reload for VS Code webviews</title>
  <desc>Edit your frontend, finish a successful build, and reload registered views without restarting the extension host.</desc>
  <rect width="1280" height="440" fill="#202623"/>
  <g transform="translate(42 30) scale(1.9)">${drawing}</g>
  <g font-family="Rubik" font-weight="600">
    <text x="370" y="150" fill="#F4F5ED" font-size="80" letter-spacing="-2">Live Webview</text>
    <text x="374" y="210" fill="#78DDB4" font-size="34">Live reload for VS Code webviews.</text>
    <text x="374" y="258" fill="#B5BFB8" font-size="25">See frontend changes. Keep your extension host running.</text>
    <path d="M80 328H1200" stroke="#405047"/>
    <text x="80" y="385" fill="#F4F5ED" font-size="27">Edit your frontend</text>
    <path d="M350 376H374M366 368L374 376L366 384" fill="none" stroke="#78DDB4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="424" y="385" fill="#F4F5ED" font-size="27">Build succeeds</text>
    <path d="M674 376H698M690 368L698 376L690 384" fill="none" stroke="#78DDB4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="748" y="385" fill="#F4F5ED" font-size="27">Registered views reload</text>
  </g>
</svg>`;
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <title>Live Webview: live reload for VS Code webviews</title>
  <desc>See frontend changes without restarting your extension host. Edit, build, and reload registered views.</desc>
  <rect width="1280" height="640" fill="#202623"/>
  <g transform="translate(48 84) scale(2.4)">${drawing}</g>
  <g font-family="Rubik" font-weight="600">
    <text x="490" y="207" fill="#F4F5ED" font-size="76" letter-spacing="-2">Live Webview</text>
    <text x="494" y="278" fill="#78DDB4" font-size="40">Live reload for</text>
    <text x="494" y="328" fill="#78DDB4" font-size="40">VS Code webviews.</text>
    <text x="494" y="387" fill="#B5BFB8" font-size="25">See frontend changes.</text>
    <text x="494" y="423" fill="#B5BFB8" font-size="25">Keep your extension host running.</text>
    <path d="M80 493H1200" stroke="#405047"/>
    <text x="80" y="557" fill="#F4F5ED" font-size="27">Edit your frontend</text>
    <path d="M350 548H374M366 540L374 548L366 556" fill="none" stroke="#78DDB4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="424" y="557" fill="#F4F5ED" font-size="27">Build succeeds</text>
    <path d="M674 548H698M690 540L698 548L690 556" fill="none" stroke="#78DDB4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="748" y="557" fill="#F4F5ED" font-size="27">Registered views reload</text>
  </g>
</svg>`;
for (const [name, source] of [['header', header], ['social-preview', social]]) {
  await writeFile(new URL(`${name}.svg`, brand), source);
  await writeFile(new URL(`${name}.png`, brand), new Resvg(source, { font }).render().asPng());
}
console.log('Exported the 1280×440 README banner, 1280×640 social preview, and 256px extension icon.');
