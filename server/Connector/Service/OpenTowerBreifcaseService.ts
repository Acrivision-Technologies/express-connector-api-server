import * as path from "path";
import * as fs from "fs";
import { BriefcaseDb, IModelHost, IModelJsFs, RequestNewBriefcaseArg } from "@itwin/core-backend";
import { IModelBriefcaseApiService } from "../OpenTowerApis/IModelBriefcaseApiService"
import { IModelVersion } from "@itwin/core-common";
import axios, { AxiosResponse } from "axios";
import { Guid, OpenMode } from "@itwin/core-bentley";
import { ConnectorBriefcaseDb } from "../ConnectorBriefcaseDb";



export class OpenTowerBreifcaseService {

    private getIModelPath(iModelId: string) { return path.join(IModelHost.cacheDir + '/imodels', iModelId); }

    private getBriefcaseBasePath(iModelId: string) {
        return path.join(this.getIModelPath(iModelId), "briefcases");
    }

    private getBriefcaseFilePath(iModelId: string, briefcaseId : string) {
        return path.join(this.getBriefcaseBasePath(iModelId), `${briefcaseId}.bim`);
    }

    public downloadBriefcase = (reqArg: RequestNewBriefcaseArg, downloadArgs: any): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {

            // get the local fileName for iModel Briefcase
            const briefcaseBasePath = this.getBriefcaseBasePath(reqArg.iModelId);
            const fileName = path.join(briefcaseBasePath, `${reqArg.briefcaseId}.bim`);

            axios.get(downloadArgs.briefcaseDownloadUrl, { responseType: 'stream' })
                .then((contentRes: AxiosResponse) => {
                    fs.mkdirSync(briefcaseBasePath, { recursive: true });
                    const streamWriter = fs.createWriteStream(fileName);
                    contentRes.data.pipe(streamWriter);
                    let error: any = null;
                    streamWriter.on('error', err => {
                        error = err;
                        streamWriter.close();
                        reject(err.message);
                    });
                    streamWriter.on('close', () => {
                        if (!error) {
                            resolve(fileName);
                        }
                    });
                })
                .catch((error: any) => {
                    reject(error.message);
                })

        });

    }

    public loadNativeDb = (localFileName: string, briefcaseId: any, access_token: string): Promise<ConnectorBriefcaseDb> => {
        return new Promise((resolve: any, reject: any) => {
            try {

                const nativeDb = new IModelHost.platform.DgnDb();
                const db = nativeDb.openIModel(localFileName, OpenMode.ReadWrite);
                const openMode = OpenMode.ReadWrite;
                nativeDb.resetBriefcaseId(briefcaseId*1);
                const briefcaseDb: ConnectorBriefcaseDb = new ConnectorBriefcaseDb({ nativeDb, key: Guid.createValue(), openMode, briefcaseId: briefcaseId, accessToken: access_token });
                resolve(briefcaseDb);

            } catch(e) {
                reject((e as any).message);
            }
        })
    }

    loadBriefcaseDb = (reqArg: RequestNewBriefcaseArg, changesetId?: any): Promise<ConnectorBriefcaseDb> => {

        const accessToken = reqArg.accessToken ?? '';

        return new Promise((resolve: any, reject: any) => {
            // acquire New BriefcaseId for process
            new IModelBriefcaseApiService().acquireNewBriefcaseId( "", accessToken, true, reqArg.iModelId, changesetId)
                .then((acquiredBriefcaseRes: any) => {
                    reqArg.briefcaseId = acquiredBriefcaseRes.briefcaseId;
                    this.downloadBriefcase(reqArg, acquiredBriefcaseRes)
                        .then((localFileName: string) => {


                            this.loadNativeDb(localFileName, acquiredBriefcaseRes.briefcaseId, reqArg.accessToken ?? '')
                                .then((briefcaseDb: ConnectorBriefcaseDb) => {


                                    resolve(briefcaseDb);
                                })
                                .catch((error: any) => {
                                    reject(error);
                                })

                        })
                        .catch((error: any) => {
                            new IModelBriefcaseApiService().releaseNewBriefcaseId(reqArg.iModelId, acquiredBriefcaseRes.briefcaseId, accessToken)
                                .then((releaseResponse: any) => {
                                    reject(error);
                                })
                                .catch((error: any) => {
                                    reject(error);
                                })
                        })
                })
                .catch((error: any) => {
                    console.log("IModelBriefcaseApiService().acquireNewBriefcaseId error");
                    console.log(error);
                    reject(error);

                })
        })

    }

    public async releaseBriefcaseAndDeleteLocalFiles(iModelId: string, briefcaseId: string, accessToken: string): Promise<any> {
        return new Promise((resolve: any, reject: any) => {
            new IModelBriefcaseApiService().releaseNewBriefcaseId(iModelId, briefcaseId, accessToken)
                .then((releaseResponse: any) => {
                    const briefcaseFileName = this.getBriefcaseFilePath(iModelId, briefcaseId);
                    console.log(`briefcaseFileName: ${briefcaseFileName}`);
                    if(fs.existsSync(briefcaseFileName)) {
                        // fs.unlinkSync(briefcaseFileName);
                        // fs.unlinkSync(briefcaseFileName + '-locks');
                    }
                    resolve(releaseResponse);
                })
                .catch((error: any) => {
                    reject(error);
                })

        })
    }

}