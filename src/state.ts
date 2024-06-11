import * as vscode from 'vscode';
import { exec } from 'child_process';
import { ScriptPackage } from './models';

const outputChannel = vscode.window.createOutputChannel('ProtoLSD');

const workspaceStates: Map<string, ScriptPackage> = new Map();

export function getWorkspaceState(workspaceDir: string) {
  return workspaceStates.get(workspaceDir);
}

export function initializeState(context: vscode.ExtensionContext) {
  const folders = vscode.workspace.workspaceFolders || (vscode.workspace.rootPath ? [{ uri: vscode.Uri.file(vscode.workspace.rootPath) }] : []);

  folders.forEach(folder => {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(folder as any, '**/*.{plsd}')
    );

    watcher.onDidChange(handleFileChange);
    watcher.onDidCreate(handleFileChange);
    watcher.onDidDelete(handleFileChange);

    context.subscriptions.push(watcher);

    compileWorkspace(folder.uri.fsPath);
  });
}

async function handleFileChange(uri: vscode.Uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const folderPath = workspaceFolder ? workspaceFolder.uri.fsPath : vscode.workspace.rootPath;
  
  if (folderPath) {
    await compileWorkspace(folderPath);
  }
}

async function compileWorkspace(workspaceDir: string) {
  try {
    const output = await new Promise<string>((resolve, reject) => {
      exec(`protolsd lsp-compile -w ${workspaceDir}`, (error, stdout, stderr) => {
        if (error) {
          reject(stderr);
        } else {
          const output = stdout.trim().length > 0 ? stdout : stderr;

          resolve(output);
        }
      });
    });

    console.log(output);
    const result = JSON.parse(output) as {result: ScriptPackage, success: boolean};
    if (result && result.success) {
      workspaceStates.set(workspaceDir, result.result);
      outputChannel.appendLine('Workspace compiled successfully');
    }
  } catch (error) {
    outputChannel.appendLine(`Error: ${error}`);
  }
}