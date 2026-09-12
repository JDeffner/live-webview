import * as vscode from 'vscode';
import { connect, type IntegrationOptions } from './integration';

/** Test fixtures only. Production entry never enables ExtensionMode.Test. */
export function connectDevtoolsForTest(context: vscode.ExtensionContext, options: IntegrationOptions) {
  return connect(context, options, vscode.ExtensionMode.Test);
}
