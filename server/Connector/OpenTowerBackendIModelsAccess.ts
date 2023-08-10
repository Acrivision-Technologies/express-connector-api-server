import { BriefcaseDbArg, IModelHost, IModelIdArg, IModelJsFs, SnapshotDb, IModelDb, BriefcaseLocalValue } from "@itwin/core-backend";
import { AccessTokenAdapter, BackendIModelsAccess } from "@itwin/imodels-access-backend";
import { PlatformToClientAdapter } from "@itwin/imodels-access-backend/lib/interface-adapters/PlatformToClientAdapter";
import { ChangesetOrderByProperty, CreateNamedVersionParams, IModelsClient, NamedVersionPropertiesForCreate, OrderByOperator } from "@itwin/imodels-client-authoring";
import { OpenTowerIModelLockService } from "../Connector/Service/OpenTowerIModelLockService";
import { ChangesetProps, BriefcaseIdValue, Cartographic, EcefLocation, EcefLocationProps } from "@itwin/core-common";
import { OpenTowerClient } from "./Clients/OpenTowerClient";
import { Logger, Guid, OpenMode } from "@itwin/core-bentley";
import * as path from "path";


export class OpenTowerBackendIModelsAccess extends BackendIModelsAccess {
    private iModelsClient: OpenTowerClient

    constructor(iModelsClient: OpenTowerClient) {
        super(iModelsClient);
        this.iModelsClient = iModelsClient

    }

    override releaseAllLocks = async (briefcase: any): Promise<void> => {
        await new OpenTowerIModelLockService().releaseAllLocks(briefcase);
    }

    override async acquireLocks(arg: any, locks: any) {
        const updateLockParams = {
            ...this.getIModelScopedOperationParamsMethod(arg),
            briefcaseId: arg.briefcaseId,
            changesetId: arg.changeset.id,
            lockedObjects: PlatformToClientAdapter.toLockedObjects(locks)
        };

        await this.iModelsClient.locks.update(updateLockParams);
    }

    getIModelScopedOperationParamsMethod(arg: any) {
        return {
            ...this.getAuthorizationParamRequest(arg),
            iModelId: arg.iModelId
        };
    }
    getAuthorizationParamRequest(tokenArg: any) {
        const authorizationCallback = tokenArg.accessToken
            ? AccessTokenAdapter.toAuthorizationCallback(tokenArg.accessToken)
            : this.getAuthorizationCallbackFromIModelHostMethod();
        return {
            authorization: authorizationCallback
        };
    }

    getAuthorizationCallbackFromIModelHostMethod() {
        return async () => {
            const token = await IModelHost.getAccessToken();
            return AccessTokenAdapter.toAuthorization(token);
        };
    }

    override async getLatestChangeset(arg: IModelIdArg): Promise<ChangesetProps> {

        return new Promise(async(resolve: any, reject: any) => {

            try {
                const getChangesetListParams = {
                    ...this.getIModelScopedOperationParamsMethod(arg),
                    urlParams: {
                        $top: 1,
                        $orderby: {
                            property: ChangesetOrderByProperty.Index,
                            operator: OrderByOperator.Descending
                        }
                    }
                };
    
    
                const changesetsIterator: any[] = await this.iModelsClient.changesets.getMinimalListRequest(getChangesetListParams);
                if(changesetsIterator.length > 0) {
                    resolve(changesetsIterator[0])
                } else{
                    resolve([]);
                }
            } catch(e: any) {
                reject(e);
            }

        })
    }

    async pushChangeset(arg: any) {
        // console.log("OpenTowerBackendIModelsAccess pushChangeset")
        let changesetDescription = arg.changesetProps.description;
        if (changesetDescription.length >= 255) {
            Logger.logWarning("BackendIModelsAccess", `pushChangeset - Truncating description to 255 characters. ${changesetDescription}`);
            changesetDescription = changesetDescription.slice(0, 254);
        }
        const changesetFileProps: any = arg.changesetProps;
        const changesetProperties =  {
            id: changesetFileProps.id,
            parentId: changesetFileProps.parentId,
            containingChanges: PlatformToClientAdapter.toContainingChanges(changesetFileProps.changesType),
            description: changesetDescription,
            briefcaseId: changesetFileProps.briefcaseId,
            filePath: changesetFileProps.pathname,
            index: changesetFileProps.index
        };

        // console.log("---- changesetProperties");
        // console.log(changesetProperties);
        const createChangesetParams = {
            ...this.getIModelScopedOperationParamsMethod(arg),
            changesetProperties: changesetProperties
        };
        const createdChangeset = await this._iModelsClient.changesets.create(createChangesetParams);
        return createdChangeset.index;
    }

