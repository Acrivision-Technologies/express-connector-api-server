import * as path from "path";
import { isIModelsApiError, IModelsErrorCode } from "@itwin/imodels-client-management";
import { ChangesetOperations as ManagementChangesetOperations } from "@itwin/imodels-client-management/lib/operations";
import { GetChangesetListParams, GetSingleChangesetParams } from "@itwin/imodels-client-management/lib/operations/changeset/ChangesetOperationParams";
import { AuthorizationCallback, Changeset, EntityListIterator, MinimalChangeset, PreferReturn } from "@itwin/imodels-client-management/lib/base/types";
import { EntityListIteratorImpl, IModelsErrorImpl } from "@itwin/imodels-client-management/lib/base/internal";
import { OpenTowerClient } from "../OpenTowerClient";
import { OpenTowerOperationOptions } from "../OpenTowerClient";
import { DownloadSingleChangesetParams, DownloadedChangeset } from "@itwin/imodels-client-authoring";
import {  LimitedParallelQueue } from "@itwin/imodels-client-authoring/lib/operations/changeset/LimitedParallelQueue";
import * as FileDownload from "@itwin/imodels-client-authoring/lib/operations/FileDownload";
import { Axios, AxiosError } from "axios";

export class ChangesetOperations<TOptions extends OpenTowerOperationOptions> extends ManagementChangesetOperations<TOptions> {
    private _iModelsClientInstance: OpenTowerClient;
    constructor(options: any, _iModelsClient: OpenTowerClient) {
        super(options, _iModelsClient);
        this._iModelsClientInstance = _iModelsClient;
    }

    getCreateChangesetRequestBody(changesetProperties: any, changesetFileSize: any) {
        const fileName = changesetProperties.filePath.split(path.sep).pop();
        return {
            "instance": {
              "schemaName": "iModelScope",
              "className": "ChangeSet",
              "properties": {
                "Id": changesetProperties.id,
                "FileName": fileName,
                "Description": changesetProperties.description,
                "FileSize": changesetFileSize,
                "SeedFileId": changesetProperties.id,
                "BriefcaseId": changesetProperties.briefcaseId*1,
                "ContainingChanges": changesetProperties.containingChanges,
                "ParentId": changesetProperties.parentId ? changesetProperties.parentId : '',
              }
            }
        }
    }

    async create(params: any) {
        try {
            // console.log(`params`);
            // console.log(params);
            const changesetFileSize = await this._options.localFileSystem.getFileSize(params.changesetProperties.filePath);
            const createChangesetBody: any = this.getCreateChangesetRequestBody(params.changesetProperties, changesetFileSize);
            // console.log("createChangesetBody");
            // console.log(JSON.stringify(createChangesetBody));
            const createChangesetResponse: any = await this.sendPostRequest({
                authorization: params.authorization,
                url: this._options.urlFormatter.getChangesetListUrl({ iModelId: params.iModelId }),
                body: createChangesetBody
            });

            // console.log('createChangesetResponse');
            // console.log(JSON.stringify(createChangesetResponse));
            const uploadUrl = createChangesetResponse.changedInstance.instanceAfterChange.relationshipInstances[0].relatedInstance.properties['UploadUrl'];
            createChangesetBody.instance.properties = createChangesetResponse.changedInstance.instanceAfterChange.properties;
            const uploadResult = await this._options.cloudStorage.upload({
                url: uploadUrl,
                data: params.changesetProperties.filePath
            });
            const confirmUploadBody: any = {...createChangesetBody};
            confirmUploadBody.instance["instanceId"] = params.changesetProperties.id;
            confirmUploadBody.instance.properties["IsUploaded"] = true;
            const confirmUploadResponse: any = await this.sendPostRequest({
                authorization: params.authorization,
                url: this._options.urlFormatter.getChangesetListUrl({ iModelId: params.iModelId }) + "/" + params.changesetProperties.id,
                body: confirmUploadBody
            });
            const result = this.appendRelatedEntityCallbacksMethod(confirmUploadResponse.changedInstance.instanceAfterChange);
            return result;
        } catch(e) {
            throw new Error((e as any).message)
        }
    }

    override getSingle = (params: any): Promise<Changeset> => {
        return new Promise(async (resolve: any, reject: any) => {

            try {

                const changeset = await this.querySingleInternal(params);
                reject("Dummy Error");
                // resolve(changeset);

            } catch (e) {
                reject((e as any).message);
            }
        })
    }

    override async querySingleInternal(params: any): Promise<any> {
        const { authorization, iModelId, ...changesetIdOrIndex } = params;

        const response: any = await this.sendGetRequest({
            authorization,
            url: this._options.urlFormatter.getChangesetListUrl({ iModelId })
        });
        const result = this.appendRelatedEntityCallbacksMethod(response.instances[0]);
        return result;
    }

    private createFileName(changesetId: any) {
        return `${changesetId}.cs`;
    }

