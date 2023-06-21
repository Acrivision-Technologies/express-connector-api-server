import * as path from "path";
import { BaseConnector, ItemState, SourceItem, SynchronizationResults } from "@itwin/connector-framework";
import { AccessToken, Id64String, assert, IModelStatus, Logger } from "@itwin/core-bentley";
import { EcefLocationProps } from "@itwin/core-common";
import { BisCoreSchema, CategorySelector, DefinitionModel, DefinitionPartition, DisplayStyle3d, DisplayStyleCreationOptions, ElementGroupsMembers, GeometryPart, Group, GroupInformationPartition, IModelJsFs, ModelSelector, OrthographicViewDefinition, PhysicalElement, PhysicalModel, PhysicalPartition, RenderMaterialElement, SpatialCategory, SubCategory, Subject, SubjectOwnsPartitionElements, ViewDefinition3d } from "@itwin/core-backend";
import type { SourceDocument } from "@itwin/connector-framework";
import { AxisAlignedBox3dProps, CodeScopeSpec, CodeSpec, ColorByName, ColorDef, ColorDefProps, GeometryPartProps, GeometryStreamBuilder, IModel, IModelError, InformationPartitionElementProps, RelationshipProps, RenderMode, SubCategoryAppearance, ViewFlags } from "@itwin/core-common";
import { Box, Cone, LinearSweep, Loop, Matrix3d, Point3d, Range3d, SolidPrimitive, StandardViewIndex, Transform, Vector3d, YawPitchRollAngles} from "@itwin/core-geometry";
import { ConnectorSchema } from "./ConnectorSchema";
import { KnownLocations } from "./KnownLocations";
import { ConnectorGroupModelService, queryDefinitionModel, queryPhysicalModel } from "./iModel/Services/ConnectorGroupModelService";
import { importSourceData } from "./iModel/Services/SourceDataService";
import { CategoryDefinitionModel } from "./iModel/Services/CategoryDefinitionModel";
import { MaterialDefinitionModel } from "./iModel/Services/MaterialDefinitionModel";
import { TowerInformationGroupInformationElement } from "./iModel/Services/TowerInformationGroupInformationElement";
import { TowerPhysicalElementService } from "./iModel/Services/TowerPhysicalElementService";
import { Categories } from "./iModel/Categories";
import { mandateConvertFeetToMeter } from "./ConnectorUtils";

export enum CodeSpecs {
    ProjectData = "OpenTower:ProjectData",
    TowerInformation = "OpenTower:TowerInformation",
    TowerPanelInformation = "OpenTower:TowerPanelInformation",
    TowerMountPropertyInformation = "OpenTower:TowerMountPropertyInformation",
    TowerGuyPropertyInformation = "OpenTower:TowerGuyPropertyInformation",
    TowerMountPipePropertyInformation = "OpenTower:TowerMountPipePropertyInformation",
    TowerAntennaPropertyInformation = "OpenTower:TowerAntennaPropertyInformation",
    TowerAttachmentPropertyInformation = "OpenTower:TowerAttachmentPropertyInformation",
    TowerAppurtenancePropertyInformation = "OpenTower:TowerAppurtenancePropertyInformation",
    TowerPolePropertyInformation = "OpenTower:TowerPolePropertyInformation",
}

class IntermediateBaseClass {

    getEcefLocationProps(data: any): EcefLocationProps | null {
        return null;
    }
}

export default class TowerConnector extends BaseConnector {
    private _data: any;
    private _sourceDataState: ItemState = ItemState.New;
    private _sourceData?: string;
    private _repositoryLinkId?: Id64String;
    private _actionType?: string;

    constructor(actionType: string) {
        super();
        this._actionType = actionType;
    }

    private get repositoryLinkId(): Id64String {
        assert(this._repositoryLinkId !== undefined);
        return this._repositoryLinkId;
    }

    public getApplicationVersion(): string {
        return "1.0.0.0";
    }