    copyAndPrepareBaselineFileMethod(arg: any) {
        console.log("inside OpenTowerBackendIModelsAccess copyAndPrepareBaselineFileMethod");
        console.log(arg.getEcefLocationProps);
        var _a;
        const tempBaselineFilePath = (path.join)(IModelHost.cacheDir, `temp-baseline-${Guid.createValue()}.bim`);
        IModelJsFs.removeSync(tempBaselineFilePath);
        const baselineFilePath = arg.version0;
        console.log(`baselineFilePath: ${baselineFilePath}`);
        if (!baselineFilePath) { // if they didn't supply a baseline file, create a blank one.
            console.log(":inside")
            const emptyBaseline = SnapshotDb.createEmpty(tempBaselineFilePath, { rootSubject: { name: (_a = arg.description) !== null && _a !== void 0 ? _a : arg.iModelName } });
            if(arg.getEcefLocationProps) {
                const cartographic = Cartographic.fromDegrees(arg.getEcefLocationProps?.cartographicOrigin!)
                console.log('cartographic');
                console.log(cartographic);
                console.log(JSON.stringify(cartographic));
                console.log("cartographic.toEcef()");
                console.log(cartographic.toEcef());
                const newecefLocationProps: EcefLocationProps = {
                    origin: cartographic.toEcef(),
                    orientation: arg.getEcefLocationProps.orientation,
                    cartographicOrigin: cartographic
                }
                console.log('newecefLocationProps');
                console.log(newecefLocationProps);
                const newecefLocation = new EcefLocation(newecefLocationProps);
                console.log('++++ newecefLocation');
                console.log(newecefLocation);
                console.log(JSON.stringify(newecefLocation));
                emptyBaseline.updateEcefLocation(newecefLocation);
            }
            emptyBaseline.saveChanges();
            emptyBaseline.close();
        }
        else {
            IModelJsFs.copySync(baselineFilePath, tempBaselineFilePath);
        }
        const nativeDb = IModelDb.openDgnDb({ path: tempBaselineFilePath }, OpenMode.ReadWrite);
        try {
            nativeDb.setITwinId(arg.iTwinId);
            nativeDb.saveChanges();
            // cspell:disable-next-line
            nativeDb.deleteAllTxns(); // necessary before resetting briefcaseId
            nativeDb.resetBriefcaseId(BriefcaseIdValue.Unassigned);
            nativeDb.saveLocalValue(BriefcaseLocalValue.NoLocking, arg.noLocks ? "true" : undefined);
            nativeDb.saveChanges();
        }
        finally {
            nativeDb.closeIModel();
        }
        return tempBaselineFilePath;
    }

    async createNewIModel(arg: any) {
        // console.log("inside OpenTowerBackendIModelsAccess createNewIModel");
        // console.log(JSON.stringify(arg));
        // let getEcefLocationProps = {...arg.getEcefLocationProps};

        // console.log("getEcefLocationProps");
        // console.log(getEcefLocationProps);

        // delete arg.getEcefLocationProps;

        // console.log("after delete");
        // console.log(JSON.stringify(arg));
        // TODO: use iModelsClient.iModels.createEmpty when it supports the `noLocks` flag.
        const baselineFilePath = this.copyAndPrepareBaselineFileMethod(arg);
        const createIModelFromBaselineParams = {
            ...this.getAuthorizationParamRequest(arg),
            iModelProperties: {
                ...PlatformToClientAdapter.toIModelProperties(arg),
                filePath: baselineFilePath
            }
        };
        // console.log(`createIModelFromBaselineParams`);
        // console.log(createIModelFromBaselineParams);
        // console.log(JSON.stringify(createIModelFromBaselineParams));
        const iModel = await this._iModelsClient.iModels.createFromBaseline(createIModelFromBaselineParams);
        IModelJsFs.removeSync(baselineFilePath);
        return iModel.id;
    }
}