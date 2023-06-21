import { BriefcaseDb, CodeService, IpcHost, OpenBriefcaseArgs } from "@itwin/core-backend";
import { OpenMode, Guid, ChangeSetStatus } from "@itwin/core-bentley";
import { BriefcaseIdValue, IModelError } from "@itwin/core-common";
import ConnectorBriefcaseManager from "./ConnectorBriefcaseManager";
import { OpenTowerIModelLockService } from "./Service/OpenTowerIModelLockService";


export class ConnectorBriefcaseDb extends BriefcaseDb {
  public accessToken: any;
  constructor(args: any) {
    super(args);
    // super({ ...args, changeset: args.nativeDb.getCurrentChangeset() });
    this.accessToken = args.accessToken;
  }


  public static override async open(args: any): Promise<BriefcaseDb> {
    this.onOpen.raiseEvent(args);

    const file = { path: args.fileName, key: args.key };
    const openMode = args.readonly ? OpenMode.Readonly : OpenMode.ReadWrite;
    const nativeDb = this.openDgnDb(file, openMode, undefined, args);
    const briefcaseDb = new ConnectorBriefcaseDb({ nativeDb, key: file.key ?? Guid.createValue(), openMode, briefcaseId: nativeDb.getBriefcaseId(), accessToken: args.accessToken });

    if (openMode === OpenMode.ReadWrite && CodeService.createForIModel) {
      try {
        const codeService = CodeService.createForIModel(briefcaseDb);
        briefcaseDb._codeService = codeService;
        this.onCodeServiceCreated.raiseEvent(codeService);
      } catch (e: any) {
        if (e.errorId !== "NoCodeIndex") // no code index means iModel isn't enforcing codes.
          throw e;
      }
    }

    ConnectorBriefcaseManager.logUsage(briefcaseDb);
    this.onOpened.raiseEvent(briefcaseDb, args);
    return briefcaseDb;
  }

  override async pushChanges(arg: any) {

    console.log("ConnectorBriefcaseDb pushChanges")
    if (this.briefcaseId === BriefcaseIdValue.Unassigned) {
      console.log("ConnectorBriefcaseDb pushChanges first case")
      return;
    }
    if (this.nativeDb.hasUnsavedChanges()) {
      console.log("ConnectorBriefcaseDb pushChanges second case")
      throw new IModelError(ChangeSetStatus.HasUncommittedChanges, "Cannot push with unsaved changes");
    }
    if (!this.nativeDb.hasPendingTxns()) {
      console.log("ConnectorBriefcaseDb pushChanges third case")
      return; // nothing to push
    }

    await ConnectorBriefcaseManager.pullMergePush(this, arg);
    this.initializeIModelDb();
  }

  /** Pull and apply changesets from iModelHub */
  override async pullChanges(arg: any) {
    if (this.isReadonly) // we allow pulling changes into a briefcase that is readonly - close and reopen it writeable
      this.closeAndReopendb(OpenMode.ReadWrite);
    try {
      await ConnectorBriefcaseManager.pullAndApplyChangesets(this, arg !== null && arg !== void 0 ? arg : {});
      this.initializeIModelDb();
    }
    finally {
      if (this.isReadonly) // if the briefcase was opened readonly - close and reopen it readonly
        this.closeAndReopendb(OpenMode.Readonly);
    }
    // IpcHost.notifyTxns(this, "notifyPulledChanges", this.changeset);
  }

  closeAndReopendb(openMode: any) {
    const fileName = this.pathName;
    this.nativeDb.closeIModel();
    this.nativeDb.openIModel(fileName, openMode);
  }

}
