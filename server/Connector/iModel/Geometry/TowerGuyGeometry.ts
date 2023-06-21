
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Cone, Point3d, SolidPrimitive} from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart} from "@itwin/core-backend";
import { GeometryPartProps, GeometryStreamProps } from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { convertInchToMeter, toNumber } from "../../ConnectorUtils";
import { CategoryColor } from "../Categories";



export class TowerGuyBuilder {

    protected _builder: GeometryStreamBuilder;

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String) {
        this._builder = new GeometryStreamBuilder();
    }


    public createGeometry(guy: any, guyNodes: any, sections: any): GeometryStreamProps {
        if (guy && guy['elements']) {

            const guyElements: any[] = guy['elements'];
            guyElements.forEach((guyElement: any) => {
                let startNodeId = guyElement['StartNodeID'] ? guyElement['StartNodeID'] : guyElement['StartNodeId'];
                let endNodeId = guyElement['EndNodeID'] ? guyElement['EndNodeID'] : guyElement['EndNodeId'];
                let sectionId = guyElement['SectionID'] ? guyElement['SectionID'] : guyElement['SectionId'];
                const startNode = guyNodes.find((node: any) => node["ID"] == startNodeId);
                const endNode = guyNodes.find((node: any) => node["ID"] == endNodeId);
                const guySection = sections.find((section: any) => section["ID"] == sectionId);
                const name = "Guy_" + guy['ID'] + "_Member_" + guyElement["ID"];
                let shapeID = this.createShape(startNode, endNode, guySection, name);
                if(shapeID) {
                    this._builder.appendGeometryPart3d(shapeID);
                }
            });
        }

        return this._builder.geometryStream;
    }

    public createShape = (startNode: any, endNode: any, section: any, name: string) => {

        let guyRadius = convertInchToMeter(0.02);
        if(section) {
            if(section['Radius']) {
                guyRadius =  convertInchToMeter(section['Radius']);
            } else if (section['Width']) {
                guyRadius = convertInchToMeter(section['Width']) / 2;
            }
        }

        const pointA = Point3d.create(startNode['X'], startNode['Y'], startNode['Z']);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);
        const guyShape = Cone.createAxisPoints(pointA, pointB, guyRadius, guyRadius, true);
        let guyShapeID: Id64String = "";
        if (guyShape) {
            guyShapeID = this.insertGeometryPart(name, guyShape);
        }
        return guyShapeID;

    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive): Id64String => {
        const geometryStreamBuilder = new GeometryStreamBuilder();
        const params = new GeometryParams(this._categoryId, "guy");
        params.fillColor = ColorDef.fromTbgr(CategoryColor.Guys);
        params.lineColor = params.fillColor;
        geometryStreamBuilder.appendGeometryParamsChange(params);

        geometryStreamBuilder.appendGeometry(primitive);

        const geometryPartProps: GeometryPartProps = {
            classFullName: GeometryPart.classFullName,
            model: this._definitionModelId,
            code: GeometryPart.createCode(this._imodel, this._definitionModelId, name),
            geom: geometryStreamBuilder.geometryStream,
        };


        return this._imodel.elements.insertElement(geometryPartProps);
    }


}