    private async downloadChangesetFileWithRetry(params: any) {
        var _a;
        const targetFilePath = params.changeset.filePath;
        if (await this.isChangesetAlreadyDownloaded(targetFilePath, params.changeset.fileSize))
            return;
        const downloadParams: any = {
            storage: this._options.cloudStorage,
            localPath: targetFilePath,
            abortSignal: params.abortSignal
        };
        let bytesDownloaded = 0;
        if (params.downloadCallback) {
            downloadParams.latestDownloadedChunkSizeCallback = (downloaded: any) => {
                var _a;
                bytesDownloaded += downloaded;
                (_a = params.downloadCallback) === null || _a === void 0 ? void 0 : _a.call(params, downloaded);
            };
        }
        try {
            const downloadLink = params.changeset.downloadUrl;
            await (0, FileDownload.downloadFile)({
                ...downloadParams,
                url: downloadLink
            });
        }
        catch (error) {
            this.throwIfAbortError(error, params.changeset);
            (_a = params.firstDownloadFailedCallback) === null || _a === void 0 ? void 0 : _a.call(params, bytesDownloaded);
            const changeset = await this.querySingleInternal({
                authorization: params.authorization,
                iModelId: params.iModelId,
                changesetId: params.changeset.id
            });
            try {
                const newDownloadLink = params.changeset.downloadUrl;
                await (0, FileDownload.downloadFile)({
                    ...downloadParams,
                    url: newDownloadLink
                });
            }
            catch (errorAfterRetry) {
                this.throwIfAbortError(error, params.changeset);
                throw new IModelsErrorImpl({
                    code: IModelsErrorCode.ChangesetDownloadFailed,
                    message: `Failed to download changeset. Changeset id: ${params.changeset.id}, changeset index: ${params.changeset.index}, error: ${JSON.stringify(errorAfterRetry)}.`
                });
            }
        }
    }

    private async isChangesetAlreadyDownloaded(targetFilePath: any, expectedFileSize: any) {
        const fileExists = await this._options.localFileSystem.fileExists(targetFilePath);
        if (!fileExists)
            return false;
        const existingFileSize = await this._options.localFileSystem.getFileSize(targetFilePath);
        if (existingFileSize === expectedFileSize)
            return true;
        await this._options.localFileSystem.deleteFile(targetFilePath);
        return false;
    }


    /**
     * Downloads Changeset list. Internally the method uses {@link ChangesetOperations.getRepresentationListMethod} to query the
     * Changeset collection so this operation supports most of the the same url parameters to specify what Changesets to
     * download. One of the most common properties used are `afterIndex` and `lastIndex` to download Changeset range. This
     * operation downloads Changesets in parallel. If an error occurs when downloading a Changeset this operation queries
     * the failed Changeset by id and retries the download once. If the Changeset file with the expected name already
     * exists in the target directory and the file size matches the one expected the Changeset is not downloaded again.
     * @param {DownloadChangesetListParams} params parameters for this operation. See {@link DownloadChangesetListParams}.
     * @returns downloaded Changeset metadata along with the downloaded file path. See {@link DownloadedChangeset}.
     */
    async downloadList(params: any): Promise<any> {
        var _a;

        await this._options.localFileSystem.createDirectory(params.targetDirectoryPath);
        
        const [downloadCallback, downloadFailedCallback] = (_a = await this.provideDownloadCallbacks(params)) !== null && _a !== void 0 ? _a : [];

        let result: any = [];
        const data: any[] = await this.getRepresentationListMethod(params);
        if(data.length > 0) {
            const changesetsWithFilePath = data.map((changeset) => ({
                ...changeset,
                filePath: path.join(params.targetDirectoryPath, this.createFileName(changeset.id))
            }));
            result = result.concat(changesetsWithFilePath);
            // We sort the changesets by fileSize in descending order to download small
            // changesets first because their SAS tokens have a shorter lifespan.
            changesetsWithFilePath.sort((changeset1, changeset2) => changeset1.fileSize - changeset2.fileSize);
            const queue = new LimitedParallelQueue({ maxParallelPromises: 10 });

            for (const changeset of changesetsWithFilePath)
                queue.push(async () => this.downloadChangesetFileWithRetry({
                    authorization: params.authorization,
                    iModelId: params.iModelId,
                    changeset,
                    abortSignal: params.abortSignal,
                    downloadCallback,
                    firstDownloadFailedCallback: downloadFailedCallback
                }));
            await queue.waitAll();
        }
        return result;
    }

    async provideDownloadCallbacks(params: any) {
        
        // if (!params.progressCallback)
        //     return;
        let totalSize = 0;
        let totalDownloaded = 0;
        params['urlParams'] = {  "$filter": encodeURI(`Index gt ${params.urlParams.afterIndex}`)};
        const result: any = await this.getMinimalListRequest(params);
        // for await (const changesetPage of this.getMinimalListRequest(params).byPage()) {
        for (const changeset of result) {
            totalSize += changeset.fileSize;
            const filePath = path.join(params.targetDirectoryPath, this.createFileName(changeset.id));
            if (await this.isChangesetAlreadyDownloaded(filePath, changeset.fileSize))
                totalDownloaded += changeset.fileSize;
        }
        // }
        const progressCallback = (downloaded: any) => {
            var _a;
            totalDownloaded += downloaded;
            (_a = params.progressCallback) === null || _a === void 0 ? void 0 : _a.call(params, totalDownloaded, totalSize);
        };
        // We increase total size to prevent cases where downloaded size is larger than total size at the end of the download.
        const downloadFailedCallback = (downloadedBeforeFailure: any) => totalSize += downloadedBeforeFailure;
        return [progressCallback, downloadFailedCallback];
    }

