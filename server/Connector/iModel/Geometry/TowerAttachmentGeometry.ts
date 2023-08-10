
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Box, Cone, Point3d, SolidPrimitive, Vector3d, YawPitchRollAngles } from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart } from "@itwin/core-backend";
import { GeometryPartProps, GeometryStreamProps } from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { convertInchToMeter, distanceBetweenPoint, fromSumOf, getSlopeAngle, toNumber } from "../../ConnectorUtils";
import { CategoryColor } from "../Categories";



export class TowerAttachmentBuilder {

    protected _builder: GeometryStreamBuilder;

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String, protected readonly antennaProperty: any) {
        this._builder = new GeometryStreamBuilder();
    }

    public createGeometry(attachment: any, attachmentNodes: any, sections: any): GeometryStreamProps {

        attachment.elements.forEach((attahcmentMember: any) => {
            const startNode = attachmentNodes.find((node: any) => {
                if(node["Id"]) {
                    if(node["Id"] == attahcmentMember['StartNodeID']) {
                        return node;
                    }
                    
                } else {
                    if(node["ID"] == attahcmentMember['StartNodeID']){
                        return node;
                    }
                }
            });
            const endNode = attachmentNodes.find((node: any) => {
                if(node["Id"]) {
                    if(node["Id"] == attahcmentMember['EndNodeID']){
                        return node;
                    }
                } else {
                    if(node["ID"] == attahcmentMember['EndNodeID']) {
                        return node;
                    }
                }
            });

            const section = sections.find((section: any) => section["ID"] == attahcmentMember['SectionId']);
            const name = "Attachment_" + attahcmentMember['AttachmentPropertyID'] + "_Member_" + attahcmentMember["ID"];
            console.log("name: ", name);
            console.log("section['Name']: ", section['Name']);
            if(section['Name'] === 'HollowCircleProfile') {
                this.createHollowCircleProfile(startNode, endNode, section, name);
            } else {
                this.createLShapeProfile(startNode, endNode, section, name);
            }

        })
        return this._builder.geometryStream;

    }

    private createHollowCircleProfile = (startNode: any, endNode: any, section: any, name: string) => {

        const radius = convertInchToMeter(section['Radius'])
        const pointA = Point3d.create(startNode['X'], startNode['Y'], startNode['Z']);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);

        console.log("pointA: ", JSON.stringify(pointA))
        console.log("pointB: ", JSON.stringify(pointB))
        console.log("radius", radius)

        const shape =  Cone.createAxisPoints(pointA, pointB, radius, radius, true);
        console.log("shape")
        console.log(JSON.stringify(shape));
        if(shape) {
            let shapeID = this.insertGeometryPart(name, shape)!;
            this._builder.appendGeometryPart3d(shapeID);
        }

    }

    private createLShapeProfile = (startNode: any, endNode: any, section: any, name: string) => {

        let length = Math.abs(distanceBetweenPoint(startNode, endNode));

        const shape =  this.createDgnShape(convertInchToMeter(section['Width']), length, convertInchToMeter(section['Thickness']));
        if(shape) {
            let shapeID = this.insertGeometryPart(name, shape)!;
            let origin = new Point3d(startNode['X'], startNode['Y'], startNode['Z']);

            let degree =  getSlopeAngle(startNode, endNode);
            if(Math.sign(degree) == -1) {
                degree = degree - 90;
            } else {
                degree = degree + 90;
            }

            this._builder.appendGeometryPart3d(shapeID, origin, YawPitchRollAngles.createDegrees(degree, 0, 0));
        }

    }

    private createDgnShape = (width: any, length: any, height: any) => {
        const boxWitdh = width;
        const boxLength = length;
        const boxHeight = height;

        const size = new Point3d(boxWitdh, boxLength, boxHeight);
        const center = new Point3d(boxWitdh / 2.0, boxLength / 2.0, boxHeight / 2.0);

        const vectorX = Vector3d.unitX();
        const vectorY = Vector3d.unitY();
        const baseX = size.x;
        const baseY = size.y;
        const topX = size.x;
        const topY = size.y;
        const halfHeight: number = size.z / 2;

        const baseCenter = new Point3d(center.x, center.y, center.z - halfHeight);
        const topCenter = new Point3d(center.x, center.y, center.z + halfHeight);


        let baseOrigin = fromSumOf(baseCenter, vectorX, baseX * -0.5); //* -0.5
        baseOrigin = fromSumOf(baseOrigin, vectorY, baseY * -0.5); // * -0.5

        let topOrigin = fromSumOf(topCenter, vectorX, baseX * -0.5); // * -0.5
        topOrigin = fromSumOf(topOrigin, vectorY, baseY * -0.5); // * -0.5

        return Box.createDgnBox(baseOrigin, vectorX, vectorY, topOrigin, baseX, baseY, topX, topY, true);
    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive): Id64String | undefined => {
        try {
            const geometryStreamBuilder = new GeometryStreamBuilder();
            const params = new GeometryParams(this._categoryId, "attachement");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Attachment);
            params.lineColor = params.fillColor;
            geometryStreamBuilder.appendGeometryParamsChange(params);
    
            geometryStreamBuilder.appendGeometry(primitive);
    
            const geometryPartProps: GeometryPartProps = {
                classFullName: GeometryPart.classFullName,
                model: this._definitionModelId,
                code: GeometryPart.createCode(this._imodel, this._definitionModelId, name),
                geom: geometryStreamBuilder.geometryStream,
            };

            console.log('geometryPartProps')
            console.log(JSON.stringify(geometryPartProps))
    
    
            return this._imodel.elements.insertElement(geometryPartProps);
        } catch(e) {
            console.log("Error while inserting attachment element")
            console.log(e)
        }
    }


}