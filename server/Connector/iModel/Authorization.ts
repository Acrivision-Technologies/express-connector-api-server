
import { NodeCliAuthorizationClient } from "@itwin/node-cli-authorization";
import { Logger } from "@itwin/core-bentley";
import { LoggerCategories } from "@itwin/connector-framework";

export const getTokenInteractive = async (clientConfig: any) => {
    const client = new NodeCliAuthorizationClient(clientConfig!);
    Logger.logInfo(LoggerCategories.Framework, "token signin");
    await client.signIn();
    return client.getAccessToken();

}