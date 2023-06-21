import { ConnectorBriefcaseDb } from "../ConnectorBriefcaseDb";
import { iModelLocksApiService } from "../OpenTowerApis/iModelLocksApiService";


export class OpenTowerIModelLockService {

    releaseAllLocks = async (db: ConnectorBriefcaseDb): Promise<any> => {
        try {

            const iModelLocks = await new iModelLocksApiService().getIModelLoks(db.iModelId, db.accessToken);
            if (iModelLocks.instances) {
                let promiseAllArray: any[] = [];
                await iModelLocks.instances.map(async (lockinstance: any) => {
                    const requestBody = {
                        "instance": {
                            "instanceId": lockinstance.instanceId,
                            "schemaName": "iModelScope",
                            "className": "Lock",
                            "properties": {
                                "ObjectId": lockinstance.properties["ObjectId"],
                                "LockType": lockinstance.properties["LockType"],
                                "LockLevel": 0,
                                "BriefcaseId": 2,
                                "ReleasedWithChangeSet": db.changeset.id,
                                "ReleasedWithChangeSetIndex": db.changeset.index
                            },
                        }
                    }

                    promiseAllArray.push(new iModelLocksApiService().deleteLock(db.iModelId, db.accessToken, lockinstance.instanceId, requestBody));
                });


                return await Promise.all(promiseAllArray)
                    .then((res: any) => {
                        return "Success";
                    })
                    .catch((e: any) => {
                        return "Failed";
                    })
            } else {
                return "Success";
            }

        } catch (e) {
            throw new Error((e as any).message);
        }

    }

}