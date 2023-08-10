import * as hash from "object-hash";
import { ItemState, SourceItem, SynchronizationResults } from "@itwin/connector-framework";
import { assert } from "@itwin/core-bentley";
import { ElementGroupsMembers, PhysicalElement } from "@itwin/core-backend";
import { TowerAntennaElement } from "../SchemaClasses/TowerAntennaElement";



export class TowerAntennaPropertyPhysicalElementService {

    private synchronizer: any;
    private jobSubject: any;
    private repositoryLinkId: any;
    private definitionModelId: any;
    private physicalModelId: any;
    private antennaProperty: any;
    private antennaNodes: any;
    private sections: any;

    constructor(synchronizer: any, jobSubject: any, repositoryLinkId: any, definitionModelId: any, physicalModelId: any, antennaProperty: any, antennaNodes: any, sections: any) {

        this.synchronizer = synchronizer;
        this.jobSubject = jobSubject;
        this.repositoryLinkId = repositoryLinkId;
        this.definitionModelId = definitionModelId;
        this.physicalModelId = physicalModelId;
        this.antennaProperty = antennaProperty;
        this.antennaNodes = antennaNodes;
        this.sections = sections;
    }

    public processAntennas = (antennaElement: any) => {

        const xse = this.synchronizer.getExternalSourceElementByLinkId(this.repositoryLinkId);
        const startNodeID = antennaElement[0]['elements'][0]['StartNodeID'];
        const endNodeID = antennaElement[0]['elements'][0]['EndNodeID'];
        const sectionID = antennaElement[0]['elements'][0]['SectionID'];

        const startNode = this.antennaNodes.filter((node: any) => {
            if (node['ID'] == startNodeID) {
                return node;
            }
        })[0]
        const endNode = this.antennaNodes.filter((node: any) => {
            if (node['ID'] == endNodeID) {
                return node;
            }
        })[0];

        // console.log("antennaElement: ", JSON.stringify(antennaElement))
        // console.log("startNode: ", JSON.stringify(startNode))
        // console.log("endNode: ", JSON.stringify(endNode))
        const section = this.sections.find((section: any) => section["ID"] == sectionID);

        const str = JSON.stringify({...this.antennaProperty, startNodeX: startNode['X'], startNodeY: startNode['Y'], startNodeZ: startNode['Z'], endNodeX:endNode['X'], endNodeY: endNode['Y'], endNodeZ: endNode['Z']});

        const sourceEleID: string =  "Antenna_Property_" + this.antennaProperty["ID"];
        const sourceItem: SourceItem = {
            source: xse?.id,
            scope: this.physicalModelId,
            kind: "Antenna_Property",
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
        element = TowerAntennaElement.create(this.synchronizer.imodel, this.physicalModelId, this.definitionModelId, this.antennaNodes, this.sections, this.antennaProperty, antennaElement, sourceEleID, elementID);
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

        // this.createAntennaOriginLine(antennaElement);
    }

    private createAntennaOriginLine = (antennaElement: any) => {

        const xse = this.synchronizer.getExternalSourceElementByLinkId(this.repositoryLinkId);
        const str = JSON.stringify(this.antennaProperty);
        const sourceEleID: string = 'Antenna_' + this.antennaProperty["ID"]+"_Line";
        // console.log(`sourceEleID => ${sourceEleID}`)
        const startNodeID = antennaElement[0]['elements'][0]['StartNodeID'];
        const endNodeID = antennaElement[0]['elements'][0]['EndNodeID'];
        const sectionID = antennaElement[0]['elements'][0]['SectionID'];

        const startNode = this.antennaNodes.filter((node: any) => {
            if (node['ID'] == startNodeID) {
                return node;
            }
        })[0]
        const endNode = this.antennaNodes.filter((node: any) => {
            if (node['ID'] == endNodeID) {
                return node;
            }
        })[0];
        const section = this.sections.find((section: any) => section["ID"] == sectionID);

        const sourceItem: SourceItem = {
            source: xse?.id,
            scope: this.physicalModelId,
            kind: "Antenna_Line_Element",
            id: sourceEleID,
            checksum: () => hash.MD5(str),
        };
        const results = this.synchronizer.detectChanges(sourceItem);
        if (results.state === ItemState.Unchanged) {
            this.synchronizer.onElementSeen(results.id!);
            return;
        }

        // console.log("creating antenna line")
        // console.log(results)

        let element: PhysicalElement;
        let elementID:string = "";
        if(results.id)
            elementID = results.id;
        element = TowerAntennaElement.createLine(this.synchronizer.imodel, this.physicalModelId, this.definitionModelId, this.antennaProperty, antennaElement, startNode, endNode, sourceEleID, elementID);

        // console.log(`element ******************************************************************************* `);
        // console.log(element);

        // console.log('results');
        // console.log(results);

        if (undefined !== results.id) {
            element.id = results.id;
        }
        const sync: SynchronizationResults = {
            elementProps: element.toJSON(),
            itemState: results.state,
        };
        // console.log('+++++++++++++++++++++++');
        // console.log('results.state');
        // console.log(results.state);
        this.synchronizer.updateIModel(sync, sourceItem);


    }
}