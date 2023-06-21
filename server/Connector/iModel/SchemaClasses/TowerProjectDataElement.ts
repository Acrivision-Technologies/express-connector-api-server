import { AxisAlignedBox3d, Code, CodeScopeProps, CodeSpec, IModelError, PhysicalElementProps, Placement3d, Placement3dProps } from "@itwin/core-common";
import { IModelDb, PhysicalElement, SpatialCategory } from "@itwin/core-backend";
import { Id64String, IModelStatus, Logger } from "@itwin/core-bentley";
import {  XYZProps, YawPitchRollProps } from "@itwin/core-geometry";
import { ConnectorLoggerCategory } from "../../ConnectorLoggerCategory";
import { TowerMountPipeBuilder } from "../Geometry/TowerMountPipeGeometry";
import { CodeSpecs } from "../../TowerConnector";
import { Categories } from "../Categories";
import { TowerProjectDataBuilder } from "../Geometry/TowerProjectDataGeometry";



const loggerCategory: string = ConnectorLoggerCategory.Connector;

export interface TowerProjectDataElementProps extends PhysicalElementProps {
    ProjectDataID: string;
    Label: string;
    UserLabel: string;
    Name: string;
    HashId: string;
    ComponentName: string;
    Carr_Subject: string;
    Carr_sitename: string;
    Carr_siteNumber: string;
    Carr_AnalysisType: string;
    Carr_CarrierName: string;
    Cust_siteid: string;
    Cust_JobNumber: string;
    Cust_SiteName: string;
    Cust_City: string;
    Cust_State: string;
    Cust_Zip: string;
    Cust_Address: string;
    Cust_ProjectID: string;
    Cust_Applicationid: string;
    Cust_ApplicationRevisionid: string;
    Cust_Name: string;
    Site_Address: string;
    Site_City: string;
    Site_State: string;
    Site_Zip: string;
    Site_County: string;
    Site_Lattitude: string;
    Site_Longitude: string;
    Site_Altitude: string;


}
export class TowerProjectDataElement extends PhysicalElement {
    public static override get className(): string { return "ProjectData"; }

    public ProjectDataID: string;
    public Label: string;
    public UserLabel: string;
    public Name: string;
    public HashId: string;
    public ComponentName: string;
    public Carr_Subject: string;
    public Carr_sitename: string;
    public Carr_siteNumber: string;
    public Carr_AnalysisType: string;
    public Carr_CarrierName: string;
    public Cust_siteid: string;
    public Cust_JobNumber: string;
    public Cust_SiteName: string;
    public Cust_City: string;
    public Cust_State: string;
    public Cust_Zip: string;
    public Cust_Address: string;
    public Cust_ProjectID: string;
    public Cust_Applicationid: string;
    public Cust_ApplicationRevisionid: string;
    public Cust_Name: string;
    public Site_Address: string;
    public Site_City: string;
    public Site_State: string;
    public Site_Zip: string;
    public Site_County: string;
    public Site_Lattitude: string;
    public Site_Longitude: string;
    public Site_Altitude: string;


    public constructor(props: TowerProjectDataElementProps, iModel: IModelDb) {
        super(props, iModel);
        this.ProjectDataID = props.ProjectDataID
        this.Label = props.Label
        this.UserLabel = props.UserLabel
        this.Name = props.Name
        this.HashId = props.HashId
        this.ComponentName = props.ComponentName
        this.Carr_Subject = props.Carr_Subject
        this.Carr_sitename = props.Carr_sitename
        this.Carr_siteNumber = props.Carr_siteNumber
        this.Carr_AnalysisType = props.Carr_AnalysisType
        this.Carr_CarrierName = props.Carr_CarrierName
        this.Cust_siteid = props.Cust_siteid
        this.Cust_JobNumber = props.Cust_JobNumber
        this.Cust_SiteName = props.Cust_SiteName
        this.Cust_City = props.Cust_City
        this.Cust_State = props.Cust_State
        this.Cust_Zip = props.Cust_Zip
        this.Cust_Address = props.Cust_Address
        this.Cust_ProjectID = props.Cust_ProjectID
        this.Cust_Applicationid = props.Cust_Applicationid
        this.Cust_ApplicationRevisionid = props.Cust_ApplicationRevisionid
        this.Cust_Name = props.Cust_Name
        this.Site_Address = props.Site_Address
        this.Site_City = props.Site_City
        this.Site_State = props.Site_State
        this.Site_Zip = props.Site_Zip
        this.Site_County = props.Site_County
        this.Site_Lattitude = props.Site_Lattitude
        this.Site_Longitude = props.Site_Longitude
        this.Site_Altitude = props.Site_Altitude


    }

