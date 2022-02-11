import * as fs from "fs";

/* --------------------
 * Reads a give file and returns content as a promise
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function ReadFileAsync(filename: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, { encoding: "utf8" }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
