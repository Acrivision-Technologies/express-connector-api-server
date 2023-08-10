
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import dotenv from 'dotenv';

dotenv.config();

export class IModelBriefcaseApiService {

    private clientEndPoint: string = process.env.IMODElHUB_BASE_URL!; 
    private apiVersion: string = process.env.IMODElHUB_BASE_URL_API_VERSION!;
    private createIModelBriefcaseRequestPath = "Repositories/iModel--{iModelId}/iModelScope/Briefcase";
    private deleteIModelBriefcaseRequestPath = "Repositories/iModel--{iModelId}/iModelScope/Briefcase/{briefcaseId}";


    acquireNewBriefcaseId = async (url: string, accessToken: string, reformUrl? : boolean, iModelId?: string, changesetId? : any): Promise<any> => {
        return await new Promise(async(resolve: any, reject: any) => {

            // console.log(`changesetId==> ${changesetId}`);

            if(reformUrl) {
                url = `${this.clientEndPoint}/${this.apiVersion}/${this.createIModelBriefcaseRequestPath}`.replace("{iModelId}", iModelId ?? '')
            }


            try {

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }

                let body = {};
                if(changesetId) {
                    body =  {
                        "instance": {
                          "schemaName": "iModelScope",
                          "className": "Briefcase",
                          "properties": {
                            "ChangeSetIdOnDevice": changesetId + "",
                          }
                        }
                      }
                }

                // console.log(`body`);
                // console.log(body);
                console.log(`url`);
                console.log(url);

                await axios.post(url, body, requestConfig)
                    .then((res: AxiosResponse) => {
                        // console.log('res');
                        // console.log(res);
                        const briefcaseId: string = res.data.changedInstance.instanceAfterChange.instanceId;
                        const briefcaseDownloadUrl: string = res.data.changedInstance.instanceAfterChange.relationshipInstances[0].relatedInstance.properties.DownloadUrl;
                        let response: any = {
                            briefcaseId,
                            briefcaseDownloadUrl
                        }
                        resolve(response);

                    })
                    .catch((error: AxiosError) => {
                        console.log("error");
                        console.log(error)
                        let errorMsg = "";
                        if(error.code) {
                            errorMsg += `${error.code}: `;
                        }
                        if(error.message) {
                            errorMsg += error.message
                        }

                        reject(errorMsg);
                    })
            } catch(e) {
                let errorMsg = (e as any).message;
                reject(errorMsg);
            }

        });
    }

    releaseNewBriefcaseId = async (iModelId: string, briefcaseId: string, accessToken: string) => {
        console.log("inside releaseNewBriefcaseId");
        return new Promise((resolve: any, reject: any) => {

            try {
                let url = this.clientEndPoint + '/' + this.apiVersion + '/' + this.deleteIModelBriefcaseRequestPath.replace('{iModelId}', iModelId).replace('{briefcaseId}', briefcaseId);
                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }

                axios.delete(url, requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve("Deleted Successfully");

                    })
                    .catch((error: AxiosError) => {
                        let errorMsg = "";
                        if(error.code) {
                            errorMsg += `${error.code}: `;
                        }
                        if(error.message) {
                            errorMsg += error.message
                        }

                        reject(errorMsg);
                    })
            } catch(e) {
                let errorMsg = (e as any).message;
                reject(errorMsg);
            }

        })
    }

}