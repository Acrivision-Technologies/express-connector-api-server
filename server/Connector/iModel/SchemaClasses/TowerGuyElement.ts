import { AxisAlignedBox3d, Code, CodeScopeProps, CodeSpec, IModelError, PhysicalElementProps, Placement3d, Placement3dProps } from "@itwin/core-common";
import { IModelDb, PhysicalElement, SpatialCategory } from "@itwin/core-backend";
import { Id64String, IModelStatus, Logger } from "@itwin/core-bentley";
import { ConnectorLoggerCategory } from "../../ConnectorLoggerCategory";
import { CodeSpecs } from "../../TowerConnector";
import { TowerGuyBuilder } from "../Geometry/TowerGuyGeometry";
import { Categories } from "../Categories";

const loggerCategory: string = ConnectorLoggerCategory.Connector;

export interface TowerGuyElementProps extends PhysicalElementProps {
    GuyID: string;
    Label: string;
    Name: string;
    Type: string;
    TopElevation: string;
    BottomElevation: string;
    Classification: string;
    ComponentName: string;
    SourceAppElementId: string;
}
export class TowerGuyElement extends PhysicalElement {
    public static override get className(): string { return "Guy"; }

    public GuyID: string;
    public Label: string;
    public Name: string;
    public Type: string;
    public TopElevation: string;
    public BottomElevation: string;
    public Classification: string;
    public ComponentName: string;
    public SourceAppElementId: string;

    public constructor(props: TowerGuyElementProps, iModel: IModelDb) {
        super(props, iModel);
        this.GuyID = props.GuyID
        this.Label = props.Label
        this.Name = props.Name
        this.Type = props.Type
        this.TopElevation = props.TopElevation
        this.BottomElevation = props.BottomElevation
        this.Classification = props.Classification
        this.ComponentName = props.ComponentName
        this.SourceAppElementId = props.SourceAppElementId
    }

    public override toJSON(): TowerGuyElementProps {
        const val = super.toJSON() as TowerGuyElementProps;
        val.GuyID = this.GuyID;
        val.Label = this.Label;
        val.Name = this.Name;
        val.Type = this.Type;
        val.TopElevation = this.TopElevation;
        val.BottomElevation = this.BottomElevation;
        val.Classification = this.Classification;
        val.ComponentName = this.ComponentName;
        val.SourceAppElementId = this.SourceAppElementId;
        return val;
    }

    public static createCode(iModelDb: IModelDb, scope: CodeScopeProps, codeValue: string): Code {
        const codeSpec: CodeSpec = iModelDb.codeSpecs.getByName(CodeSpecs.TowerGuyPropertyInformation);
        return new Code({ spec: codeSpec.id, scope, value: codeValue });
    }


    public static create(imodel: IModelDb, physicalModelId: Id64String, definitionModelId: Id64String, guyNodes: any, sections: any, guyProperty: any,  guy: any, sourceEleID: any): PhysicalElement {
        const categoryId: any = SpatialCategory.queryCategoryIdByName(imodel, definitionModelId, Categories.Guys);
        if (undefined === categoryId) {
            throw new IModelError(IModelStatus.BadElement, "Unable to find category id for StandardConnector category");
        }
        return this.createTowerGuyElement(imodel, physicalModelId, definitionModelId, guyNodes, sections, guyProperty, guy, sourceEleID, categoryId, new TowerGuyBuilder(imodel, definitionModelId, categoryId), this.classFullName);
    }

    protected static createTowerGuyElement(imodel: IModelDb, physicalModelId: Id64String, definitionModelId: Id64String, guyNodes: any, sections: any, guyProperty: any, guy: any, sourceEleID: any, categoryId: any, mountBuilder: TowerGuyBuilder, classFullName: string): PhysicalElement {
        const code = this.createCode(imodel, physicalModelId, sourceEleID);
        const stream = mountBuilder.createGeometry(guy, guyNodes, sections);
        const props: TowerGuyElementProps = {
            code,
            category: categoryId,
            model: physicalModelId,
            classFullName,
            geom: stream,
            GuyID: guyProperty['GuyID'],
            Label: guyProperty['Label'],
            Name: guyProperty['GuyName'],
            Type: guyProperty['GuyType'],
            TopElevation: guyProperty['TopElevation'],
            BottomElevation: guyProperty['BottomElevation'],
            Classification: guyProperty['Classification'],
            ComponentName: guyProperty['ComponentName'],
            SourceAppElementId: guyProperty['SourceAppElementId'],
        };
        return imodel.elements.createElement(props);
    }
}