import { IModelBriefcaseApiService } from "../Connector/OpenTowerApis/IModelBriefcaseApiService";
import { ConnectorBriefcaseDb } from "../Connector/ConnectorBriefcaseDb";
import { OpenTowerBreifcaseService } from "../Connector/Service/OpenTowerBreifcaseService";
import { RequestNewBriefcaseArg, Subject } from "@itwin/core-backend";
import { IModel } from "@itwin/core-common";
import { assert, Logger, LogLevel, BentleyError, IModelHubStatus } from "@itwin/core-bentley";
import { AccessToken, Id64Arg, Id64String } from "@itwin/core-bentley";
import * as path from "path";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as fs from "fs";
import dotenv from 'dotenv';
import { KnownLocations } from "../Connector/KnownLocations";
import { importSourceData } from "../Connector/iModel/Services/SourceDataService";
import { AllArgsProps } from "../Connector/ConnectorArgs";
import { Config } from "../Connector/Config";
import { ConnectorRunner } from "../Connector/ConnectorRunner";
dotenv.config();


enum BeforeRetry { Nothing = 0, PullMergePush = 1 }

export class IModelInsertElementService {
  constructor() {
    Logger.initializeToConsole();
    Logger.setLevelDefault(LogLevel.Info);
  }

  private downloadXml(accessUrl: any): Promise<any> {
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

  public createIMode(requestBody: any): Promise<any> {
    return new Promise((resolve: any, reject: any) => {

      try {

        this.downloadXml(requestBody.accessUrl)
          .then(async (filename: any) => {


            const towerConnectorExecutionFile = path.join(__dirname, "TowerConnector");

            // // main executoin
            let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({...Config.connectorArgs}));
            if(connectorArgs.hubArgs) {
              connectorArgs.hubArgs.projectGuid = requestBody.iTwinId;
            }
          
            const runner = ConnectorRunner.fromJSON(connectorArgs, requestBody.accessToken, 'new');
      
            runner.run(towerConnectorExecutionFile, filename ? filename : requestBody.filename, requestBody.iModelName)
              .then((iModelGuid: string) => {
                // let file = filename ? filename : requestBody.filename
                // let filePath = __dirname + "/../" + process.env.sampleFileParentPath + "/" + file;
                // if (fs.existsSync(filePath)) {
                //   fs.unlinkSync(filePath);
                // }
                resolve(iModelGuid);
              })
              .catch((error: any) => {
                // let file = filename ? filename : requestBody.filename
                // let filePath = __dirname + "/../" + process.env.sampleFileParentPath + "/" + file;
                // if (fs.existsSync(filePath)) {
                //   fs.unlinkSync(filePath);
                // }
                reject(error);
              })
          })
          .catch((error: any) => {
            reject(error);
          })
      } catch (e) {
        reject((e as any).message);
      }

    })
  }


  public insertIModeElements(data: any): Promise<any> {
    return new Promise((resolve: any, reject: any) => {

      const reqArg: RequestNewBriefcaseArg = { iTwinId: data.iTwinId, iModelId: data.iModelId, accessToken: data.accessToken };
      try {
        const towerConnectorExecutionFile = path.join(__dirname, "../Connector/TowerConnector");
        // // main executoin
        let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({ ...Config.connectorArgs }));
        if (connectorArgs.hubArgs) {
          connectorArgs.hubArgs.projectGuid = data.iTwinId;
          connectorArgs.hubArgs.iModelGuid = data.iModelId;
        }

        const runner = ConnectorRunner.fromJSON(connectorArgs, data.accessToken, "insert");

        runner.insertElements(towerConnectorExecutionFile, data.filename!)
          .then((iModelGuid: string) => {
            resolve(iModelGuid);
          })
          .catch((error: any) => {
            reject(error);
          })
      } catch (e) {
        reject((e as any).message);
      }

    })
  }

  public updateIModeElements(data: any): Promise<any> {
    return new Promise((resolve: any, reject: any) => {

      const reqArg: RequestNewBriefcaseArg = { iTwinId: data.iTwinId, iModelId: data.iModelId, accessToken: data.accessToken };
      try {
        const towerConnectorExecutionFile = path.join(__dirname, "../Connector/TowerConnector");
        // // main executoin
        let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({ ...Config.connectorArgs }));
        if (connectorArgs.hubArgs) {
          connectorArgs.hubArgs.projectGuid = data.iTwinId;
          connectorArgs.hubArgs.iModelGuid = data.iModelId;
        }

        const runner = ConnectorRunner.fromJSON(connectorArgs, data.accessToken, "update");

        runner.runUpdateElements(towerConnectorExecutionFile, data.filename!)
          .then((iModelGuid: string) => {
            resolve(iModelGuid);
          })
          .catch((error: any) => {
            reject(error);
          })
      } catch (e) {
        reject((e as any).message);
      }

    })
  }

  public deleteIModeElements(data: any): Promise<any> {
    return new Promise((resolve: any, reject: any) => {

      const reqArg: RequestNewBriefcaseArg = { iTwinId: data.iTwinId, iModelId: data.iModelId, accessToken: data.accessToken };
      try {
        const towerConnectorExecutionFile = path.join(__dirname, "../Connector/TowerConnector");
        // // main executoin
        let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({ ...Config.connectorArgs }));
        if (connectorArgs.hubArgs) {
          connectorArgs.hubArgs.projectGuid = data.iTwinId;
          connectorArgs.hubArgs.iModelGuid = data.iModelId;
        }

        const runner = ConnectorRunner.fromJSON(connectorArgs, data.accessToken, "delete");

        runner.runDeleteElements(towerConnectorExecutionFile, data.filename!)
          .then((iModelGuid: string) => {
            resolve(iModelGuid);
          })
          .catch((error: any) => {
            reject(error);
          })
      } catch (e) {
        reject((e as any).message);
      }

    })
  }
}
