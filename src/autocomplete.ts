import * as vscode from 'vscode';
import { getWorkspaceState } from './state';
import { Message } from './models';

const keywords = [
  "import", "private", "service", "rpc", "enum", "message", "returns", "option", "optional", "required", "repeated", "package",
  "#alias", "#decl-type", "#private-import", "@NoEnumClass"
];

const dataTypes = [
  "int", "uint", "sint", "long", "ulong",
  "double", "float", "int32", "int64", "uint32", "uint64", "sint32", "sint64", "fixed32", "fixed64", "sfixed32", "sfixed64", "bool", "string", "bytes"
];

const protobufKeywords = [
  "syntax", "option", "package", "message", "enum", "service", "rpc", "returns"
];

const allItems = [...new Set([
  ...keywords,
  ...dataTypes,
  ...protobufKeywords
])];

export function findBasicKeywords(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.CompletionItem[] {
  const linePrefix = document.lineAt(position).text.substring(0, position.character).trim();
  
  if (linePrefix === "") {
    return allItems.map(item => {
      return new vscode.CompletionItem(item, getSymbolType(item));
    });
  }

  return allItems.filter(item => item.startsWith(linePrefix)).map(item => {
    const ci = new vscode.CompletionItem(item.startsWith('#') || item.startsWith('@') ? item.substring(1) : item, getSymbolType(item));
    ci.insertText = new vscode.SnippetString(item.startsWith('#') || item.startsWith('@') ? item.substring(1) : item);
    return ci;
  });
}

function getSymbolType(item: string): vscode.CompletionItemKind {
  if (keywords.includes(item)) {
    if (item === "import") {
      return vscode.CompletionItemKind.File;
    }

    if (item === "service") {
      return vscode.CompletionItemKind.Interface;
    }

    if (item === "rpc") {
      return vscode.CompletionItemKind.Method;
    }

    if (item === "enum") {
      return vscode.CompletionItemKind.Enum;
    }

    if (item === "message") {
      return vscode.CompletionItemKind.Class;
    }

    if (item.startsWith('#') || item.startsWith('@')) {
      return vscode.CompletionItemKind.Reference;
    }

    return vscode.CompletionItemKind.Keyword;
  }

  if (dataTypes.includes(item)) {
    return vscode.CompletionItemKind.TypeParameter;
  }

  if (protobufKeywords.includes(item)) {
    return vscode.CompletionItemKind.Keyword;
  }

  return vscode.CompletionItemKind.Text;
}

export function findItemsFromCurrentState(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.CompletionItem[] {
  const workspaceDir = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
  if (!workspaceDir) {
    console.error('Workspace directory not found');
    return [];
  }

  const linePrefix = document.lineAt(position).text.substring(0, position.character).trim();
  if (linePrefix === "") {
    return collectWorkspaceItems(workspaceDir).map(item => {
      return new vscode.CompletionItem(item.name, item.type);
    });
  }

  return collectWorkspaceItems(workspaceDir).filter(item => item.name.startsWith(linePrefix)).map(item => {
    const itemSuffix = item.name.substring(linePrefix.length);
    const ci = new vscode.CompletionItem(item.name, item.type);
    ci.insertText = new vscode.SnippetString(itemSuffix);
    return ci;
  });
}

function collectWorkspaceItems(workspaceDir: string): ({name: string, type: vscode.CompletionItemKind})[] {
  const state = getWorkspaceState(workspaceDir);
  if (!state) {
    return [];
  }

  const alreadyAdded: string[] = [];
  const items: ({name: string, type: vscode.CompletionItemKind})[] = [];

  if (state.scripts) {
    Object.values(state.scripts).forEach(sc => {
      Object.values(sc.enums).forEach(en => {
        if (alreadyAdded.includes(en.name)) {
          return;
        }

        alreadyAdded.push(en.name);

        items.push({name: en.name, type: vscode.CompletionItemKind.Enum});
      });

      Object.keys(sc.typeAliases).forEach(ta => {
        if (alreadyAdded.includes(ta)) {
          return;
        }

        alreadyAdded.push(ta);

        console.log(ta, sc.typeAliases[ta]);

        items.push({name: ta, type: vscode.CompletionItemKind.TypeParameter});
      });

      Object.keys(sc.declaredTypes).forEach(dt => {
        if (alreadyAdded.includes(dt)) {
          return;
        }

        alreadyAdded.push(dt);

        items.push({name: dt, type: vscode.CompletionItemKind.TypeParameter});
      });

      Object.values(sc.messages).forEach(msg => {
        if (alreadyAdded.includes(msg.name)) {
          return;
        }

        alreadyAdded.push(msg.name);

        items.push({name: msg.name, type: vscode.CompletionItemKind.Class});

        const nestedMessages = flattenNestedMessages(msg);
        Object.entries(nestedMessages).forEach(([k, _]) => {
          const fullName = `${msg.name}.${k}`;

          if (alreadyAdded.includes(fullName)) {
            return;
          }

          alreadyAdded.push(fullName);

          items.push({name: fullName, type: vscode.CompletionItemKind.Class});
        });
      });

      if (!alreadyAdded.includes('EmptyRequest')) {
        alreadyAdded.push('EmptyRequest');
        items.push({name: 'EmptyRequest', type: vscode.CompletionItemKind.Class});
      }

      if (!alreadyAdded.includes('EmptyResponse')) {
        alreadyAdded.push('EmptyResponse');
        items.push({name: 'EmptyResponse', type: vscode.CompletionItemKind.Class});
      }
    });
  }

  console.log(items);

  return items;
}

function flattenNestedMessages(parent: Message): {[key: string]: Message} {
  const result: {[key: string]: Message} = {};
  if (parent.children) {
    Object.values(parent.children).forEach(child => {
      result[child.name] = child;
      const nestedMessages = flattenNestedMessages(child);
      Object.entries(nestedMessages).forEach(([k, v]) => {
        result[`${child.name}.${v.name}`] = v;
      });
    });
  }
  return result;
}