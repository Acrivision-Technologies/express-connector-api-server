import * as hash from "object-hash";
import { ItemState, SourceItem, SynchronizationResults } from "@itwin/connector-framework";
import { assert } from "@itwin/core-bentley";
import { ElementGroupsMembers, PhysicalElement } from "@itwin/core-backend";
import { TowerProjectDataElement } from "../SchemaClasses/TowerProjectDataElement";



export class TowerProjectDataPhysicalElementService {

    private synchronizer: any;
    private jobSubject: any;
    private repositoryLinkId: any;
    private definitionModelId: any;
    private physicalModelId: any;

    constructor(synchronizer: any, jobSubject: any, repositoryLinkId: any, definitionModelId: any, physicalModelId: any) {

        this.synchronizer = synchronizer;
        this.jobSubject = jobSubject;
        this.repositoryLinkId = repositoryLinkId;
        this.definitionModelId = definitionModelId;
        this.physicalModelId = physicalModelId;
    }

    public processProjectData = (projectData: any) => {

        const xse = this.synchronizer.getExternalSourceElementByLinkId(this.repositoryLinkId);


        const str = JSON.stringify({...projectData});

        const sourceEleID: string =  "Project_Data_" + projectData["ID"];
        const sourceItem: SourceItem = {
            source: xse?.id,
            scope: this.physicalModelId,
            kind: "Project_Data",
            id: sourceEleID,
            checksum: () => hash.MD5(str),
        };
        const results = this.synchronizer.detectChanges(sourceItem);
        if (results.state === ItemState.Unchanged) {
            this.synchronizer.onElementSeen(results.id!);
            return;
        }


        let element: PhysicalElement;
        let elementID:string = "";
        if(results.id)
            elementID = results.id;
        element = TowerProjectDataElement.create(this.synchronizer.imodel, this.physicalModelId, this.definitionModelId, projectData, sourceEleID, elementID);
        // console.log(element);
        if(element) {
            if (undefined !== results.id) {
                element.id = results.id;
            }
            const sync: SynchronizationResults = {
                elementProps: element.toJSON(),
                itemState: results.state,
            };
            this.synchronizer.updateIModel(sync, sourceItem);
        }
    }
}