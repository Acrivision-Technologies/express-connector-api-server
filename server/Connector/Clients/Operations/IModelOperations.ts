import { IModelOperations as ManagementIModelOperations } from "@itwin/imodels-client-management/lib/operations";
import { IModelsErrorCode } from "@itwin/imodels-client-management";
import { OpenTowerOperationOptions, OpenTowerClient } from "../OpenTowerClient";
import { BaselineFileOperations } from "./BaselineFileOperations";
import { OpenTowerIModelApiService } from "../../OpenTowerApis/IModelApiService";
import { IModelJsFs } from "@itwin/core-backend";
import { waitForCondition, IModelsErrorImpl } from "@itwin/imodels-client-management/lib/base/internal";
import * as path from "path";

export class IModelOperations<TOptions extends OpenTowerOperationOptions> extends ManagementIModelOperations<TOptions> {
    private _baselineFileOperations;
    constructor(options: TOptions, _iModelsClient: OpenTowerClient) {
        super(options, _iModelsClient);
        this._baselineFileOperations = new BaselineFileOperations(options);
    }

    createFromBaseline = async (params: any) => {
        try {
            // console.log("inside createFromBaseline")
            const baselineFileSize = await this._options.localFileSystem?.getFileSize(params.iModelProperties.filePath);
            const createdIModel = await this.openTowerSendIModelPostRequest(params);
            params.iModelProperties.iModelId = createdIModel;

            // console.log(`baselineFileSize: ${baselineFileSize}`);

            // Acquire IModel Lock, to start Seed process
            const acquireIModelLock = await this.acquireIModelLock(params);
            // console.log(`acquireIModelLock: ${JSON.stringify(acquireIModelLock)}`)
            // Initiate SeedFile Instance
            const seedFileRseponse = await this.initiateSeedFileInstance(params);

            // console.log("seedFileRseponse");
            // console.log(JSON.stringify(seedFileRseponse));

            const seedFileInstanceId = seedFileRseponse.changedInstance.instanceAfterChange.instanceId;
            // console.log(`seedFileInstanceId: ${seedFileInstanceId}`)
            params.iModelProperties.seedFileInstanceId = seedFileInstanceId;
            const updateResult = await this.updateSeedFileMetaData(params);
            // console.log("updateResult");
            // console.log(JSON.stringify(updateResult));
            params.iModelProperties.seedUploadUrl = updateResult.changedInstance.instanceAfterChange.relationshipInstances[0].relatedInstance.properties.UploadUrl;
            params.iModelProperties.FileId = updateResult.changedInstance.instanceAfterChange.properties.FileId;
            // console.log(`params.iModelProperties.seedUploadUrl: ${params.iModelProperties.seedUploadUrl}`)
            // console.log(`params.iModelProperties.FileId: ${params.iModelProperties.FileId}`)
            const uploadSeedFileResult = await this.uploadSeedFile(params);
            // console.log("uploadSeedFileResult");
            // console.log(uploadSeedFileResult);
            const statusUploadStatus = await this.updateIModelSeedFileUploadedStatus(params);
            // console.log("statusUploadStatus: ")
            // console.log(JSON.stringify(statusUploadStatus))
            const processStatus =  await this.waitForBaselineFileInitialization(params);
            const releaseIModelLockResult = await this.releaseIModelLock(params);
            // console.log("releaseIModelLockResult");
            // console.log(releaseIModelLockResult);
            return { id: createdIModel };
        } catch (e) {
            console.log("inside createFromBaseline error case")
            console.log(e);
            throw new Error((e as any).message);
        }

    }

    openTowerSendIModelPostRequest = async (params: any): Promise<any> => {
        return new Promise(async (resolve: any, reject: any) => {
            try {
                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getOpenTowerCreateIModelUrl(params.iModelProperties);
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                new OpenTowerIModelApiService().createIModel(accessToken, params.iModelProperties.name, url)
                    .then((iModelGuid: any) => {
                        resolve(iModelGuid);
                    })
                    .catch((error: any) => {
                        reject(error);
                    })
            } catch (e) {
                reject((e as any).message)
            }
        })

    }

    acquireIModelLock = async (params: any): Promise<any> => {
        return new Promise(async (resolve: any, reject: any) => {
            try {
                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getOpenTowerIModelLockUrl(params.iModelProperties);
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                new OpenTowerIModelApiService().acquireIModelLock(accessToken, url)
                    .then((res: any) => {
                        resolve(res);
                    })
                    .catch((error: any) => {
                        reject(error);
                    })

            } catch (e) {
                reject((e as any).message)
            }
        })
    }

