import * as Util from "../../utilities";
import { ItemStore } from "../ItemStore/ItemStore.class";

export interface Workspace {
  id: string;
  name: string;
  path: string;
  excludedItems: any;
}

export class Workspaces {
  store: ItemStore;
  workspaces: Workspace[] | undefined;

  constructor(settingPath: string = Util.getExtensionSettingPath()) {
    this.store = new ItemStore(settingPath, `workspaces`);
  }

  /* --------------------
   * Have done this here as i think it will be good when
   * formatting the list, e.g by file type(.exe) name acs/desc
   */
  public getWorkspaces(): Promise<Workspace[]> {
    return new Promise((resolve, reject) => {
      this.store.get().then((store: Workspace[]) => {
        resolve(store);
      });
    });
  }

  /* --------------------
   * Creates & Saves a new workspace object
   */
  public create(
    name: string | null = null,
    excludedItems: any = null,
    path = "global"
  ) {
    if (name && excludedItems) {
      const workspace: Workspace = this.buildWorkspace(
        name,
        path,
        excludedItems
      );
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.store.addItem(workspace.id, workspace).then((workspaces: any) => {});
    }
  }

  /* --------------------
   * Removes a given workspace by id
   */
  public removeById(id: string | null = null) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.store.removeItem(id).then(() => {});
  }

  /* --------------------
   * Builds an workspace object for the store
   */
  protected buildWorkspace(
    name: string,
    path = "global",
    items: any = {}
  ): Workspace {
    return {
      id: this.guidGenerator(),
      name: name,
      path: path,
      excludedItems: items,
    };
  }

  /* --------------------
   * Create id
   */
  private guidGenerator(): string {
    const S4 = function () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return S4() + "-" + S4();
  }
}