    public getConnectorName(): string {
        return "OpenTower";
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

    public static async createConnector(actionType: string): Promise<TowerConnector> {
        return new TowerConnector(actionType);
    }

    // __PUBLISH_EXTRACT_START__ TowerConnector-initializeJob.example-code
    public async initializeJob(): Promise<void> {

        console.log("inside initializeJob");
        console.log(this._sourceDataState);


        if (ItemState.New === this._sourceDataState) {
            this.createConnectorStartUpModel();
        }
    }

    // __PUBLISH_EXTRACT_START__ TowerConnector-importDomainSchema.example-code
    public async importDomainSchema(_requestContext: AccessToken): Promise<any> {
        if (this._sourceDataState === ItemState.Unchanged) {
            return;
        }
        ConnectorSchema.registerSchema();

        const fileName = path.join(KnownLocations.assetsDir, "iModelHubSchema/Connector.ecschema.xml");

        await this.synchronizer.imodel.importSchemas([fileName]);
    }

    // __PUBLISH_EXTRACT_START__ TowerConnector-importDynamicSchema.example-code  
    public async importDynamicSchema(requestContext: AccessToken): Promise<any> {
        // if (null === requestContext)
        //     return;


    }

    // __PUBLISH_EXTRACT_START__ TowerConnector-importDefinitions.example-code
    // importDefinitions is for definitions that are written to shared models such as DictionaryModel
    public async importDefinitions(): Promise<any> {
        if (this._sourceDataState === ItemState.Unchanged) {
            return;
        }
        this.insertCodeSpecs()


    }

    // __PUBLISH_EXTRACT_START__ TowerConnector-openSourceData.example-code
    public async openSourceData(sourcePath: string): Promise<void> {


        this._data = importSourceData(sourcePath);
        this._sourceData = sourcePath;
        const documentStatus = this.getDocumentStatus(); // make sure the repository link is created now, while we are in the repository channel
        this._sourceDataState = documentStatus.itemState;
        assert(documentStatus.elementProps.id !== undefined);
        this._repositoryLinkId = documentStatus.elementProps.id;

    }

    // __PUBLISH_EXTRACT_START__ TowerConnector-updateExistingData.example-code
    public async updateExistingData() {

        if (this._sourceDataState === ItemState.New && this._actionType == 'new') {

            // Insert Categories
            const categoryDefinitionModel = new CategoryDefinitionModel(this.synchronizer, this.jobSubject);
            categoryDefinitionModel.insertCategories();

            // Insert Materials
            const materialDefinitionModel = new MaterialDefinitionModel(this.synchronizer, this.jobSubject);
            materialDefinitionModel.insertMaterials();
        }

        const towerInformationGroupModel = new TowerInformationGroupInformationElement(this.synchronizer, this.jobSubject, this.repositoryLinkId);
        if(this._actionType == 'new') {
            towerInformationGroupModel.updateTowerInformation(this._data['TowerInformation']);
        }
        

        const towerPhysicalElementService = new TowerPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, this._data,  IModel.repositoryModelId);
        if(this._actionType !== 'delete') {
            towerPhysicalElementService.processProjectData();
            towerPhysicalElementService.processTowerPoles();
            towerPhysicalElementService.processTowerPanelProperties();
            towerPhysicalElementService.processTowerMounts();
            towerPhysicalElementService.processTowerGuys();
            towerPhysicalElementService.processTowerMountPipes();
            let NoOfLegs = this._data['TowerInformation'] ? this._data['TowerInformation']['NoOfLegs'] : 0;
            towerPhysicalElementService.processTowerAntennas(NoOfLegs);
            towerPhysicalElementService.processTowerAttachments();
            towerPhysicalElementService.processTowerAppurtenances();
        } else {
            towerPhysicalElementService.processElementsForDelete();
        }

        // this.synchronizer.imodel.views.setDefaultViewId(this.createView("TowerConnectorView"));



    }


