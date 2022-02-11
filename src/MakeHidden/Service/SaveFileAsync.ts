import * as fs from "fs";

/* --------------------
 * Writes to a give file and returns promise
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function SaveFileAsync(filename: string, data: any) {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filename, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
