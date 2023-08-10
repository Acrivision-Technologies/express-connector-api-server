
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Box, Cone, Point3d, SolidPrimitive, Vector3d, YawPitchRollAngles } from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart, SpatialLocation } from "@itwin/core-backend";
import { GeometryPartProps, GeometryStreamProps } from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { convertFeetToMeter, convertInchToMeter, distanceBetweenPoint, fromSumOf, getSlopeAngle, toNumber } from "../../ConnectorUtils";
import { CategoryColor } from "../Categories";



export class TowerPoleBuilder {

    protected _builder: GeometryStreamBuilder;

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String, protected readonly poleProperty: any) {
        this._builder = new GeometryStreamBuilder();
    }

    public createGeometry(pole: any, nodes: any, sections: any): GeometryStreamProps {


        const startNode = nodes.find((node: any) => node["ID"] == pole['StartNodeID']);
        const endNode = nodes.find((node: any) => node["ID"] == pole['EndNodeID']);
        const name = "Pole_" + pole['PolePropertyID'] + "_Member_" + pole["ID"];

        const topRadius = convertInchToMeter(this.poleProperty['TopFlatDiameter']) / 2;
        const bottomRadius = convertInchToMeter(this.poleProperty['BottomFlatDiameter']) / 2;
        const pointA = Point3d.create(startNode['X'], startNode['Y'], startNode['Z']);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);

        const shape = Cone.createAxisPoints(pointA, pointB, topRadius, bottomRadius, true);
        if (shape) {
            let shapeID = this.insertGeometryPart(name, shape)!;
            this._builder.appendGeometryPart3d(shapeID);
        }

        return this._builder.geometryStream;

    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive): Id64String | undefined => {
        try {

            const geometryStreamBuilder = new GeometryStreamBuilder();
            const params = new GeometryParams(this._categoryId, "pole");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Poles);
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
        } catch(e) {
            console.log("error inserting Pole element");
            console.log(e)
        }
    }


}