    getMinimalListRequest = async (params: any): Promise<any[]> => {
        const entityCollectionAccessor = (response: any) => {

            const changesets = response.instances;
            const mappedChangesets = changesets.map((changeset: any) => this.appendRelatedMinimalEntityData(changeset));
            return mappedChangesets;
        };
        // return new EntityListIteratorImpl(async () => this.getEntityCollectionPage({
        //     authorization: params.authorization,
        //     url: this._options.urlFormatter.getChangesetListUrl({ iModelId: params.iModelId, urlParams: params.urlParams }),
        //     preferReturn: PreferReturn.Minimal,
        //     entityCollectionAccessor
        // }));
        let url = this._options.urlFormatter.getChangesetListUrl({ iModelId: params.iModelId, urlParams: params.urlParams });

        const response: any = await this.sendGetRequest({
            authorization: params.authorization,
            url: url
        });

        const result = entityCollectionAccessor(response);


        return result;
    }
    appendRelatedMinimalEntityData(changeset: any) {
        const changeSetProperty = changeset.properties;
        const result = {
            "id": changeSetProperty["Id"],
            "displayName": changeSetProperty["Index"],
            "description": changeSetProperty["Description"],
            "index": changeSetProperty["Index"]*1,
            "parentId": changeSetProperty["ParentId"],
            "briefcaseId": changeSetProperty["BriefcaseId"],
            "fileSize": changeSetProperty["FileSize"]*1,
            "state": changeSetProperty["IsUploaded"] == true ? "fileUploaded" : "",
            "containingChanges": changeSetProperty["ContainingChanges"],
            "creatorId": changeSetProperty["UserCreated"],
            "pushDateTime": changeSetProperty["PushDate"],
            "downloadUrl": changeset.relationshipInstances? changeset.relationshipInstances[0].relatedInstance.properties['DownloadUrl'] : ''
        };
        return result;
    }

    appendRelatedMinimalEntityCallbacksData(changeset: any) {
        const changeSetProperty = changeset.properties;
        const result = {
            "id": changeSetProperty["Id"],
            "displayName": changeSetProperty["Index"],
            "description": changeSetProperty["Description"],
            "index": changeSetProperty["Index"]*1,
            "parentId": changeSetProperty["ParentId"],
            "briefcaseId": changeSetProperty["BriefcaseId"],
            "fileSize": changeSetProperty["FileSize"]*1,
            "state": changeSetProperty["IsUploaded"] == true ? "fileUploaded" : "",
            "containingChanges": changeSetProperty["ContainingChanges"],
            "creatorId": changeSetProperty["UserCreated"],
            "pushDateTime": changeSetProperty["PushDate"],
            "downloadUrl": changeset.relationshipInstances? changeset.relationshipInstances[0].relatedInstance.properties['DownloadUrl'] : ''
        };
        return result;
    }

    async getRepresentationListMethod(params: any) : Promise<any[]> {
        const entityCollectionAccessor = (response: any) => {
            const changesets = response.instances;
            const mappedChangesets = changesets.map((changeset: any) => this.appendRelatedEntityCallbacksMethod(changeset));
            return mappedChangesets;
        };
        const url = this._options.urlFormatter.getChangesetListUrl({ iModelId: params.iModelId, urlParams: params.urlParams });
        const response: any = await this.sendGetRequest({
            authorization: params.authorization,
            url: url
        });
        const result = entityCollectionAccessor(response);
        return result;
    }

    appendRelatedEntityCallbacksMethod(changeset: any) {
        const changesetWithMinimalCallbacks = this.appendRelatedMinimalEntityCallbacksData(changeset);
        const result = {
            ...changesetWithMinimalCallbacks,
        };
        return result;
    }

    async getNamedVersionMethod(authorization: any, namedVersionLink: any) {
        if (!namedVersionLink)
            return undefined;
        const { iModelId, namedVersionId } = this._options.urlFormatter.parseNamedVersionUrl(namedVersionLink);
        return this._iModelsClientInstance.namedVersions.getSingle({
            authorization,
            iModelId,
            namedVersionId
        });
    }

    async getCurrentOrPrecedingCheckpointMethod(authorization: any, currentOrPrecedingCheckpointLink: any) {
        if (!currentOrPrecedingCheckpointLink)
            return undefined;
        const entityIds = this._options.urlFormatter.parseCheckpointUrl(currentOrPrecedingCheckpointLink);
        return this._iModelsClientInstance.checkpoints.getSingle({
            authorization,
            ...entityIds
        });
    }
    throwIfAbortError(error: any, changeset: any) {
        if (!(isIModelsApiError)(error) || error.code !== IModelsErrorCode.DownloadAborted)
            return;
        error.message = `Changeset download was aborted. Changeset id: ${changeset.id}, message: ${error.message}}.`;
        throw error;
    }

}