import * as fs from "fs";
import * as path from "path";

import { YawPitchRollAngles } from "@itwin/core-geometry";
import type { SubjectProps, EcefLocationProps } from "@itwin/core-common";
import { IModel, EcefLocation, Cartographic } from "@itwin/core-common";
import { AccessToken, Id64Arg, Id64String } from "@itwin/core-bentley";
import { BentleyError, IModelHubStatus } from "@itwin/core-bentley";
import { assert, Logger, LogLevel } from "@itwin/core-bentley";
import { BisCoreSchema, IModelHost, RequestNewBriefcaseArg } from "@itwin/core-backend";
import { LinkElement, Subject, SubjectOwnsSubjects, SynchronizationConfigLink } from "@itwin/core-backend";
import { BaseConnector, LoggerCategories, Synchronizer } from "@itwin/connector-framework";
import { ConnectorIssueReporter } from "@itwin/connector-framework/lib/src/ConnectorIssueReporter";

import { AllArgsProps, HubArgs, JobArgs } from "./ConnectorArgs";
import { createNewConnectorIModel } from "./iModel/ProjectIModel";
import { KnownLocations } from "./KnownLocations";
import { CreateNamedVersionParams, IModelsClient, IModelsClientOptions, NamedVersionPropertiesForCreate } from "@itwin/imodels-client-authoring";
import { AccessTokenAdapter } from "@itwin/imodels-access-backend";
import { OpenTowerBreifcaseService } from "../Connector/Service/OpenTowerBreifcaseService";
import { ConnectorBriefcaseDb } from "./ConnectorBriefcaseDb";
import { OpenTowerClient } from "./Clients/OpenTowerClient";

import dotenv from 'dotenv';
import TowerConnector from "./TowerConnector";
import { importSourceData } from "./iModel/Services/SourceDataService";
dotenv.config();


enum BeforeRetry { Nothing = 0, PullMergePush = 1 }

export class ConnectorRunner {

    private _jobArgs: JobArgs;
    private _hubArgs?: HubArgs;

    private _db?: ConnectorBriefcaseDb;
    private _connector?: TowerConnector;
    private _issueReporter?: ConnectorIssueReporter;
    private _reqContext?: AccessToken;
    private actionType: string = "new";

    /**
   * @throws Error when jobArgs or/and hubArgs are malformated or contain invalid arguments
   */
    constructor(jobArgs: JobArgs, clientAccessToken: string, actionType: string, hubArgs?: HubArgs) {
        this.actionType = actionType
        if (!jobArgs.isValid)
            throw new Error("Invalid jobArgs");
        this._jobArgs = jobArgs;

        if (hubArgs) {
            if (!hubArgs.isValid)
                throw new Error("Invalid hubArgs");
            this._hubArgs = hubArgs;
        }

        this._reqContext = clientAccessToken

        Logger.initializeToConsole();
        const { loggerConfigJSONFile } = jobArgs;
        if (loggerConfigJSONFile && path.extname(loggerConfigJSONFile) === ".json" && fs.existsSync(loggerConfigJSONFile))
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            Logger.configureLevels(require(loggerConfigJSONFile));
        else
            Logger.setLevelDefault(LogLevel.Info);
    }

    public get jobArgs(): JobArgs {
        return this._jobArgs;
    }

    public get hubArgs(): HubArgs {
        if (!this._hubArgs)
            throw new Error(`DummyConnectorRunner.hubArgs is not defined for current iModel with type = ${this.jobArgs.dbType}.`);
        return this._hubArgs;
    }

    public set issueReporter(reporter: ConnectorIssueReporter) {
        this._issueReporter = reporter;
    }

    public get jobSubjectName(): string {
        let name = this.jobArgs.jobSubjectName;

        const connectorArgs = this.jobArgs.connectorArgs;
        if (connectorArgs && connectorArgs.pcf && connectorArgs.pcf.subjectNode)
            name = connectorArgs.pcf.subjectNode;

        return name;
    }

    public get db(): ConnectorBriefcaseDb {
        if (!this._db)
            throw new Error("ConnectorBriefcaseDb has not been loaded.");
        return this._db;
    }

