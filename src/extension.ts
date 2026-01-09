import * as vscode from 'vscode';
import * as fs from 'fs';

const LOG_NAME = "trailmix.jsonl";
let LOG_URI = null;

const format_pos = (p: vscode.Position) => `${p.line + 1}:${p.character + 1}`;

function log(kind: string, event: Record<string, string | Array<Record<string, string>>>) {
    const entry = { t: new Date().getTime(), k: kind, ...event };
    fs.appendFileSync(LOG_URI!.fsPath, JSON.stringify(entry) + '\n');
    console.log(entry);
}

export function activate(context: vscode.ExtensionContext) {
    const dirUri = vscode.workspace.workspaceFolders?.[0].uri;
    if (dirUri === undefined) return;
    LOG_URI = vscode.Uri.joinPath(dirUri, LOG_NAME);

    log('activate', {});

    const open = (e: vscode.TextEditor | undefined) => {
        if (e) log('open', { f: e.document.fileName, c: e.document.fileName.endsWith(LOG_NAME) ? '<log>' : e.document.getText() });
    };
    open(vscode.window.activeTextEditor);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(open));

    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(e => log('close', { f: e.fileName })));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(e => log('save', { f: e.fileName })));
    context.subscriptions.push(vscode.workspace.onDidRenameFiles(e => log('rename', { m: e.files.map(x => ({ b: x.oldUri.fsPath, a: x.newUri.fsPath })) })));

    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.textEditor.document.fileName.endsWith(LOG_NAME)) return;
        log('select', { f: e.textEditor.document.fileName, m: e.selections.map(x => ({ s: format_pos(x.start), e: format_pos(x.end) })) });
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.fileName.endsWith(LOG_NAME)) return;
        const k = e.reason ? { [vscode.TextDocumentChangeReason.Undo]: 'undo', [vscode.TextDocumentChangeReason.Redo]: 'redo' }[e.reason] : 'edit';
        log(k, { f: e.document.fileName, m: e.contentChanges.map(x => ({ s: format_pos(x.range.start), e: format_pos(x.range.end), c: x.text })) });
    }));

    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    context.subscriptions.push(watcher);
    const change = (e: vscode.Uri) => {
        if (e.fsPath.endsWith(LOG_NAME)) return;
        log('change', { f: e.fsPath, c: fs.readFileSync(e.fsPath, 'utf-8') });
    };
    watcher.onDidCreate(change);
    watcher.onDidChange(change);
    watcher.onDidDelete(e => log('delete', { f: e.fsPath }));
}

export function deactivate() {
    log('deactivate', {});
}
