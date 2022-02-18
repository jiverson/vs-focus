import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as process from "process";

let VS_CODE_CONTEXT: any = null;
const HOME_DIR = os.homedir();
const PROJECTS_FILE = "MakeHidden.json";

export function setVsCodeContext(context: vscode.ExtensionContext) {
  VS_CODE_CONTEXT = context;
}

export function getExtensionSettingPath(): string {
  let projectFile: string;
  const appData =
    process.env.APPDATA ||
    (process.platform === "darwin"
      ? `${process.env.HOME}/Library/Application Support`
      : "/var/local");

  // TODO: find out more about this
  const channelPath = "Code";
  // const channelPath: string = this.getChannelPath();

  projectFile = path.join(appData, channelPath, "User", PROJECTS_FILE);
  // in linux, it may not work with /var/local, then try to use /home/myuser/.config

  if (process.platform === "linux" && !fs.existsSync(projectFile)) {
    projectFile = path.join(
      HOME_DIR,
      ".config/",
      channelPath,
      "User",
      PROJECTS_FILE
    );
  }

  return projectFile;
}

export function getChannelPath(): string {
  if (vscode.env.appName.indexOf("Insiders") > 0) {
    return "Code - Insiders";
  }

  return "Code";
}

export function getVsCodeCurrentPath() {
  return vscode.workspace.rootPath;
}

export function getPathInfoFromPath(givenPath: string): any {
  const extension = path.extname(givenPath);
  const pathName = path.basename(givenPath);
  return {
    basename: pathName,
    filename:
      extension === "" ? pathName : pathName.slice(0, -extension.length),
    extension,
    path: givenPath.slice(0, -pathName.length),
  };
}

export function getAllItemsInDir(directory = "./") {
  return fs.readdirSync(directory);
}

export function getProjectThemeDirectory(fileName: string) {
  return VS_CODE_CONTEXT.asAbsolutePath(
    path.join("resources", "light", fileName)
  );
}

export function getVscodeSettingPath(pathType?: string) {
  const path = `${getVsCodeCurrentPath()}/.vscode/settings.json`;
  const pathInfo = getPathInfoFromPath(path) as any;
  pathInfo["full"] = path;

  // eslint-disable-next-line no-prototype-builtins
  if (pathInfo.hasOwnProperty(pathType)) {
    return pathInfo[pathType as any];
  }

  return pathInfo;
}

export function createPluginSettingsJson(): void {
  const noticeText =
    "Plugin MakeHidden requires a 'MakeHidden.json' file, would you like to create now?";
  const grantedText = "One Time Create";

  vscode.window
    .showInformationMessage(noticeText, grantedText)
    .then((selection?: string) => {
      if (selection === grantedText) {
        const path = getExtensionSettingPath();
        const info = getPathInfoFromPath(path) as any;
        info["full"] = path;

        fs.mkdir(info["path"], (e) => {
          fs.writeFile(info["full"], `{}`, (err) => {
            if (err) {
              vscode.window.showInformationMessage(
                "Error creating settings.json in .vscode directory"
              );
              throw err;
            }
          });
        });
      }
    });
}

export function createVscodeSettingJson(): void {
  const noticeText =
    "No 'vscode/settings.json' has been found, would you like to create now";
  const grantedText = "Yes, Create File";

  vscode.window
    .showInformationMessage(noticeText, grantedText)
    .then((selection?: string) => {
      if (selection === grantedText) {
        const info = getVscodeSettingPath() as any;

        fs.mkdir(info["path"], (e) => {
          fs.writeFile(info["full"], `{}`, (err) => {
            if (err) {
              vscode.window.showInformationMessage(
                "Error creating settings.json in .vscode directory"
              );
              throw err;
            }
          });
        });
      }
    });
}

export function fileExists(filePath = "") {
  return fs.existsSync(filePath);
}