    // Custom Code
    private insertCodeSpecs() {
        // ProjectData
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.ProjectData)) {
            return;
        }
        const projectDataSpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.ProjectData, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(projectDataSpec);
        
        // TowerInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerInformation)) {
            return;
        }
        const towerInformationSpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(towerInformationSpec);

        // TowerPanelInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerPanelInformation)) {
            return;
        }
        const panelSpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerPanelInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(panelSpec);
        
        // TowerMountPropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerMountPropertyInformation)) {
            return;
        }
        const mountPropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerMountPropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(mountPropertySpec);
        
        // TowerGuyPropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerGuyPropertyInformation)) {
            return;
        }
        const guyPropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerGuyPropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(guyPropertySpec);
        
        // TowerMountPipePropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerMountPipePropertyInformation)) {
            return;
        }
        const mountPipePropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerMountPipePropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(mountPipePropertySpec);
        
        // TowerAntennaPropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerAntennaPropertyInformation)) {
            return;
        }
        const antennaPropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerAntennaPropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(antennaPropertySpec);
        
        // TowerAttachmentPropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerAttachmentPropertyInformation)) {
            return;
        }
        const attachmentPropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerAttachmentPropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(attachmentPropertySpec);
        
        // TowerAppurtenancePropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerAppurtenancePropertyInformation)) {
            return;
        }
        const appurtenancePropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerAppurtenancePropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(appurtenancePropertySpec);
       
        // TowerPolePropertyInformation
        if (this.synchronizer.imodel.codeSpecs.hasName(CodeSpecs.TowerPolePropertyInformation)) {
            return;
        }
        const polePropertySpec = CodeSpec.create(this.synchronizer.imodel, CodeSpecs.TowerPolePropertyInformation, CodeScopeSpec.Type.Model);
        this.synchronizer.imodel.codeSpecs.insert(polePropertySpec);
    }

    private createConnectorStartUpModel() {
        console.log("insife createConnectorStartUpModel")
        const connectorGroupModelService = new ConnectorGroupModelService(this.synchronizer, this.jobSubject, IModel.repositoryModelId, this.repositoryLinkId);
        connectorGroupModelService.createTowerConnectorGroupInformationModel();
        connectorGroupModelService.createPhysicalModel();
        connectorGroupModelService.createDefinitionModel();
    }

    private getDocumentStatus(): SynchronizationResults {
        let timeStamp = Date.now();
        assert(this._sourceData !== undefined, "we should not be in this method if the source file has not yet been opened");
        const stat = IModelJsFs.lstatSync(this._sourceData); // will throw if this._sourceData names a file that does not exist. That would be a bug. Let it abort the job.

        if (undefined !== stat) {
            timeStamp = stat.mtimeMs;
        }

        // BisCoreSchema

        const sourceDoc: SourceDocument = {
            docid: this._sourceData,
            lastModifiedTime: timeStamp.toString(),
            checksum: () => undefined,
        };

        const documentStatus = this.synchronizer.recordDocument(sourceDoc);
        if (undefined === documentStatus) {
            const error = `Failed to retrieve a RepositoryLink for ${this._sourceData}`;
            throw new IModelError(IModelStatus.BadArg, error);
        }
        return documentStatus;
    }

    private createView(name: string): Id64String {
        const definitionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
        const physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);
        const code = OrthographicViewDefinition.createCode(this.synchronizer.imodel, definitionModelId!, name);


        const viewId = this.synchronizer.imodel.elements.queryElementIdByCode(code);
        if (undefined !== viewId) {
            return viewId;
        }


        const categorySelectorId = this.createCategorySelector(definitionModelId!);
        const modelSelectorId = this.createModelSelector(definitionModelId!, physicalModelId!);
        const displayStyleId = this.createDisplayStyle(definitionModelId!);

        let towerX: any = mandateConvertFeetToMeter(this._data['TowerInformation']["TopFaceWidth"]) + 5;
        let towerY: any = mandateConvertFeetToMeter(this._data['TowerInformation']["TopFaceDepth"]) + 5;
        let towerZ: any = mandateConvertFeetToMeter(this._data['TowerInformation']["TowerHeight"]) + 5;
        const originalExtents = this.synchronizer.imodel.projectExtents; 
        const newExtents = Range3d.create(originalExtents.low, originalExtents.high);
        newExtents.low.x = -towerX;
        newExtents.low.y = -towerY;
        newExtents.low.z = 0;
        newExtents.high.x = +towerX;
        newExtents.high.y = +towerY;
        newExtents.high.z = towerZ;
        this.synchronizer.imodel.updateProjectExtents(newExtents);


        const rotation = Matrix3d.createStandardWorldToView(StandardViewIndex.Front);
        const rotationTransform = Transform.createOriginAndMatrix(undefined, rotation);
        const rotatedRange = rotationTransform.multiplyRange(this.synchronizer.imodel.projectExtents);
        const view = OrthographicViewDefinition.create(this.synchronizer.imodel, definitionModelId!, name, modelSelectorId, categorySelectorId, displayStyleId, rotatedRange, StandardViewIndex.Front);
        view.extents = Vector3d.create(10, 10, 10);
        view.camera.setEyePoint(Point3d.create( 5, 5, 10))

        view.insert();


        return view.id;
    }

    private createCategorySelector(definitionModelId: Id64String): Id64String {
        const code = CategorySelector.createCode(this.synchronizer.imodel, definitionModelId, "Default");
        const selectorId = this.synchronizer.imodel.elements.queryElementIdByCode(code);
        if (undefined !== selectorId) {
            return selectorId;
        }

        const categoryId = SpatialCategory.queryCategoryIdByName(this.synchronizer.imodel, definitionModelId, Categories.Panels);
        if (undefined === categoryId) {
            throw new IModelError(IModelStatus.BadElement, "Unable to find StandardConnector Category");
        }
        return CategorySelector.insert(this.synchronizer.imodel, definitionModelId, "Default", []);
    }

    private createModelSelector(definitionModelId: Id64String, physicalModelId: Id64String): Id64String {
        const code = ModelSelector.createCode(this.synchronizer.imodel, definitionModelId, "Default");
        const selectorId = this.synchronizer.imodel.elements.queryElementIdByCode(code);
        if (undefined !== selectorId) {
            return selectorId;
        }
        return ModelSelector.insert(this.synchronizer.imodel, definitionModelId, "Default", [physicalModelId]);
    }

    private createDisplayStyle(definitionModelId: Id64String): Id64String {
        const code = DisplayStyle3d.createCode(this.synchronizer.imodel, definitionModelId, "Default");
        const displayStyleId = this.synchronizer.imodel.elements.queryElementIdByCode(code);
        if (undefined !== displayStyleId) {
            return displayStyleId;
        }
        const viewFlags: ViewFlags = new ViewFlags({ renderMode: RenderMode.SmoothShade });
        const options: DisplayStyleCreationOptions = {
            backgroundColor: ColorDef.fromTbgr(ColorByName.white),
            viewFlags,
        };
        const displayStyle: DisplayStyle3d = DisplayStyle3d.create(this.synchronizer.imodel, definitionModelId, "Default", options);
        displayStyle.insert();
        return displayStyle.id;
    }

}
