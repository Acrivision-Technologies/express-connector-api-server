
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



export class TowerMountBuilder {

    protected _builder: GeometryStreamBuilder;

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String) {
        this._builder = new GeometryStreamBuilder();
    }


    public createGeometry(mount: any, mountNodes: any, sections: any): GeometryStreamProps {
        if (mount && mount['elements']) {

            const mountElements: any[] = mount['elements'];
            mountElements.forEach((mountElement: any) => {

                const startNode = mountNodes.find((node: any) => node["ID"] == mountElement['StartNodeID']);
                const endNode = mountNodes.find((node: any) => node["ID"] == mountElement['EndNodeID']);
                const mountSection = sections.find((section: any) => section["ID"] == mountElement["SectionID"]);
                const name = "Mount_" + mount['ID'] + "_Member_" + mountElement["ID"];
                let shapeID = this.createShape(startNode, endNode, mountSection, name);
                if(shapeID) {
                    this._builder.appendGeometryPart3d(shapeID);
                }
            });
        }

        return this._builder.geometryStream;
    }

    public createShape = (startNode: any, endNode: any, section: any, name: string) => {

        let mountRadius = convertInchToMeter(1.1875);
        if(section['Radius']) {
            mountRadius =  convertInchToMeter(section['Radius']);
        } else if (section['Width']) {
            mountRadius = convertInchToMeter(section['Width']) / 2;
        }

        const pointA = Point3d.create(startNode['X'], startNode['Y'], startNode['Z']);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);
        const mountShape = Cone.createAxisPoints(pointA, pointB, mountRadius, mountRadius, true);
        let mountShapeID: Id64String = "";
        if (mountShape) {
            mountShapeID = this.insertGeometryPart(name, mountShape);
        }
        return mountShapeID;

    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive): Id64String => {
        const geometryStreamBuilder = new GeometryStreamBuilder();
        const params = new GeometryParams(this._categoryId, "mount");
        params.fillColor = ColorDef.fromTbgr(CategoryColor.Mounts);
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