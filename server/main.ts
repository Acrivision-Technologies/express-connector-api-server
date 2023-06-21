import express from 'express';
import dotenv from 'dotenv';
import { IModelHost, IModelHostConfiguration } from "@itwin/core-backend";
import { OpenTowerClient, IModelsClientOptions } from "./Connector/Clients/OpenTowerClient";
import { OpenTowerBackendIModelsAccess } from "./Connector/OpenTowerBackendIModelsAccess";
import * as path from "path";
import cors from 'cors';
var indexRouter = require("./routers/index");
var iModelRouter = require("./routers/iModel");


dotenv.config();

// console.log(`process.env.IMODElHUB_BASE_URL: ${process.env.IMODElHUB_BASE_URL}`)
// console.log(`process.env.IMODElHUB_BASE_URL_API_VERSION: ${process.env.IMODElHUB_BASE_URL_API_VERSION}`)

// IModelHost Configuration
const config = new IModelHostConfiguration();
const options: IModelsClientOptions = {
    api: {
        baseUrl: process.env.IMODElHUB_BASE_URL,
        version: process.env.IMODElHUB_BASE_URL_API_VERSION
    }
}
const openTowerClient: OpenTowerClient = new OpenTowerClient(options);
config.hubAccess = new OpenTowerBackendIModelsAccess(openTowerClient);
config.cacheDir = path.join(__dirname, "iModelHostCache");
IModelHost.startup(config);


// Express configuration
const app = express();
const port = process.env.PORT;

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/imodel', iModelRouter);
app.use('/', indexRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});