    public get connector(): TowerConnector {
        if (!this._connector)
            throw new Error("Connector has not been loaded.");
        return this._connector;
    }

    /**
    * Generates a ConnectorRunner instance from json body
    * @param json
    * @returns ConnectorRunner
    * @throws Error when content does not include "jobArgs" as key
    */
    public static fromJSON(json: AllArgsProps, clientAccessToken: string, actionType: string): ConnectorRunner {
        const supportedVersion = "0.0.1";
        if (!json.version || json.version !== supportedVersion)
            throw new Error(`Arg file has invalid version ${json.version}. Supported version is ${supportedVersion}.`);

        // __PUBLISH_EXTRACT_START__ ConnectorRunner-constructor.example-code
        if (!(json.jobArgs))
            throw new Error("jobArgs is not defined");
        const jobArgs = new JobArgs(json.jobArgs);

        let hubArgs: HubArgs | undefined;
        if (json.hubArgs)
            hubArgs = new HubArgs(json.hubArgs);
        const runner = new ConnectorRunner(jobArgs, clientAccessToken, actionType, hubArgs);
        // __PUBLISH_EXTRACT_END__

        return runner;
    }

    /**
   * Safely executes a connector job
   * This method does not throw any errors
   * @returns BentleyStatus
   */
    public async run(connector: string, inputfileName: string, iModelName: string): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {
            console.log("inside run");

            try {
                this.runUnsafe(connector, inputfileName, iModelName)
                    .then(async (iModelGuid: string) => {
                        await this.onFinish();
                        resolve(iModelGuid);

                    })
                    .catch(async (error: any) => {
                        const msg = error;
                        this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Run", LoggerCategories.Framework);
                        await this.onFailure(error);
                        await this.onFinish();
                        reject(error);

                    })

            } catch (err) {
                const msg = (err as any).message;
                Logger.logError(LoggerCategories.Framework, msg);
                Logger.logError(LoggerCategories.Framework, `Failed to execute connector module - ${connector}`);
                this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Run", LoggerCategories.Framework);
                await this.onFailure(err);
                await this.onFinish();
                reject(msg);
            }
        })
    }

    private async onFinish() {
        console.log("onFinish success");
        if (this._db) {
            this._db.abandonChanges();

            this.connector?.onClosingIModel?.();

            this._db.close();

            console.log("inside onFinish")

            // Release Briefcase and delete local file
            await new OpenTowerBreifcaseService().releaseBriefcaseAndDeleteLocalFiles(this.hubArgs.iModelGuid, this.db.briefcaseId + '', this._reqContext!)
    
            console.log("Briefcase released")
        }

        // if (this._connector && this.connector.issueReporter)
            // await this.connector.issueReporter.publishReport();
    }

    private async onFailure(err: any) {
        console.log("onFailure error");
        console.log(err);
        try {
            if (this._db && this._db.isBriefcaseDb()) {
                this._db.abandonChanges();
            }
        } catch (err1) {
            // don't allow a further exception to prevent onFailure from reporting and returning. We need to finish the abend sequence.
            // eslint-disable-next-line no-console
            console.error(err1);
        } finally {
            try {
                this.recordError(err);
            } catch (err2) {
                // eslint-disable-next-line no-console
                console.error(err2);
            }
        }
    }

    public recordError(err: any) {
        const errorFile = this.jobArgs.errorFile;
        const errorStr = JSON.stringify({
            id: this._connector?.getConnectorName() ?? "",
            message: "Failure",
            description: err.message,
            extendedData: err,
        });
        fs.writeFileSync(errorFile, errorStr);
    }

    private async runUnsafe(connector: string, inputfileName: string, iModelName: string): Promise<any> {

        return new Promise(async (resolve: any, reject: any) => {
            console.log("inside runUnsafe")
            try {
                let iModelGuid: string = "";

                let getEcefLocationProps = this.getEcefLocationProps(path.join(KnownLocations.assetsDir, "sampleFiles", inputfileName))


                this._connector = await require(connector).default.createConnector("new");
                console.log("_connector");
                console.log(this._connector);
                console.log("Creating iModel")
                console.log('getEcefLocationProps');
                console.log(getEcefLocationProps);
                iModelGuid = await createNewConnectorIModel(this._hubArgs?.projectGuid, this._reqContext, iModelName, getEcefLocationProps);
                this.hubArgs.iModelGuid = iModelGuid;

                const reqArg: RequestNewBriefcaseArg = { iTwinId: this.hubArgs.projectGuid, iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext };
                new OpenTowerBreifcaseService().loadBriefcaseDb(reqArg)
                    .then(async (briefcaseDb: ConnectorBriefcaseDb) => {
                        this._db = briefcaseDb;

                        console.log('briefcaseDb');
                        console.log(briefcaseDb);


                        
                        
                        Logger.logInfo(LoggerCategories.Framework, "Loading synchronizer...");
                        const synchronizer = new Synchronizer(this.db, false, this._reqContext);
                        this.connector.synchronizer = synchronizer;

                        // Register BisCoreSchema
                        BisCoreSchema.registerSchema();


                        Logger.logInfo(LoggerCategories.Framework, "Writing configuration and opening source data...");
                        const synchConfig = await this.doInRepositoryChannel(
                            async () => {
                                const config = this.insertSynchronizationConfigLink();
                                this.connector.connectorArgs = this.jobArgs.connectorArgs;
                                await this.connector.openSourceData(path.join(KnownLocations.assetsDir, "sampleFiles", inputfileName));
                                const imodelStatus = await this.connector.onOpenIModel();
                                return "config done";
                            },
                            "Write configuration and open source data."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Importing domain schema...");
                        await this.doInRepositoryChannel(
                            async () => {
                                return this.connector.importDomainSchema(this._reqContext!);
                            },
                            "Write domain schema."
                        );


                        Logger.logInfo(LoggerCategories.Framework, "Writing job subject and definitions...");
                        const jobSubject = await this.doInRepositoryChannel(
                            async () => {
                                const job = await this.updateJobSubject();
                                await this.connector.initializeJob();
                                await this.connector.importDefinitions();
                                return job;
                            },
                            "Write job subject and definitions."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Synchronizing...");
                        await this.doInConnectorChannel(jobSubject.id,
                            async () => {
                                await this.connector.updateExistingData();
                                // this.updateDeletedElements();
                            },
                            "Synchronize."
                        );


                        Logger.logInfo(LoggerCategories.Framework, "Writing job finish time and extent...");
                        await this.doInRepositoryChannel(
                            async () => {
                                this.updateProjectExtent();
                                this.connector.synchronizer.updateRepositoryLinks();
                            },
                            "Write synchronization finish time and extent."
                        );

                        // console.log('this.connector');
                        // console.log(JSON.stringify(this.connector));
                        // if(this.connector.ecefLocationProps) {
                        //     this.db.setEcefLocation(this.connector.ecefLocationProps)
                        // }
                        console.log(`this.db: ${JSON.stringify(this.db)}`);
                        console.log(`this.db.ecefLocation: ${JSON.stringify(this.db.ecefLocation)}`);
                        console.log(this.db);
                        console.log(`this._db: ${JSON.stringify(this._db)}`);
                        console.log(`this._db.ecefLocation: ${JSON.stringify(this._db.ecefLocation)}`);
                        console.log(this._db);
                        console.log(`this.connector.synchronizer.imodel: ${JSON.stringify(this.connector.synchronizer.imodel)}`);
                        console.log(`this.connector.synchronizer.imodel.ecefLocation: ${JSON.stringify(this.connector.synchronizer.imodel.ecefLocation)}`);
                        console.log(`this.connector.synchronizer.imodel.ecefLocation.earthCenter: ${JSON.stringify(this.connector.synchronizer.imodel.ecefLocation?.earthCenter)}`);
                        console.log(`this.connector.synchronizer.imodel.ecefLocation.isValid: ${JSON.stringify(this.connector.synchronizer.imodel.ecefLocation?.isValid)}`);
                        console.log(this.connector.synchronizer.imodel);

                        await this.createdNamedVersionForLatestChangeSet({ iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext, name: "Initial Named Version", description: "Try it" });

                        Logger.logInfo(LoggerCategories.Framework, "Connector job complete!");

                        resolve(this.hubArgs.iModelGuid);


                    })
                    .catch((error: any) => {
                        reject(error);
                    })
            } catch (e) {
                reject(e)
            }

        })


    }

    private async acquireLocks(arg: { shared?: Id64Arg, exclusive?: Id64Arg }): Promise<void> {
        const isStandalone = this.jobArgs.dbType === "standalone";
        if (isStandalone || !this.db.isBriefcaseDb())
            return;
        return this.doWithRetries(async () => this.db.locks.acquireLocks(arg), BeforeRetry.PullMergePush);
    }

    private async doWithRetries(task: () => Promise<void>, beforeRetry: BeforeRetry): Promise<void> {
        let count = 0;
        do {
            try {
                await task();
                return;
            } catch (err) {
                if (!this.shouldRetryAfterError(err))
                    throw err;
                if (++count > this.hubArgs.maxLockRetries)
                    throw err;
                const sleepms = Math.random() * this.hubArgs.maxLockRetryWaitSeconds * 1000;
                await new Promise((resolve) => setTimeout(resolve, sleepms));

                if (beforeRetry === BeforeRetry.PullMergePush) {
                    assert(this.db.isBriefcaseDb());
                }
            }
        } while (true);
    }
    private shouldRetryAfterError(err: unknown): boolean {
        if (!(err instanceof BentleyError))
            return false;
        return err.errorNumber === IModelHubStatus.LockOwnedByAnotherBriefcase;
    }

    private async doInRepositoryChannel<R>(task: () => Promise<R>, message: string): Promise<any> {
        try {
            await this.acquireLocks({ exclusive: IModel.rootSubjectId });
            const result = await task();
            await this.persistChanges(message);
            return result;
        } catch (e) {
            throw new Error((e as any).message);

        }
    }

    private async doInConnectorChannel<R>(jobSubject: Id64String, task: () => Promise<R>, message: string): Promise<R> {
        // console.log("inside doInConnectorChannel");
        // console.log(jobSubject)
        await this.acquireLocks({ exclusive: jobSubject });  // automatically acquires shared lock on root subject (the parent/model)
        const result = await task();
        await this.persistChanges(message);
        return result;
    }

    private async persistChanges(changeDesc: string) {
        const { revisionHeader } = this.jobArgs;
        const comment = `${revisionHeader} - ${changeDesc}`;
        console.log(`comment: ${comment}`);
        const isStandalone = this.jobArgs.dbType === "standalone";
        if (!isStandalone && this.db.isBriefcaseDb()) {
            this._db = this.db;
            await this.db.pullChanges({ accessToken: this._reqContext, iMoodelId: this._hubArgs?.iModelGuid });
            this.db.saveChanges(comment);
            // console.log("Db saved")
            // console.log('===== this.db');
            // console.log(JSON.stringify(this.db));
            // console.log("Current index: ", this.db.changeset.index);

            let changesetIndex = this.db.changeset.index;

            await this.db.pushChanges({ description: comment, accessToken: this._reqContext, changesetIndex: changesetIndex, iMoodelId: this._hubArgs?.iModelGuid });
            await this.db.locks.releaseAllLocks(); // in case there were no changes
        } else {
            this.db.saveChanges(comment);
        }
    }

    // Custom Methods
    private insertSynchronizationConfigLink() {
        let synchConfigData = {
            classFullName: SynchronizationConfigLink.classFullName,
            model: IModel.repositoryModelId,
            code: LinkElement.createCode(this.db, IModel.repositoryModelId, "SynchConfig"),
        };
        if (this.jobArgs.synchConfigFile) {
            synchConfigData = require(this.jobArgs.synchConfigFile);
        }
        const prevSynchConfigId = this.db.elements.queryElementIdByCode(
            LinkElement.createCode(this.db, IModel.repositoryModelId, "SynchConfig")
        );
        console.log(`prevSynchConfigId`);
        console.log(prevSynchConfigId)
        let idToReturn: any;
        if (prevSynchConfigId === undefined) {
            const queyrResult = this.db.elements.createElement(synchConfigData);
            idToReturn = queyrResult.id;
        } else {
            this.updateSynchronizationConfigLink(prevSynchConfigId);
            idToReturn = prevSynchConfigId;
        }
        return idToReturn;
    }

    private updateSynchronizationConfigLink(synchConfigId: string) {
        const synchConfigData = {
            id: synchConfigId,
            classFullName: SynchronizationConfigLink.classFullName,
            model: IModel.repositoryModelId,
            code: LinkElement.createCode(this.db, IModel.repositoryModelId, "SynchConfig"),
            lastSuccessfulRun: Date.now().toString(),
        };
        this.db.elements.updateElement(synchConfigData);
    }

    private async updateJobSubject(): Promise<Subject> {
        const code = Subject.createCode(this.db, IModel.rootSubjectId, this.jobSubjectName);
        const existingSubjectId = this.db.elements.queryElementIdByCode(code);
        let subject: Subject;

        if (existingSubjectId) {
            subject = this.db.elements.getElement<Subject>(existingSubjectId);
        } else {
            const jsonProperties: any = {
                Subject: {
                    Job: {
                        Properties: {
                            ConnectorVersion: this.connector.getApplicationVersion(),
                            ConnectorType: "JSConnector",
                        },
                        Connector: this.connector.getConnectorName(),
                    },
                },
            };

            const root = this.db.elements.getRootSubject();
            const subjectProps: SubjectProps = {
                classFullName: Subject.classFullName,
                model: root.model,
                code,
                jsonProperties,
                parent: new SubjectOwnsSubjects(root.id),
            };
            const newSubjectId = this.db.elements.insertElement(subjectProps);
            subject = this.db.elements.getElement<Subject>(newSubjectId);
        }

        this.connector.jobSubject = subject;
        this.connector.synchronizer.jobSubjectId = subject.id;
        return subject;
    }

    private updateProjectExtent() {
        const res = this.db.computeProjectExtents({
            reportExtentsWithOutliers: true,
            reportOutliers: true,
        });
        this.db.updateProjectExtents(res.extents);
    }

    private updateDeletedElements() {
        // console.log("inside updateDeletedElements")
        // console.log("shouldDeleteElements : ", this.connector.shouldDeleteElements())
        // if (this.connector.shouldDeleteElements())
        // this.connector.synchronizer.detectDeletedElements();
    }

    private createdNamedVersionForLatestChangeSet = async (params: any) => {
        console.log("inside createdNamedVersionForLatestChangeSet");
        const latestChangeSet = await IModelHost.hubAccess.getLatestChangeset(params);
        const options: IModelsClientOptions = {
            api: {
                baseUrl: process.env.IMODElHUB_BASE_URL,
                version: process.env.IMODElHUB_BASE_URL_API_VERSION
            }
        }

        const imodelClient = new OpenTowerClient(options);
        const namedVersionProperties: NamedVersionPropertiesForCreate = {
            name: params.name + latestChangeSet.id.substring(latestChangeSet.id.length - 4),
            description: params.description,
            changesetId: latestChangeSet.id,
        }

        const getAuthorizationCallback = () => {
            return async () => {
                return AccessTokenAdapter.toAuthorization(this._reqContext!);
            };
        }
        const namedVersionProps: CreateNamedVersionParams = {
            namedVersionProperties,
            iModelId: this.hubArgs.iModelGuid,
            authorization: getAuthorizationCallback()
        }
        try {
            const namedVersionResult = await imodelClient.namedVersions.create(namedVersionProps);
        } catch(e) {
            console.log(`Error while creating the namedversion`);
            console.log(e);
        }

    }

    public async insertElements(connector: string, inputfileName: string): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {

            try {
                this.runUnsafeInsert(connector, inputfileName)
                    .then(async (iModelGuid: string) => {
                        await this.onFinish();
                        resolve(iModelGuid);

                    })
                    .catch(async (error: any) => {
                        const msg = error;
                        this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Insert", LoggerCategories.Framework);
                        await this.onFailure(error);
                        await this.onFinish();
                        reject(error);

                    })

            } catch (err) {
                const msg = (err as any).message;
                Logger.logError(LoggerCategories.Framework, msg);
                Logger.logError(LoggerCategories.Framework, `Failed to execute connector module - ${connector}`);
                this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Insert", LoggerCategories.Framework);
                await this.onFailure(err);
                await this.onFinish();
                reject(msg);
            }
        })
    }

    public async runDeleteElements(connector: string, inputfileName: string): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {

            try {
                this.runUnsafeDelete(connector, inputfileName)
                    .then(async (iModelGuid: string) => {
                        await this.onFinish();
                        resolve(iModelGuid);

                    })
                    .catch(async (error: any) => {
                        const msg = error;
                        this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Delete", LoggerCategories.Framework);
                        await this.onFailure(error);
                        await this.onFinish();
                        reject(error);

                    })

            } catch (err) {
                const msg = (err as any).message;
                Logger.logError(LoggerCategories.Framework, msg);
                Logger.logError(LoggerCategories.Framework, `Failed to execute connector module - ${connector}`);
                this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Delete", LoggerCategories.Framework);
                await this.onFailure(err);
                await this.onFinish();
                reject(msg);
            }
        })
    }

    
    public async runUpdateElements(connector: string, inputfileName: string): Promise<any> {
        return new Promise(async (resolve: any, reject: any) => {

            try {
                this.runUnsafeUpdate(connector, inputfileName)
                    .then(async (iModelGuid: string) => {
                        await this.onFinish();
                        resolve(iModelGuid);

                    })
                    .catch(async (error: any) => {
                        const msg = error;
                        this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Update", LoggerCategories.Framework);
                        await this.onFailure(error);
                        await this.onFinish();
                        reject(error);

                    })

            } catch (err) {
                const msg = (err as any).message;
                Logger.logError(LoggerCategories.Framework, msg);
                Logger.logError(LoggerCategories.Framework, `Failed to execute connector module - ${connector}`);
                this.connector.reportError(this.jobArgs.stagingDir, msg, "ConnectorRunner", "Update", LoggerCategories.Framework);
                await this.onFailure(err);
                await this.onFinish();
                reject(msg);
            }
        })
    }

    private async runUnsafeInsert(connector: string, inputfileName: string): Promise<any> {

        console.log("inside runUnsafeInsert");

        return new Promise(async (resolve: any, reject: any) => {

            try {
                this._connector = await require(connector).default.createConnector("insert");

                const reqArg: RequestNewBriefcaseArg = { iTwinId: this.hubArgs.projectGuid, iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext };
                new OpenTowerBreifcaseService().loadBriefcaseDb(reqArg, "50542de011ca483a438ce33ded2f557f8e947592")
                    .then(async (briefcaseDb: ConnectorBriefcaseDb) => {
                        this._db = briefcaseDb;
                        console.log("Success call");

                        console.log('briefcaseDb');
                        console.log(briefcaseDb);
                        console.log(briefcaseDb.getEcefTransform());


                        // Logger.logInfo(LoggerCategories.Framework, "Loading synchronizer...");
                        // const synchronizer = new Synchronizer(this.db, false, this._reqContext);
                        // this.connector.synchronizer = synchronizer;

                        // // // Register BisCoreSchema
                        // // BisCoreSchema.registerSchema();


                        // Logger.logInfo(LoggerCategories.Framework, "Writing configuration and opening source data...");
                        // const synchConfig = await this.doInRepositoryChannel(
                        //     async () => {
                        //         const config = this.insertSynchronizationConfigLink();
                        //         this.connector.connectorArgs = this.jobArgs.connectorArgs;
                        //         await this.connector.openSourceData(path.join(KnownLocations.assetsDir, "sampleFiles", inputfileName));
                        //         const imodelStatus = await this.connector.onOpenIModel();
                        //         return "config done";
                        //     },
                        //     "Definitation Reading"
                        // );

                        // Logger.logInfo(LoggerCategories.Framework, "Importing domain schema...");
                        // await this.doInRepositoryChannel(
                        //     async () => {
                        //         return this.connector.importDomainSchema(this._reqContext!);
                        //     },
                        //     "Write domain schema."
                        // );

                        // Logger.logInfo(LoggerCategories.Framework, "Writing job subject and definitions...");
                        // const jobSubject = await this.doInRepositoryChannel(
                        //     async () => {
                        //         const job = await this.updateJobSubject();
                        //         await this.connector.initializeJob();
                        //         await this.connector.importDefinitions();
                        //         return job;
                        //     },
                        //     "Write job subject and definitions."
                        // );

                        // Logger.logInfo(LoggerCategories.Framework, "Synchronizing...");
                        // await this.doInConnectorChannel(jobSubject.id,
                        //     async () => {
                        //         await this.connector.updateExistingData();
                        //         // this.updateDeletedElements();
                        //     },
                        //     "Synchronize New Elements."
                        // );


                        // Logger.logInfo(LoggerCategories.Framework, "Writing job finish time and extent...");
                        // await this.doInRepositoryChannel(
                        //     async () => {
                        //         this.updateProjectExtent();
                        //         this.connector.synchronizer.updateRepositoryLinks();
                        //     },
                        //     "New Elements Inserted."
                        // );

                        // await this.createdNamedVersionForLatestChangeSet({ iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext, name: "New Elements Inserted",description:  "New Elements Inserted" });

                        // Logger.logInfo(LoggerCategories.Framework, "Connector job complete!");


                        resolve("Done");


                    })
                    .catch((error: any) => {
                        reject(error);
                    })
            } catch (e) {
                reject(e)
            }

        })


    }


    private async runUnsafeUpdate(connector: string, inputfileName: string): Promise<any> {

        return new Promise(async (resolve: any, reject: any) => {

            try {
                this._connector = await require(connector).default.createConnector("update");

                const reqArg: RequestNewBriefcaseArg = { iTwinId: this.hubArgs.projectGuid, iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext };
                new OpenTowerBreifcaseService().loadBriefcaseDb(reqArg)
                    .then(async (briefcaseDb: ConnectorBriefcaseDb) => {
                        this._db = briefcaseDb;


                        Logger.logInfo(LoggerCategories.Framework, "Loading synchronizer...");
                        const synchronizer = new Synchronizer(this.db, false, this._reqContext);
                        this.connector.synchronizer = synchronizer;

                        // // Register BisCoreSchema
                        // BisCoreSchema.registerSchema();


                        Logger.logInfo(LoggerCategories.Framework, "Writing configuration and opening source data...");
                        const synchConfig = await this.doInRepositoryChannel(
                            async () => {
                                const config = this.insertSynchronizationConfigLink();
                                this.connector.connectorArgs = this.jobArgs.connectorArgs;
                                await this.connector.openSourceData(path.join(KnownLocations.assetsDir, "sampleFiles", inputfileName));
                                const imodelStatus = await this.connector.onOpenIModel();
                                return "config done";
                            },
                            "Definitation Reading"
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Importing domain schema...");
                        await this.doInRepositoryChannel(
                            async () => {
                                return this.connector.importDomainSchema(this._reqContext!);
                            },
                            "Write domain schema."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Writing job subject and definitions...");
                        const jobSubject = await this.doInRepositoryChannel(
                            async () => {
                                const job = await this.updateJobSubject();
                                await this.connector.initializeJob();
                                await this.connector.importDefinitions();
                                return job;
                            },
                            "Write job subject and definitions."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Synchronizing...");
                        await this.doInConnectorChannel(jobSubject.id,
                            async () => {
                                await this.connector.updateExistingData();
                                // this.updateDeletedElements();
                            },
                            "Synchronize New Elements."
                        );


                        Logger.logInfo(LoggerCategories.Framework, "Writing job finish time and extent...");
                        await this.doInRepositoryChannel(
                            async () => {
                                this.updateProjectExtent();
                                this.connector.synchronizer.updateRepositoryLinks();
                            },
                            "Elements Updated."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Connector update job complete!");

                        await this.createdNamedVersionForLatestChangeSet({ iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext, name: "Elements Updated 1",description:  "Elements Updated 1" });

                        Logger.logInfo(LoggerCategories.Framework, "Connector job complete!");


                        resolve(this.hubArgs.iModelGuid);


                    })
                    .catch((error: any) => {
                        reject(error);
                    })
            } catch (e) {
                reject(e)
            }

        })


    }

    private async runUnsafeDelete(connector: string, inputfileName: string): Promise<any> {

        return new Promise(async (resolve: any, reject: any) => {

            try {
                this._connector = await require(connector).default.createConnector("delete");

                const reqArg: RequestNewBriefcaseArg = { iTwinId: this.hubArgs.projectGuid, iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext };
                new OpenTowerBreifcaseService().loadBriefcaseDb(reqArg)
                    .then(async (briefcaseDb: ConnectorBriefcaseDb) => {
                        this._db = briefcaseDb;


                        Logger.logInfo(LoggerCategories.Framework, "Loading synchronizer...");
                        const synchronizer = new Synchronizer(this.db, false, this._reqContext);
                        this.connector.synchronizer = synchronizer;

                        // // Register BisCoreSchema
                        // BisCoreSchema.registerSchema();


                        Logger.logInfo(LoggerCategories.Framework, "Writing configuration and opening source data...");
                        const synchConfig = await this.doInRepositoryChannel(
                            async () => {
                                const config = this.insertSynchronizationConfigLink();
                                this.connector.connectorArgs = this.jobArgs.connectorArgs;
                                await this.connector.openSourceData(path.join(KnownLocations.assetsDir, "sampleFiles", inputfileName));
                                const imodelStatus = await this.connector.onOpenIModel();
                                return "config done";
                            },
                            "Definitation Reading"
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Importing domain schema...");
                        await this.doInRepositoryChannel(
                            async () => {
                                return this.connector.importDomainSchema(this._reqContext!);
                            },
                            "Write domain schema."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Writing job subject and definitions...");
                        const jobSubject = await this.doInRepositoryChannel(
                            async () => {
                                const job = await this.updateJobSubject();
                                await this.connector.initializeJob();
                                await this.connector.importDefinitions();
                                return job;
                            },
                            "Write job subject and definitions."
                        );

                        Logger.logInfo(LoggerCategories.Framework, "Synchronizing...");
                        await this.doInConnectorChannel(jobSubject.id,
                            async () => {
                                await this.connector.updateExistingData();
                                // this.updateDeletedElements();
                            },
                            "Synchronize New Elements."
                        );


                        Logger.logInfo(LoggerCategories.Framework, "Writing job finish time and extent...");
                        await this.doInRepositoryChannel(
                            async () => {
                                this.updateProjectExtent();
                                this.connector.synchronizer.updateRepositoryLinks();
                            },
                            "Elements Deleted."
                        );

                        await this.createdNamedVersionForLatestChangeSet({ iModelId: this.hubArgs.iModelGuid, accessToken: this._reqContext, name: "Elements Deleted",description:  "Elements Deleted" });

                        Logger.logInfo(LoggerCategories.Framework, "Connector job complete!");


                        resolve(this.hubArgs.iModelGuid);


                    })
                    .catch((error: any) => {
                        reject(error);
                    })
            } catch (e) {
                reject(e)
            }

        })


    }

    public getEcefLocationProps(sourcePath: string): EcefLocationProps | null {
        const data = importSourceData(sourcePath);
        console.log("Calling getEcefLocationProps");
        if (data['ProjectData']) {
            let projectData = data['ProjectData'];
            const ecefLocationProps: EcefLocationProps = {
                origin: { x:  projectData['Site_Lattitude']*1, y: projectData['Site_Longitude']*1, z: projectData['Site_Altitude']*1},
                orientation: YawPitchRollAngles.createDegrees(0, 0, 0),
                cartographicOrigin: { latitude:  projectData['Site_Lattitude']*1, longitude: projectData['Site_Longitude']*1, height: projectData['Site_Altitude']*1},
            }
            return ecefLocationProps;
        } else {
            return null;
        }
    }



}