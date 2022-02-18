import * as vscode from "vscode";
import * as Util from "./MakeHidden/utilities";
import * as fs from "fs";
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
  ["hide", "hideMany", "showOnly"].forEach((cmd: string) => {
    const registerCommand = vscode.commands.registerCommand(
      `make-hidden.${cmd}`,
      (e: { fsPath: string }) => {
        if (!settingsFileExists() && !e.fsPath) {
          return;
        }

        const chosenFilePath = e.fsPath;

        fs.lstat(chosenFilePath, (err, stats) => {
          if (err || !workspaceFolders?.length) {
            return;
          }

          const {
            uri: { path: rootPath },
          } = workspaceFolders[0];

          const relativePath = path.relative(rootPath, chosenFilePath);
          const fileName = path.basename(e.fsPath);
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

              vscode.window
                .showQuickPick(hideByOptions)
                .then((hideBySelection?: string) => {
                  const hideByType =
                    hideByOptions.indexOf(hideBySelection as string) > 0;

                  vscode.window
                    .showQuickPick(hideLevelOptions)
                    .then((val?: string) => {
                      const hideLevelIndex = hideLevelOptions.indexOf(
                        val as string
                      );
                      excludeItems.hideMany(
                        relativePath,
                        hideByType,
                        hideLevelIndex
                      );
                    });
                });

              break;
            }

            case "showOnly": {
              excludeItems.showOnly(relativePath);
              break;
            }
          }
        });
      }
    );

    context.subscriptions.push(registerCommand);
  });

  /* --------------------
   * Show Cmd's
   */
  ["removeSearch", "removeItem", "removeAllItems", "undo"].forEach(
    (cmd: string) => {
      const registerCommand = vscode.commands.registerCommand(
        `make-hidden.${cmd}`,
        (excludeString: string) => {
          switch (cmd) {
            case "removeSearch": {
              excludeItems.getHiddenItemList().then((excludeList: any) => {
                vscode.window
                  .showQuickPick(excludeList)
                  .then((excludeString?: string) => {
                    if (excludeString) {
                      excludeItems.makeVisible(excludeString);
                      // TODO: Don't like this fix as it runs before promise showing old list
                      setTimeout(
                        () =>
                          vscode.commands.executeCommand(
                            "make-hidden.removeSearch"
                          ),
                        500
                      );
                    }
                  });
              });
              break;
            }

            case "removeItem": {
              if (
                typeof excludeString === "string" &&
                excludeString.length > 0
              ) {
                excludeItems.makeVisible(excludeString);
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
    }
  );

  /* --------------------
   * Workspace Cmd's
   */
  ["workspace.create", "workspace.load", "workspace.delete"].forEach(
    (cmd: string) => {
      const registerCommand = vscode.commands.registerCommand(
        `make-hidden.${cmd}`,
        () => {
          if (!pluginSettingsJson()) {
            return;
          }

          workspaceManager.getWorkspaces().then((workspaces: Workspace[]) => {
            const workspaceIds: string[] = Object.keys(workspaces);
            const workspacesNames: string[] = [];

            workspaceIds.map((id: string) => {
              const workspace: Workspace = workspaces[id as any];
              const path: string = workspace.path;

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
                vscode.window
                  .showQuickPick([
                    "Globally",
                    "Current working directory",
                    "Close",
                  ])
                  .then((choice) => {
                    if (choice === "Close" || choice === undefined) {
                      return;
                    }
                    vscode.window
                      .showInputBox({ prompt: "Name of Workspace" })
                      .then((workspaceName?: string) => {
                        if (workspaceName === undefined) {
                          return;
                        }
                        excludeItems
                          .getHiddenItemList()
                          .then((excludeItems: string[]) => {
                            const type: string | null | undefined =
                              choice === "Globally"
                                ? null
                                : Util.getVsCodeCurrentPath();
                            workspaceManager.create(
                              workspaceName,
                              excludeItems,
                              type as string
                            );
                          });
                      });
                  });
                break;
              }

              case "workspace.load": {
                vscode.window
                  .showQuickPick(workspacesNames)
                  .then((val?: string) => {
                    if (val === "Close" || val === undefined) {
                      return;
                    }
                    const chosenWorkspaceId =
                      workspaceIds[workspacesNames.indexOf(val)];
                    const chosenWorkspace =
                      workspaces[chosenWorkspaceId as any];
                    excludeItems.loadExcludedList(
                      chosenWorkspace["excludedItems"]
                    );
                  });
                break;
              }

              case "workspace.delete": {
                vscode.window
                  .showQuickPick(workspacesNames)
                  .then((val?: string) => {
                    if (val === "Close" || val === undefined) {
                      return;
                    }
                    const chosenWorkspaceId =
                      workspaceIds[workspacesNames.indexOf(val)];
                    workspaceManager.removeById(chosenWorkspaceId);
                  });
                break;
              }
            }
          });
        }
      );
      context.subscriptions.push(registerCommand);
    }
  );
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
