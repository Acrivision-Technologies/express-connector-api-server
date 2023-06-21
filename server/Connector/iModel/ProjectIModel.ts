import { CreateNewIModelProps, IModelHost } from "@itwin/core-backend";
import { GuidString } from "@itwin/core-bentley";
import { Config } from "../Config";



  export const createNewConnectorIModel = async(iTwinId: string | undefined, accessToken: any, iModelName: string, getEcefLocationProps: any): Promise<GuidString> => {
    const newIModelArgs: any = {
        iModelName: iModelName,
        description: `Dummy description for ${iModelName}`,
        accessToken: accessToken,
        iTwinId: iTwinId ? iTwinId : '',
        getEcefLocationProps: getEcefLocationProps
    }
    return IModelHost.hubAccess.createNewIModel(newIModelArgs);

}