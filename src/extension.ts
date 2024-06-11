import * as vscode from 'vscode';
import { findBasicKeywords, findItemsFromCurrentState } from './autocomplete';
import { initializeState } from './state';


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('protolsd', {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionList<vscode.CompletionItem> | vscode.CompletionItem[]> {
				const keywords = findBasicKeywords(document, position, token, context);
				const stateSymbols = findItemsFromCurrentState(document, position, token, context);

				console.log('keywords', stateSymbols);

				return [
					...keywords,
					...stateSymbols
				];
			}
		}, '')
	);

	initializeState(context);
}

export function deactivate() {}