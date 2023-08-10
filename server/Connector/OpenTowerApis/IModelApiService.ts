import { OpenTowerIModelCreateDto } from "./Interfaces/IModelApiInterface";
import * as date from 'date-and-time';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

export class OpenTowerIModelApiService {

    private defaultIModelCreateRequestBody: OpenTowerIModelCreateDto = {
        "instance": {
            "schemaName": "ContextScope",
            "className": "iModel",
            "properties": {
                "Name": "Test",
                "Description": "Test IModel created from swagger",
                "Initialized": true,
                "Type": 0,
                // "Extent": [
                //     0,
                //     0,
                //     0,
                //     0
                // ],
                "Secured": true,
                "Shared": false
            }
        }
    }


    createIModel = (accessToken: any, iModelName: string, url: string): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            try {
                let requestBody: OpenTowerIModelCreateDto = JSON.parse(JSON.stringify(this.defaultIModelCreateRequestBody));
                requestBody.instance.properties.Name = iModelName;

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }

                axios.post(url, JSON.parse(JSON.stringify(requestBody)), requestConfig)
                    .then((res: AxiosResponse) => {
                        let iModelGuid = "";
                        if(res.data.changedInstance) {
                            iModelGuid = res.data.changedInstance.instanceAfterChange.instanceId;
                        }
                        resolve(iModelGuid);
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


            } catch (e) {
                reject((e as any).message);

            }



        })



    }


    acquireIModelLock = (accessToken: any, url: string): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            try {
                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }
                axios.post(url, {}, requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve("IModel Lock Acquired");
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
            } catch (e) {
                reject((e as any).message);

            }
        })



    }

    releaseIModelLock = (accessToken: any, url: string): Promise<any> => {
        // instanceId is always iModelLock
        return new Promise((resolve: any, reject: any) => {
            try {
                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }
                axios.delete(url, requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve("IModel Lock Deleted");
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
            } catch (e) {
                reject((e as any).message);

            }
        })



    }

    getIModelSeedFileInstance = (accessToken: string, url: string): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            try {

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }

                axios.post(url, {}, requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve(res.data);
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


            } catch (e) {
                reject((e as any).message);

            }
        })
    }

    getIModelSeedFileInfo = (accessToken: string, url: string): Promise<any> => {
        // console.log("inside getIModelSeedFileInfo");
        // console.log("accessToken: ", accessToken);
        // console.log("url: ", url)
        return new Promise((resolve: any, reject: any) => {
            try {

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
                        if(error.code) {
                            errorMsg += `${error.code}: `;
                        }
                        if(error.message) {
                            errorMsg += error.message
                        }

                        reject(errorMsg);

                    })


            } catch (e) {
                reject((e as any).message);

            }
        })
    }

    updateIModelSeedFileInstance = (accessToken: string, url: string, requestBody: any): Promise<any> => {
        return new Promise((resolve: any, reject: any) => {
            try {

                const requestConfig: AxiosRequestConfig = {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": accessToken
                    }
                }

                axios.post(url,  JSON.parse(JSON.stringify(requestBody)), requestConfig)
                    .then((res: AxiosResponse) => {
                        resolve(res.data);
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


            } catch (e) {
                reject((e as any).message);

            }
        })
    }

}