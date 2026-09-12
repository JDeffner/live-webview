import * as vscode from 'vscode';
import { connect } from './integration';
import type { IntegrationOptions } from './integration';
export type { BuildRegistration, TargetRegistration, DevtoolsApiV1 } from './types';
export type { IntegrationOptions, Integration, TargetOptions } from './integration';

export function connectDevtools(context: vscode.ExtensionContext, options: IntegrationOptions) {
  return connect(context, options, vscode.ExtensionMode.Development);
}
