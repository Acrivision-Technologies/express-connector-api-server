import * as hash from "object-hash";
import { ItemState, SourceItem, SynchronizationResults } from "@itwin/connector-framework";
import { assert } from "@itwin/core-bentley";
import { ElementGroupsMembers, PhysicalElement } from "@itwin/core-backend";
import { TowerMountElement } from "../SchemaClasses/TowerMountElement";
import { TowerMountPipeElement } from "../SchemaClasses/TowerMountPipeElement";



export class TowerMountPipePropertyPhysicalElementService {

    private synchronizer: any;
    private jobSubject: any;
    private repositoryLinkId: any;
    private definitionModelId: any;
    private physicalModelId: any;
    private mountPipeProperty: any;
    private mountNodes: any;
    private mountProperties: any;
    private sections: any;

    constructor(synchronizer: any, jobSubject: any, repositoryLinkId: any, definitionModelId: any, physicalModelId: any, mountPipeProperty: any, mountNodes: any, sections: any, mountProperties: any) {

        this.synchronizer = synchronizer;
        this.jobSubject = jobSubject;
        this.repositoryLinkId = repositoryLinkId;
        this.definitionModelId = definitionModelId;
        this.physicalModelId = physicalModelId;
        this.mountPipeProperty = mountPipeProperty;
        this.mountNodes = mountNodes;
        this.mountProperties = mountProperties;
        this.sections = sections;
    }

    public processMountPipes = (mountPipes: any) => {

        const xse = this.synchronizer.getExternalSourceElementByLinkId(this.repositoryLinkId);
        const str = JSON.stringify(this.mountPipeProperty);
        const sourceEleID: string =  "Mount_Pipe_Property_" + this.mountPipeProperty["ID"];

        const sourceItem: SourceItem = {
            source: xse?.id,
            scope: this.physicalModelId,
            kind: "Mount_Pipe_Property",
            id: sourceEleID,
            checksum: () => hash.MD5(str),
        };
        const results = this.synchronizer.detectChanges(sourceItem);
        if (results.state === ItemState.Unchanged) {
            this.synchronizer.onElementSeen(results.id!);
            return;
        }


        let element: PhysicalElement;
        element = TowerMountPipeElement.create(this.synchronizer.imodel, this.physicalModelId, this.definitionModelId, this.mountNodes, this.sections, this.mountPipeProperty, mountPipes, sourceEleID, this.mountProperties);
        if(element) {
            if (undefined !== results.id) {
                element.id = results.id;
            }
            const sync: SynchronizationResults = {
                elementProps: element.toJSON(),
                itemState: results.state,
            };
            this.synchronizer.updateIModel(sync, sourceItem);

            const groupCode = TowerMountPipeElement.createCode(this.synchronizer.imodel, this.jobSubject.id, sourceEleID);
            const groupElement = this.synchronizer.imodel.elements.queryElementIdByCode(groupCode);

            assert(groupElement !== undefined);
            let doCreate = results.state === ItemState.New;

            if (results.state === ItemState.Changed) {
                try {
                    ElementGroupsMembers.getInstance(this.synchronizer.imodel, { sourceId: groupElement, targetId: element.id });
                    doCreate = false;
                } catch (err) {
                    doCreate = true;
                }
            }

            if (doCreate) {
                const rel = ElementGroupsMembers.create(this.synchronizer.imodel, groupElement, sync.elementProps.id!);
                rel.insert();
            }

        }
    }
}