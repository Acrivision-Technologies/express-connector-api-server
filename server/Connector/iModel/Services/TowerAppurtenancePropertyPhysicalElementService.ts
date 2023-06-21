import * as hash from "object-hash";
import { ItemState, SourceItem, SynchronizationResults } from "@itwin/connector-framework";
import { assert } from "@itwin/core-bentley";
import { ElementGroupsMembers, PhysicalElement } from "@itwin/core-backend";
import { TowerAppurtenanceElement } from "../SchemaClasses/TowerAppurtenanceElement";



export class TowerAppurtenancePropertyPhysicalElementService {

    private synchronizer: any;
    private jobSubject: any;
    private repositoryLinkId: any;
    private definitionModelId: any;
    private physicalModelId: any;
    private appurtenanceProperty: any;
    private appurtenanceNodes: any;
    private sections: any;

    constructor(synchronizer: any, jobSubject: any, repositoryLinkId: any, definitionModelId: any, physicalModelId: any, appurtenanceProperty: any, appurtenanceNodes: any, sections: any) {

        this.synchronizer = synchronizer;
        this.jobSubject = jobSubject;
        this.repositoryLinkId = repositoryLinkId;
        this.definitionModelId = definitionModelId;
        this.physicalModelId = physicalModelId;
        this.appurtenanceProperty = appurtenanceProperty;
        this.appurtenanceNodes = appurtenanceNodes;
        this.sections = sections;
    }

    public processAppurtenance = (appurtenance: any) => {

        const xse = this.synchronizer.getExternalSourceElementByLinkId(this.repositoryLinkId);
        const str = JSON.stringify(this.appurtenanceProperty);
        const sourceEleID: string =  "Appurtenance_" + this.appurtenanceProperty["ID"];

        const sourceItem: SourceItem = {
            source: xse?.id,
            scope: this.physicalModelId,
            kind: "Appurtenance_Property",
            id: sourceEleID,
            checksum: () => hash.MD5(str),
        };
        const results = this.synchronizer.detectChanges(sourceItem);
        if (results.state === ItemState.Unchanged) {
            this.synchronizer.onElementSeen(results.id!);
            return;
        }

        let element: PhysicalElement;
        // TowerAppurtenanceElement
        element = TowerAppurtenanceElement.create(this.synchronizer.imodel, this.physicalModelId, this.definitionModelId, this.appurtenanceNodes, this.sections, this.appurtenanceProperty, appurtenance, sourceEleID);
        if(element) {
            if (undefined !== results.id) {
                element.id = results.id;
            }
            const sync: SynchronizationResults = {
                elementProps: element.toJSON(),
                itemState: results.state,
            };
            this.synchronizer.updateIModel(sync, sourceItem);

            const groupCode = TowerAppurtenanceElement.createCode(this.synchronizer.imodel, this.jobSubject.id, sourceEleID);
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