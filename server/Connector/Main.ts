import * as path from "path";
import { Config } from "./Config";
import { AllArgsProps } from "./ConnectorArgs";
import { ConnectorRunner } from "./ConnectorRunner";


export const mainExecution = async (fileName: string, iModelName: string, access_token: string, iTwinId: string): Promise<any> => {
  return new Promise((resolve: any, reject: any) => {
    try {
      const towerConnectorExecutionFile = path.join(__dirname, "TowerConnector");

      // // main executoin
      let connectorArgs: AllArgsProps = JSON.parse(JSON.stringify({...Config.connectorArgs}));
      if(connectorArgs.hubArgs) {
        connectorArgs.hubArgs.projectGuid = iTwinId;
      }
    
      const runner = ConnectorRunner.fromJSON(connectorArgs, access_token, 'new');

      runner.run(towerConnectorExecutionFile, fileName, iModelName)
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