import { IModelInsertElementService } from '../Services/IModelInsertElementService';
import { mainExecution } from '../Connector/Main';
import { getLogger } from '../utils/loggers';
import dotenv from 'dotenv';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as fs from "fs";
const logger = getLogger('CONNECTOR_CONTROLLER');

dotenv.config();

export interface CreateIModelRequestParam {
    iModelName: string;
    accessToken: string;
    iTwinId: string;
    filename?: string;
    accessUrl?: string;
}

export class ConnectorController {

    private static downloadXml(accessUrl: any): Promise<any> {
        return new Promise((resolve: any, reject: any) => {
            if (accessUrl) {
                // let url = "https://projectsharedeveussa01.blob.core.windows.net/azuresqldbecpluginstorage/ProjectShare/File/0721bc08-99bb-4fa4-b329-f87ab357163c?sv=2019-07-07&sr=b&sig=Wls8UdWW8GbYPzNax4zpoy2NshkgA%2BVCSaqZN8bUA6E%3D&se=2023-06-20T12%3A17%3A07Z&sp=rw&rscd=attachment%3B%20filename%3D%22812356Otxml.otxml%22";

                let config: AxiosRequestConfig = {
                    headers: {
                        "Content-Type": "text/xml",
                        "Accept": "text/xml"
                    }
                }

                axios.get(accessUrl, config)
                    .then((res: any) => {
                        console.log('res');
                        let contentdisposition: any = res.headers['content-disposition'];
                        // console.log(`contentdisposition: ${contentdisposition}`); 
                        const splitArray: any = contentdisposition.split(";");
                        const filenameText = (splitArray[splitArray.length - 1]).replace(/"/g, '').replace(/'/g, '');
                        // console.log(`filenameText: ${filenameText}`);
                        const filenameValueArray = filenameText.split("=");
                        // console.log(`filenameValueArray: ${filenameValueArray}`);
                        const filename = filenameValueArray[filenameValueArray.length - 1];
                        // console.log(`filename: ${filename}`);

                        let filePath = __dirname + "/../" + process.env.sampleFileParentPath + "/" + filename;
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                        fs.writeFile(filePath, res.data, { flag: 'wx' }, function (err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(filename);
                            }
                        });
                    })
                    .catch((error: AxiosError) => {
                        console.log('downloadXml error');
                        console.log(JSON.stringify(error));
                        reject(error.message);
                    })
            } else {
                resolve(null);
            }

        })

    }



    public static processIModelCreationRequest(requestBody: CreateIModelRequestParam): Promise<any> {

        return new Promise(async (resolve: any, reject: any) => {
            try {
                console.log('requestBody')
                console.log(requestBody)
                this.downloadXml(requestBody.accessUrl)
                    .then(async (filename: any) => {
                        await mainExecution(filename ? filename : requestBody.filename, requestBody.iModelName, requestBody.accessToken, requestBody.iTwinId)
                            .then((iModelGuid: any) => {
                                resolve(iModelGuid)
                            })
                            .catch((error: any) => {
                                reject(error)
                            })
                    })
                    .catch((error: any) => {
                        reject(error);
                    })

            } catch (e) {
                reject(e)
            }
        })
    }

    public static processIModelInsertElementsRequest(requestBody: any): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {
            try {
                new IModelInsertElementService().insertIModeElements(requestBody)
                    .then((result: any) => {
                        resolve("Done")
                    })
                    .catch((error: any) => {
                        // console.log('error');
                        // console.log(error);
                        reject(error);
                    })

            } catch (e) {
                reject(e)
            }
        })
    }

    public static processIModelUpdateElementsRequest(requestBody: any): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {
            try {
                new IModelInsertElementService().updateIModeElements(requestBody)
                    .then((result: any) => {
                        resolve("Done")
                    })
                    .catch((error: any) => {
                        // console.log('error');
                        // console.log(error);
                        reject(error);
                    })

            } catch (e) {
                reject(e)
            }
        })
    }
    public static processIModelDeleteElementsRequest(requestBody: any): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {
            try {
                new IModelInsertElementService().deleteIModeElements(requestBody)
                    .then((result: any) => {
                        resolve("Done")
                    })
                    .catch((error: any) => {
                        // console.log('error');
                        // console.log(error);
                        reject(error);
                    })

            } catch (e) {
                reject(e)
            }
        })
    }

}

