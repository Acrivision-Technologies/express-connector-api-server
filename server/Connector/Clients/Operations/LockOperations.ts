import { IModelOperations as ManagementIModelOperations } from "@itwin/imodels-client-management/lib/operations";
import { OperationsBase, EntityListIteratorImpl } from "@itwin/imodels-client-management/lib/base/internal";
import { Lock } from "@itwin/imodels-client-authoring/lib/base/types";
import { EntityListIterator, toArray } from "@itwin/imodels-client-management";
import { OpenTowerOperationOptions } from "../OpenTowerClient";

import { iModelLocksApiService } from "../../OpenTowerApis/iModelLocksApiService";


export class LockOperations<TOptions extends OpenTowerOperationOptions> extends OperationsBase<TOptions> {

    // EntityListIterator<Lock>
    async getList(params: any) {
        return new EntityListIteratorImpl(async () => this.getEntityCollectionPage({
            authorization: params.authorization,
            url: this._options.urlFormatter.getLockListUrl({ iModelId: params.iModelId, urlParams: params.urlParams }),
            entityCollectionAccessor: (data: any) => {
                return data;
            }
        }));
    }
    /**
     * Updates Lock for a specific Briefcase. This operation is used to acquire new locks and change the lock level for
     * already existing ones. Wraps the {@link https://developer.bentley.com/apis/imodels/operations/update-imodel-locks/
     * Update iModel Locks} operation from iModels API.
     * @param {UpdateLockParams} params parameters for this operation. See {@link UpdateLockParams}.
     * @returns {Promise<Lock>} updated Lock. See {@link Lock}.
     */
    async update(params: any): Promise<any> {
        try {
            const tokenResponse: any = await params.authorization();
            const accessToken: string = tokenResponse.scheme + " " + tokenResponse.token;

            return await new iModelLocksApiService().acquireLock(params.iModelId, accessToken, params.briefcaseId, params.lockedObjects[0].objectIds[0])
                .then((lockId: any) => {
                    return lockId;
                })
                .catch((error: any) => {
                    throw new Error(error);
                })
        } catch(e) {
            throw new Error((e as any).message);
        }
    }
    getUpdateLockBody(params: any) {
        return {
            "instance": {
              "schemaName": "iModelScope",
              "className": "Lock",
              "properties": {
                "ObjectId": params.lockedObjects[0].objectIds[0],
                "LockType": 1,
                "LockLevel": 2,
                "BriefcaseId": params.briefcaseId*1
              }
            }
          }
    }
}