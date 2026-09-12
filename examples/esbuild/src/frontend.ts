import './frontend.css';
declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
const vscode = acquireVsCodeApi();
const boot = crypto.randomUUID();
const marker = 'initial marker';
const input = document.querySelector<HTMLInputElement>('#value')!;
document.querySelector('#marker')!.textContent = marker;
function save() { vscode.postMessage({ type: 'input', revision: document.body.dataset.revision, value: input.value, selection: input.selectionStart }); }
input.addEventListener('input', save);
input.addEventListener('select', save);
function ack(session: string) {
  vscode.postMessage({ type: 'ack', boot, revision: document.body.dataset.revision, marker, css: getComputedStyle(document.body).getPropertyValue('--fixture-marker').trim(), value: input.value, selection: input.selectionStart, session });
}
let session = '';
window.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'state' && message.boot === boot) {
    input.value = message.value;
    input.setSelectionRange(message.selection, message.selection);
    session = message.session;
    document.querySelector('#roundtrip')!.textContent = `Host round trip complete: ${boot}`;
    ack(session);
  }
  if (message.type === 'test-input') {
    input.value = message.value;
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new Event('input'));
    ack(session);
  }
});
vscode.postMessage({ type: 'ready', boot });
