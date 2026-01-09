import * as vscode from 'vscode';
import * as fs from 'fs';

const LOG_NAME = "trailmix.jsonl";

export function activate(context: vscode.ExtensionContext) {
    const dirUri = vscode.workspace.workspaceFolders?.[0].uri;
    console.log('trailmix loaded at', dirUri);
    if (dirUri === undefined) return;
    const logUri = vscode.Uri.joinPath(dirUri, LOG_NAME);

    function log(kind: string, event: Record<string, any>) {
        const entry = { t: new Date().getDate(), k: kind, ...event };
        fs.appendFileSync(logUri.fsPath, JSON.stringify(entry) + '\n');
        console.log(entry);
    }

    const open = (e: vscode.TextEditor | undefined) => {
        if (e) log('open', { f: e.document.fileName, c: e.document.fileName.endsWith(LOG_NAME) ? null : e.document.getText() });
    };
    open(vscode.window.activeTextEditor);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(open));
}

export function deactivate() {}
