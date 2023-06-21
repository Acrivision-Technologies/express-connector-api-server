import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import dotenv from 'dotenv';

dotenv.config();

export class iModelLocksApiService {

    private clientEndPoint: string = process.env.IMODElHUB_BASE_URL!;
    private apiVersion: string = process.env.IMODElHUB_BASE_URL_API_VERSION!;
    private createIModelRequestPath = "Repositories/iModel--{iModelDb}/iModelScope/Lock";


    acquireLock = async (iModelId: string, accessToken: string, briefcaseId: any, rootSubjectId: string): Promise<any> => {
        return await new Promise((resolve: any, reject: any) => {
            try {

                let url = this.clientEndPoint + '/' + this.apiVersion + '/' + this.createIModelRequestPath.replace('{iModelDb}', iModelId);
                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }

                // Shema Level Lock
                let requestBody: any = {
                    "instance": {
                        "schemaName": "iModelScope",
                        "className": "Lock",
                        "properties": {
                            "ObjectId": rootSubjectId,
                            "LockType": 1,
                            "LockLevel": 2,
                            "BriefcaseId": briefcaseId * 1,
                            "ReleasedWithChangeSetIndex": 0
                        }
                    }
                }


                axios.post(url, JSON.parse(JSON.stringify(requestBody)), requestConfig)
                    .then((res: AxiosResponse) => {
                        let lockID = "";
                        if (res.data.changedInstance) {
                            lockID = res.data.changedInstance.instanceAfterChange.instanceId;
                        }
                        resolve(lockID);
                    })
                    .catch((error: AxiosError) => {
                        console.log('error');
                        console.log(error);
                        let errorMsg = "";
                        if (error.code) {
                            errorMsg += `${error.code}: `;
                        }
                        if (error.message) {
                            errorMsg += error.message
                        }

                        reject(errorMsg);

                    })

            } catch (e) {
                reject((e as any).message);
            }
        })

    }

    getIModelLoks = async (iModelId: string, accessToken: string): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            try {

                let url = this.clientEndPoint + '/' + this.apiVersion + '/' + this.createIModelRequestPath.replace('{iModelDb}', iModelId);

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }
                axios.get(url, requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve(res.data);
                    })
                    .catch((error: AxiosError) => {
                        let errorMsg = "";
                        if (error.code) {
                            errorMsg += `${error.code}: `;
                        }
                        if (error.message) {
                            errorMsg += error.message
                        }

                        reject(errorMsg);

                    })

            } catch (e) {
                reject((e as any).message);
            }
        })

    }

    updateLock = (iModelId: any, accessToken: any, lockId: any, requestBody: any): Promise<any> => {
        return new Promise(async(resolve: any, reject: any) => {
            try {
                let url = this.clientEndPoint + '/' + this.apiVersion + '/' + this.createIModelRequestPath.replace('{iModelDb}', iModelId) +"/" + lockId;

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }
               return axios.post(url, JSON.parse(JSON.stringify(requestBody)), requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve(res.data);
                    })
                    .catch((error: AxiosError) => {
                        if(error.response?.status == 404) {
                            resolve("Lock released");
                        } else {
                            let errorMsg = "";
                            if (error.code) {
                                errorMsg += `${error.code}: `;
                            }
                            if (error.message) {
                                errorMsg += error.message
                            }
    
                            reject(errorMsg);
                        }

                    })

            } catch (e) {
                throw new Error((e as any).message);
            }
        });
    }
    
    deleteLock = (iModelId: any, accessToken: any, lockId: any, requestBody: any): Promise<any> => {
        return new Promise(async(resolve: any, reject: any) => {
            try {
                let url = this.clientEndPoint + '/' + this.apiVersion + '/' + this.createIModelRequestPath.replace('{iModelDb}', iModelId) +"/" + lockId;
                console.log(`deleteLock url: ${url}`);

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }
               return axios.delete(url, requestConfig)
                    .then((res: AxiosResponse) => {
                        console.log("lock deleted")
                        resolve(res.data);
                    })
                    .catch((error: AxiosError) => {
                        console.log("lock deletion failed catch case");
                        console.log(error.response);
                        if(error.response?.status == 404) {
                            resolve("Lock deleted");
                        } else {
                            let errorMsg = "";
                            if (error.code) {
                                errorMsg += `${error.code}: `;
                            }
                            if (error.message) {
                                errorMsg += error.message
                            }
    
                            reject(errorMsg);
                        }

                    })

            } catch (e) {
                console.log("lock deletion failed catch case 2");
                console.log(e);
                throw new Error((e as any).message);
            }
        });
    }

}