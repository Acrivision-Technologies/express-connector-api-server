import { IModelBriefcaseApiService } from "../Connector/OpenTowerApis/IModelBriefcaseApiService";
import { ConnectorBriefcaseDb } from "../Connector/ConnectorBriefcaseDb";
import { OpenTowerBreifcaseService } from "../Connector/Service/OpenTowerBreifcaseService";
import { RequestNewBriefcaseArg, Subject } from "@itwin/core-backend";
import { IModel } from "@itwin/core-common";
import { assert, Logger, LogLevel, BentleyError, IModelHubStatus } from "@itwin/core-bentley";
import { AccessToken, Id64Arg, Id64String } from "@itwin/core-bentley";
import * as path from "path";

import dotenv from 'dotenv';
import { KnownLocations } from "../Connector/KnownLocations";
import { importSourceData } from "../Connector/iModel/Services/SourceDataService";
import { AllArgsProps } from "../Connector/ConnectorArgs";
import { Config } from "../Connector/Config";
import { ConnectorRunner } from "../Connector/ConnectorRunner";
dotenv.config();


enum BeforeRetry { Nothing = 0, PullMergePush = 1 }

export class IModelInsertElementService {
    constructor(data: any) {
        Logger.initializeToConsole();
        Logger.setLevelDefault(LogLevel.Info);
    }


    public insertIModeElements(data: any): Promise<any> {
        return new Promise((resolve: any, reject: any) => {

            const reqArg: RequestNewBriefcaseArg = { iTwinId: data.iTwinId, iModelId: data.iModelId, accessToken: data.accessToken };
            try {
                const towerConnectorExecutionFile = path.join(__dirname, "../Connector/TowerConnector");
                // // main executoin
                let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({...Config.connectorArgs}));
                if(connectorArgs.hubArgs) {
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
              } catch(e) {
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
                let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({...Config.connectorArgs}));
                if(connectorArgs.hubArgs) {
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
              } catch(e) {
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
                let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({...Config.connectorArgs}));
                if(connectorArgs.hubArgs) {
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
              } catch(e) {
                reject((e as any).message);
              }

        })
    }
}
