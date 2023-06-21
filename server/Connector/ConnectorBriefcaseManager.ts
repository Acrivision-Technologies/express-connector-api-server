import { BriefcaseManager, IModelHost, IModelJsFs } from "@itwin/core-backend";
import { ChangeSetStatus, ChangesetType, IModelError } from "@itwin/core-common";
import { IModelHubStatus, BeDuration, IModelStatus } from "@itwin/core-bentley";


export default class ConnectorBriefcaseManager extends BriefcaseManager {


    static async _pushChanges(db: any, arg: any) {
        try {
            var _a, _b;
            const changesetProps = db.nativeDb.startCreateChangeset();
            changesetProps.briefcaseId = db.briefcaseId;
            changesetProps.description = arg.description;
            changesetProps.size = (_a = IModelJsFs.lstatSync(changesetProps.pathname)) === null || _a === void 0 ? void 0 : _a.size;

            changesetProps.index = arg.changesetIndex;
    
            // console.log("===changesetProps");
            // console.log(JSON.stringify(changesetProps))
    
            if (!changesetProps.size) // either undefined or 0 means error
                throw new IModelError(IModelStatus.NoContent, "error creating changeset");
            let retryCount = (_b = arg.pushRetryCount) !== null && _b !== void 0 ? _b : 3;
            while (true) {
                try {
                    // const accessToken = await IModelHost.getAccessToken();
                    let index: number = await IModelHost.hubAccess.pushChangeset({ accessToken: arg.accessToken, iModelId: db.iModelId, changesetProps });
                    index = index*1
                    // console.log("------ final changeset index");
                    // console.log(index);
                    // console.log("db.nativeDb.getCurrentChangeset()");
                    // console.log(db.nativeDb.getCurrentChangeset());
                    db.nativeDb.completeCreateChangeset({ index });
                    db.changeset = db.nativeDb.getCurrentChangeset();
                    return;
                }
                catch (err: any) {
                    const shouldRetry = () => {
                        if (retryCount-- <= 0)
                            return false;
                        switch (err.errorNumber) {
                            case IModelHubStatus.AnotherUserPushing:
                            case IModelHubStatus.DatabaseTemporarilyLocked:
                            case IModelHubStatus.OperationFailed:
                                return true;
                        }
                        return false;
                    };
                    if (!shouldRetry()) {
                        db.nativeDb.abandonCreateChangeset();
                        throw err;
                    }
                }
                finally {
                    IModelJsFs.removeSync(changesetProps.pathname);
                }
            }
        } catch(e) {
            console.log("------------")
            console.log(e);
            throw new IModelError(IModelStatus.BadRequest, "Error while creating changesset props");
        }
    }


    private static async _applySingleChangeset(db: any, changesetFile: any) {
        try {
            if (changesetFile.changesType === ChangesetType.Schema)
                db.clearCaches(); // for schema changesets, statement caches may become invalid. Do this *before* applying, in case db needs to be closed (open statements hold db open.)
    
            
            db.nativeDb.applyChangeset(changesetFile);
            db.changeset = db.nativeDb.getCurrentChangeset();
            // we're done with this changeset, delete it
            IModelJsFs.removeSync(changesetFile.pathname);
        } catch(e) {
            throw new Error((e as any).message);
        }
    }


    static override async pullAndApplyChangesets(db: any, arg: any) {
        try {
            if (!db.isOpen || db.nativeDb.isReadonly()) // don't use db.isReadonly - we reopen the file writable just for this operation but db.isReadonly is still true
                throw new IModelError(ChangeSetStatus.ApplyError, "Briefcase must be open ReadWrite to process change sets");
            let currentIndex = db.changeset.index;
            if (currentIndex === undefined)
                currentIndex = (await IModelHost.hubAccess.queryChangeset({ accessToken: arg.accessToken, iModelId: db.iModelId, changeset: { id: db.changeset.id } })).index;
            const reverse = (arg.toIndex && arg.toIndex < currentIndex) ? true : false;
            // Download change sets
            const changesets = await IModelHost.hubAccess.downloadChangesets({
                accessToken: arg.accessToken,
                iModelId: db.iModelId,
                range: { first: reverse ? arg.toIndex + 1 : currentIndex + 1, end: reverse ? currentIndex : arg.toIndex },
                targetDir: BriefcaseManager.getChangeSetsPath(db.iModelId),
                progressCallback: arg.onProgress,
            });
            if (changesets.length === 0)
                return; // nothing to apply
            if (reverse)
                changesets.reverse();
            for (const changeset of changesets)
                await this._applySingleChangeset(db, changeset);
            // notify listeners
            // db.notifyChangesetApplied();
        } catch(e) {
            throw new Error((e as any).message);
        }
    }

    static override async pullMergePush(db: any, arg: any) {
        console.log("ConnectorBriefcaseManager pushChanges")
        var _a, _b;
        let retryCount = (_a = arg.mergeRetryCount) !== null && _a !== void 0 ? _a : 5;
        while (true) {
            try {
                // await ConnectorBriefcaseManager.pullAndApplyChangesets(db, arg);
                return await ConnectorBriefcaseManager._pushChanges(db, arg);
            }
            catch (err: any) {
                if (retryCount-- <= 0 || err.errorNumber !== IModelHubStatus.PullIsRequired)
                    throw (err);
                await ((_b = arg.mergeRetryDelay) !== null && _b !== void 0 ? _b : BeDuration.fromSeconds(3)).wait();
            }
        }
    }
    
}