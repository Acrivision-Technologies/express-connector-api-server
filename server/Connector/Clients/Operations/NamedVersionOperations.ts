
import { OperationsBase } from "@itwin/imodels-client-management/lib/base/internal";
import { IModelOperations as ManagementIModelOperations } from "@itwin/imodels-client-management/lib/operations";
import { OpenTowerClient, OpenTowerOperationOptions } from "../OpenTowerClient";

export class NamedVersionOperations<TOptions extends OpenTowerOperationOptions> extends ManagementIModelOperations<TOptions> {
    constructor(options: TOptions, _iModelsClient: OpenTowerClient) {
        super(options, _iModelsClient);
    }

    override async getSingle(params: any) {
        const response: any = await this.sendGetRequest({
            authorization: params.authorization,
            url: this._options.urlFormatter.getSingleNamedVersionUrl({ iModelId: params.iModelId, namedVersionId: params.namedVersionId })
        });
        const result = this.appendRelatedEntityCallbacks(params.authorization, response.namedVersion);
        return result;
    }

    getCreateNamedVersionRequestBody(namedVersionProperties: any) {
        return {
            "instance": {
              "schemaName": "iModelScope",
              "className": "Version",
              "properties": {
                "Name": namedVersionProperties.name,
                "Description": namedVersionProperties.description,
                "ChangeSetId": namedVersionProperties.changesetId,
                "Hidden": false
              }
            }
          }
    }

    async create(params: any): Promise<any>{
        return new Promise(async(resolve: any, reject: any) => {
            try {
                const createNamedVersionBody = this.getCreateNamedVersionRequestBody(params.namedVersionProperties);
                const createNamedVersionResponse: any = await this.sendPostRequest({
                    authorization: params.authorization,
                    url: this._options.urlFormatter.getSingleNamedVersionUrl({ iModelId: params.iModelId }),
                    body: createNamedVersionBody
                });
                resolve('Named Version Created');

            } catch(e) {
                console.log(`NamedVersionOperations error case`);
                console.log(e);
                reject(e);
            }
        })


    }
}