export const ExtensionMode = { Production: 1, Development: 2, Test: 3 };
export const workspace = { isTrusted: true };
export const env = { remoteName: undefined as string | undefined };
export const extensions = { getExtension: (id: string): unknown => { void id; return undefined; } };
export class Disposable {
  constructor(private action: () => void) {}
  dispose() { this.action(); }
  static from(...items: Disposable[]) { return new Disposable(() => items.forEach(item => item.dispose())); }
}
export const Uri = { joinPath: (root: { path: string }, ...parts: string[]) => ({ scheme: 'file', path: [root.path, ...parts].join('/') }) };
