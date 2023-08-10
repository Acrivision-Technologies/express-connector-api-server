
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Cone, Point3d, SolidPrimitive } from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart} from "@itwin/core-backend";
import {  GeometryPartProps} from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { convertFeetToMeter, convertInchToMeter, plotOffsetOnCoordintates, toNumber } from "../../ConnectorUtils";
import { CategoryColor } from "../Categories";



export class TowerMountPipeBuilder {

    protected _builder: GeometryStreamBuilder;
    private mountPipeProperty: any;

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String, mountPipeProperty: any) {
        this._builder = new GeometryStreamBuilder();
        this.mountPipeProperty = mountPipeProperty
    }


    public createGeometry(mountPipes: any, mountNodes: any, sections: any, mountProperties: any) {

        mountPipes.forEach((mountPipeElement: any) => {

            let startNode = mountNodes.find((node: any) => node["ID"] == mountPipeElement['StartNodeID']);
            let endNode = mountNodes.find((node: any) => node["ID"] == mountPipeElement['EndNodeID']);
            const mountSection = sections.find((section: any) => section["ID"] == mountPipeElement["SectionID"]);
            const name = "Mount_Pipe_" + mountPipeElement['MountPipePropertyID'] + "_Member_" + mountPipeElement["ID"];

            // console.log(`mountPipeProperty: ${JSON.stringify(this.mountPipeProperty)}`)
            // console.log(`startNode: ${JSON.stringify(startNode)}`)
            // console.log(`endNode: ${JSON.stringify(endNode)}`)
            // console.log(`mountSection: ${JSON.stringify(mountSection)}`)

            let Standoff = parseFloat('0')
            const mountProperty = mountProperties.find((mountProperty: any) => {
                return mountProperty['ID'] === mountPipeElement['MountID'];
            })
            if(mountProperty) {
                Standoff = parseFloat(mountProperty['Standoff'])
            }
            // console.log(`Standoff: ${Standoff}`)

            let LateralOffset = parseFloat(this.mountPipeProperty['LateralOffset'])
            if (LateralOffset != 0) {
                LateralOffset =  parseFloat(convertFeetToMeter(LateralOffset - Standoff).toFixed(3))
            }

            let HorizontalOffset = parseFloat('0')
            // let HorizontalOffset = parseFloat(this.mountPipeProperty['HorizontalOffset']);
            // if (HorizontalOffset != 0) {
            //     HorizontalOffset =  parseFloat(convertFeetToMeter(HorizontalOffset - Standoff).toFixed(3))
            // }

            const newPoint = plotOffsetOnCoordintates(startNode, LateralOffset, HorizontalOffset)
            // console.log(`mountPipeElement newPoint: ${newPoint}`)
    
            if(newPoint) {
                startNode['X'] = newPoint[0];
                startNode['Y'] = newPoint[1];
                endNode['X'] = newPoint[0];
                endNode['Y'] = newPoint[1];
            }
    
            // console.log("mountPipeElement newPoint startNode: ", JSON.stringify(startNode))
            // console.log("mountPipeElement newPoint endNode: ", JSON.stringify(endNode))

            let shapeId = this.createShape(startNode, endNode, mountSection, name);
            this._builder.appendGeometryPart3d(shapeId);

        })
        return this._builder.geometryStream;
    }

    public createShape = (startNode: any, endNode: any, section: any, name: string) => {

        const radius = convertInchToMeter(section['Radius'])

        const pointA = Point3d.create(startNode['X'], startNode['Y'], startNode['Z']);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);

        const mountShape = Cone.createAxisPoints(pointA, pointB, radius, radius, true);
        let mountShapeID: Id64String = "";
        if (mountShape) {
            mountShapeID = this.insertGeometryPart(name, mountShape)!;
        }
        return mountShapeID;

    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive): Id64String | undefined => {
        try {
            const geometryStreamBuilder = new GeometryStreamBuilder();
            const params = new GeometryParams(this._categoryId, "mount");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.MountPipes);
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
            console.log("Error while inserting Mountpipe element")
            console.log(e)
        }
    }


}