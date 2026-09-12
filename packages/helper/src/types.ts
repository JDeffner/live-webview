import type * as vscode from 'vscode';

export interface BuildRegistration {
  ownerExtensionId: string;
  buildId: string;
  signalUri: vscode.Uri;
}
export interface TargetRegistration {
  ownerExtensionId: string;
  instanceId: string;
  viewType: string;
  label: string;
  buildId: string;
  reload: (revision: string) => void | Promise<void>;
  onDidDispose: vscode.Event<void>;
  isVisible: () => boolean;
  onDidChangeVisibility: vscode.Event<void>;
}
export interface DevtoolsApiV1 {
  apiVersion: 1;
  registerBuild(input: BuildRegistration): vscode.Disposable;
  registerTarget(input: TargetRegistration): vscode.Disposable;
}