    public override toJSON(): TowerProjectDataElementProps {
        const val = super.toJSON() as TowerProjectDataElementProps;
        val.ProjectDataID = this.ProjectDataID;
        val.Label = this.Label;
        val.UserLabel = this.UserLabel;
        val.Name = this.Name;
        val.HashId = this.HashId;
        val.ComponentName = this.ComponentName;
        val.Carr_Subject = this.Carr_Subject;
        val.Carr_sitename = this.Carr_sitename;
        val.Carr_siteNumber = this.Carr_siteNumber;
        val.Carr_AnalysisType = this.Carr_AnalysisType;
        val.Carr_CarrierName = this.Carr_CarrierName;
        val.Cust_siteid = this.Cust_siteid;
        val.Cust_JobNumber = this.Cust_JobNumber;
        val.Cust_SiteName = this.Cust_SiteName;
        val.Cust_City = this.Cust_City;
        val.Cust_State = this.Cust_State;
        val.Cust_Zip = this.Cust_Zip;
        val.Cust_Address = this.Cust_Address;
        val.Cust_ProjectID = this.Cust_ProjectID;
        val.Cust_Applicationid = this.Cust_Applicationid;
        val.Cust_ApplicationRevisionid = this.Cust_ApplicationRevisionid;
        val.Cust_Name = this.Cust_Name;
        val.Site_Address = this.Site_Address;
        val.Site_City = this.Site_City;
        val.Site_State = this.Site_State;
        val.Site_Zip = this.Site_Zip;
        val.Site_County = this.Site_County;
        val.Site_Lattitude = this.Site_Lattitude;
        val.Site_Longitude = this.Site_Longitude;
        val.Site_Altitude = this.Site_Altitude;

        return val;
    }

    public static createCode(iModelDb: IModelDb, scope: CodeScopeProps, codeValue: string): Code {
        const codeSpec: CodeSpec = iModelDb.codeSpecs.getByName(CodeSpecs.ProjectData);
        return new Code({ spec: codeSpec.id, scope, value: codeValue });
    }

    public static create(imodel: IModelDb, physicalModelId: Id64String, definitionModelId: Id64String, projectData: any, sourceEleID: any, elementID: any): PhysicalElement | any {
        const categoryId = SpatialCategory.queryCategoryIdByName(imodel, definitionModelId, Categories.ProjectData);
        if (undefined === categoryId) {
            throw new IModelError(IModelStatus.BadElement, "Unable to find category id for StandardConnector category for createTowerProjectDataElement");
        }
        return this.createTowerProjectDataElement(imodel, physicalModelId, definitionModelId, projectData, sourceEleID, categoryId, new TowerProjectDataBuilder(imodel, definitionModelId, categoryId), this.classFullName, elementID);
    }

    protected static createTowerProjectDataElement(imodel: IModelDb, physicalModelId: Id64String, definitionModelId: Id64String, projectData: any, sourceEleID: any, categoryId: any, towerProjectDataBuilder: TowerProjectDataBuilder, classFullName: string, elementID: any): PhysicalElement | any {
        const code = this.createCode(imodel, physicalModelId, sourceEleID);
        console.log('code')
        console.log(code);
        console.log('projectData')
        console.log(projectData);
        console.log(imodel);
        console.log('imodel');
        // console.log('imodel');

        const props: TowerProjectDataElementProps = {
            code,
            category: categoryId,
            model: physicalModelId,
            classFullName,
            geom: [],
            ProjectDataID: projectData['ID'],
            Label: projectData['Label'],
            UserLabel: "Project Data",
            Name: projectData['Label'],
            HashId: projectData['HashId'],
            ComponentName: projectData['ComponentName'],
            Carr_Subject: projectData['Carr_Subject'],
            Carr_sitename: projectData['Carr_sitename'],
            Carr_siteNumber: projectData['Carr_siteNumber'],
            Carr_AnalysisType: projectData['Carr_AnalysisType'],
            Carr_CarrierName: projectData['Carr_CarrierName'],
            Cust_siteid: projectData['Cust_siteid'],
            Cust_JobNumber: projectData['Cust_JobNumber'],
            Cust_SiteName: projectData['Cust_SiteName'],
            Cust_City: projectData['Cust_City'],
            Cust_State: projectData['Cust_State'],
            Cust_Zip: projectData['Cust_Zip'],
            Cust_Address: projectData['Cust_Address'],
            Cust_ProjectID: projectData['Cust_ProjectID'],
            Cust_Applicationid: projectData['Cust_Applicationid'],
            Cust_ApplicationRevisionid: projectData['Cust_ApplicationRevisionid'],
            Cust_Name: projectData['Cust_Name'],
            Site_Address: projectData['Site_Address'],
            Site_City: projectData['Site_City'],
            Site_State: projectData['Site_State'],
            Site_Zip: projectData['Site_Zip'],
            Site_County: projectData['Site_County'],
            Site_Lattitude: projectData['Site_Lattitude'],
            Site_Longitude: projectData['Site_Longitude'],
            Site_Altitude: projectData['Site_Altitude'],
        };
        console.log('props');
        console.log(props);
        const insertedElement = imodel.elements.createElement(props);
        console.log("insertedElement");
        console.log(insertedElement);




        return insertedElement;

    }
}