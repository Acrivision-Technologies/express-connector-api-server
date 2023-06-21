
import { Logger, assert, AccessToken } from "@itwin/core-bentley";
import { LoggerCategories } from "@itwin/connector-framework";
import ConnectorBriefcaseManager from "../ConnectorBriefcaseManager";
import { AcquireNewBriefcaseIdArg, RequestNewBriefcaseArg } from "@itwin/core-backend";
import { ConnectorBriefcaseDb } from "../ConnectorBriefcaseDb";

export const loadBriefcaseDb = async (hubArgs: any, accessToken: AccessToken): Promise<any> => {

    try {
        Logger.logInfo(LoggerCategories.Framework, `********************** Inside BriefCase Method`);

        let newbriefcaseId: any = "";
        const reqArg: RequestNewBriefcaseArg = { iTwinId: hubArgs.projectGuid, iModelId: hubArgs.iModelGuid, accessToken: accessToken };

        if (hubArgs.briefcaseId)
            reqArg.briefcaseId = hubArgs.briefcaseId;
        const props: AcquireNewBriefcaseIdArg = {
            iModelId: reqArg.iModelId,
            accessToken: reqArg.accessToken

        }
        newbriefcaseId = await ConnectorBriefcaseManager.acquireNewBriefcaseId(props);
        return newbriefcaseId;
    } catch (e) {
        throw new Error((e as any).message)
    }



    // return await ConnectorBriefcaseDb.open(openProps);
}