import * as vscode from "vscode";
import * as Util from "./MakeHidden/utilities";
import { Stats } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import ExcludeItems from "./MakeHidden/Classes/ExcludeItems/ExcludeItems.class";
import {
  Workspaces,
  Workspace,
} from "./MakeHidden/Classes/Workspaces/Workspaces.class";

// Const
const workspaceFolders = vscode.workspace.workspaceFolders;
const PLUGIN_NAME = "MakeHidden";

/* --------------------
 * Extension activation
 * Vscode Func: command is executed and extension is activated the very first time the
 */
export function activate(context: vscode.ExtensionContext) {
  const workspaceManager = new Workspaces();
  const excludeItems = new ExcludeItems();

  /* -- Set vs code context -- */
  Util.setVsCodeContext(context);

  /* --------------------
   * Hide Cmd's
   */
  ["hide", "hideMany", "showOnly"].forEach((cmd) => {
    const registerCommand = vscode.commands.registerCommand(
      `make-hidden.${cmd}`,
      async (uri: vscode.Uri) => {
        if (
          (!settingsFileExists() && !uri.fsPath) ||
          !workspaceFolders?.length
        ) {
          return;
        }

        let stats: Stats;

        try {
          stats = await fs.lstat(uri.fsPath);
        } catch (error) {
          console.log(error);
          return;
        }

        const {
          uri: { path: rootPath },
        } = workspaceFolders[0];

        const relativePath = path.relative(rootPath, uri.fsPath);
        const fileName = path.basename(uri.fsPath);
        const extension = path.extname(fileName);
        const file = path.basename(fileName, extension);

        switch (cmd) {
          case "hide": {
            excludeItems.hide(relativePath);
            break;
          }

          case "hideMany": {
            const hideByOptions = [`By Name: ${file}`];

            if (stats.isFile()) {
              hideByOptions.push(`By Extension: ${extension}`);
            }

            // Allow matching extension on files
            const hideLevelOptions = [
              `From root`,
              `From current directory`,
              `From current & child directories`,
              `Child directories only`,
            ];

            const hideBySelection = await vscode.window.showQuickPick(
              hideByOptions
            );
            const hideByType =
              hideByOptions.indexOf(hideBySelection as string) > 0;

            const hideLevelOption = await vscode.window.showQuickPick(
              hideLevelOptions
            );
            const hideLevelIndex = hideLevelOptions.indexOf(
              hideLevelOption as string
            );

            excludeItems.hideMany(relativePath, hideByType, hideLevelIndex);
            break;
          }

          case "showOnly": {
            excludeItems.showOnly(relativePath);
            break;
          }
        }
      }
    );

    context.subscriptions.push(registerCommand);
  });

  /* --------------------
   * Show Cmd's
   */
  ["removeSearch", "removeItem", "removeAllItems", "undo"].forEach((cmd) => {
    const registerCommand = vscode.commands.registerCommand(
      `make-hidden.${cmd}`,
      async (item: string) => {
        switch (cmd) {
          case "removeSearch": {
            const excludeList = await excludeItems.getHiddenItemList();
            const excluded = await vscode.window.showQuickPick(excludeList);

            if (!excluded) {
              return;
            }

            excludeItems.makeVisible(excluded);

            setTimeout(
              () => vscode.commands.executeCommand("make-hidden.removeSearch"),
              500
            );
            break;
          }

          case "removeItem": {
            if (typeof item === "string" && item.length > 0) {
              excludeItems.makeVisible(item);
            }
            break;
          }

          case "removeAllItems": {
            excludeItems.showAllItems();
            break;
          }

          case "undo": {
            excludeItems.undo();
            break;
          }
        }
      }
    );

    context.subscriptions.push(registerCommand);
  });

  /* --------------------
   * Workspace Cmd's
   */
  ["workspace.create", "workspace.load", "workspace.delete"].forEach((cmd) => {
    const registerCommand = vscode.commands.registerCommand(
      `make-hidden.${cmd}`,
      async () => {
        if (!pluginSettingsJson()) {
          return;
        }

        const workspaces = await workspaceManager.getWorkspaces();
        const workspaceIds = Object.keys(workspaces);
        const workspacesNames: string[] = [];

        workspaceIds.map((id) => {
          const workspace: Workspace = workspaces[id as any];
          const path = workspace.path;

          // eslint-disable-next-line eqeqeq
          if (path == null || path == Util.getVsCodeCurrentPath()) {
            const label: string =
              `${workspace.name}` + (path === null ? " •" : "");
            workspacesNames.push(label);
          }
        });
        workspacesNames.push("Close");

        switch (cmd) {
          case "workspace.create": {
            const choice = await vscode.window.showQuickPick([
              "Globally",
              "Current working directory",
              "Close",
            ]);
            if (choice === undefined || choice === "Close") {
              return;
            }

            const workspaceName = await vscode.window.showInputBox({
              prompt: "Name of Workspace",
            });
            if (workspaceName === undefined) {
              return;
            }

            const excludedItems = await excludeItems.getHiddenItemList();
            const type: string | null | undefined =
              choice === "Globally" ? null : Util.getVsCodeCurrentPath();
            workspaceManager.create(
              workspaceName,
              excludedItems,
              type as string
            );
            break;
          }

          case "workspace.load": {
            const val = await vscode.window.showQuickPick(workspacesNames);
            if (val === undefined || val === "Close") {
              return;
            }

            const chosenWorkspaceId =
              workspaceIds[workspacesNames.indexOf(val)];
            const chosenWorkspace = workspaces[chosenWorkspaceId as any];
            excludeItems.loadExcludedList(chosenWorkspace["excludedItems"]);
            break;
          }

          case "workspace.delete": {
            const val = await vscode.window.showQuickPick(workspacesNames);
            if (val === undefined || val === "Close") {
              return;
            }

            const chosenWorkspaceId =
              workspaceIds[workspacesNames.indexOf(val)];
            workspaceManager.removeById(chosenWorkspaceId);
            break;
          }
        }
      }
    );

    context.subscriptions.push(registerCommand);
  });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}

function pluginSettingsJson(): boolean {
  const codeSettingsFileExists = Util.fileExists(
    `${Util.getExtensionSettingPath()}`
  );

  if (codeSettingsFileExists) {
    return true;
  }

  Util.createPluginSettingsJson();
  return false;
}

function settingsFileExists(): boolean {
  const codeSettingsFileExists = Util.fileExists(
    `${Util.getVsCodeCurrentPath()}/.vscode/settings.json`
  );

  if (codeSettingsFileExists) {
    return true;
  }

  Util.createVscodeSettingJson();
  return false;
}
