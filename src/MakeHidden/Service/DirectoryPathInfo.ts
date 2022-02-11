import * as path from "path";

export interface DirectoryPathInfo {
  basename: string;
  filename: string;
  extension: string;
  path: string;
}

/* --------------------
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function DirectoryPathInfo(
  givenPath: string | null = null
): DirectoryPathInfo {
  let extension: string = path.extname(givenPath as string);
  let pathName: string = path.basename(givenPath as string);
  return {
    basename: pathName,
    filename:
      extension === "" ? pathName : pathName.slice(0, -extension.length),
    extension: extension,
    path: givenPath?.slice(0, -pathName.length) ?? "",
  };
}