    releaseIModelLock = async (params: any): Promise<any> => {
        return new Promise(async (resolve: any, reject: any) => {
            try {
                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getOpenTowerReleaseIModelLockUrl(params.iModelProperties);
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                new OpenTowerIModelApiService().releaseIModelLock(accessToken, url)
                    .then((res: any) => {
                        resolve(res);
                    })
                    .catch((error: any) => {
                        reject(error);
                    })

            } catch (e) {
                reject((e as any).message)
            }
        })
    }

    initiateSeedFileInstance = async (params: any): Promise<any> => {
        return new Promise(async (resolve: any, reject: any) => {
            try {

                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getIModelSeederFileInfoUrl(params.iModelProperties);
                console.log("url: ", url)
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                new OpenTowerIModelApiService().getIModelSeedFileInstance(accessToken, url)
                    .then((res: any) => {
                        resolve(res);
                    })
                    .catch((error: any) => {
                        reject(error);
                    })

            } catch (e) {
                console.log(`inside initiateSeedFileInstance error case`)
                reject((e as any).message)
            }
        })

    }

    updateSeedFileMetaData = async (params: any): Promise<any> => {
        return new Promise(async (resolve: any, reject: any) => {
            try {

                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getUpdateIModelSeederFileInfoUrl(params.iModelProperties);
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                const fileName = (params.iModelProperties.filePath.split(path.sep)).pop();

                const fileStats: any = IModelJsFs.lstatSync(params.iModelProperties.filePath);
                let requestBody: any = {
                    "instance": {
                        "instanceId": params.iModelProperties.seedFileInstanceId,
                        "schemaName": "iModelScope",
                        "className": "SeedFile",
                        "properties": {
                            "FileName": fileName,
                            "FileDescription": "Basic setup file",
                            "FileSize": fileStats.size,
                        }
                    }
                }
                new OpenTowerIModelApiService().updateIModelSeedFileInstance(accessToken, url, requestBody)
                    .then((res: any) => {
                        resolve(res);
                    })
                    .catch((error: any) => {
                        reject(error);
                    })

            } catch (e) {
                reject((e as any).message)
            }
        })
    }
    uploadSeedFile = async (params: any): Promise<any> => {
        console.log("inside uploadSeedFile");
        console.log("params");
        console.log(JSON.stringify(params));
        return new Promise(async (resolve: any, reject: any) => {
            try {
                const result = await this._options.cloudStorage.upload({
                    url: params.iModelProperties.seedUploadUrl,
                    data: params.iModelProperties.filePath
                })

                resolve(result);


            } catch (e) {
                reject((e as any).message)
            }
        })
    }

    updateIModelSeedFileUploadedStatus = async (params: any): Promise<any> => {
        console.log("updateIModelSeedFileUploadedStatus")
        return new Promise(async (resolve: any, reject: any) => {
            try {
                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getUpdateIModelSeederFileInfoUrl(params.iModelProperties);
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                const fileName = (params.iModelProperties.filePath.split(path.sep)).pop();

                const fileStats: any = IModelJsFs.lstatSync(params.iModelProperties.filePath);
                // console.log('fileStats');
                // console.log(fileStats);
                let requestBody: any = {
                    "instance": {
                        "instanceId": params.iModelProperties.seedFileInstanceId,
                        "schemaName": "iModelScope",
                        "className": "SeedFile",
                        "properties": {
                            "FileName": fileName,
                            "FileId": params.iModelProperties.FileId,
                            "IsUploaded": true,
                        }
                    }
                }
                // console.log('requestBody');
                // console.log(requestBody);
                new OpenTowerIModelApiService().updateIModelSeedFileInstance(accessToken, url, requestBody)
                    .then((res: any) => {
                        resolve(res);
                    })
                    .catch((error: any) => {
                        reject(error);
                    })


            } catch (e) {
                reject((e as any).message)
            }
        })
    }

    private wait = (ms: number) => new Promise((resolve: any) => {
        setTimeout(() => resolve("next call"), ms);
    });

    waitForBaselineFileInitialization = async(params: any): Promise<any> => {


            try {
                const tokenResponse: any = await params.authorization();
                const url = this._options.urlFormatter?.getUpdateIModelSeederFileInfoUrl(params.iModelProperties);
                const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;
                const result = await new OpenTowerIModelApiService().getIModelSeedFileInfo(accessToken, url)
                const state = result.instances[0].properties.InitializationState;
                if (state == 0) {
                    return true;
                } else if (state == 3) {
                    throw new Error("Error uploading the baseline file");
                } else {

                    await this.wait(1000);

                    return this.waitForBaselineFileInitialization(params)
                }
            } catch(e) {
                throw new Error((e as any).message);
            }
    }



}