
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Box, Cone, Point3d, PolyfaceBuilder, SolidPrimitive, StrokeOptions, Vector3d, YawPitchRollAngles, LineString3d } from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart } from "@itwin/core-backend";
import { GeometryPartProps, GeometryStreamProps } from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { convertInchToFeet, convertInchToMeter, fromSumOf, mandateConvertInchToMeter, toNumber } from "../../ConnectorUtils";
import { CategoryColor } from "../Categories";



export class TowerAntennaBuilder {

    protected _builder: GeometryStreamBuilder;
    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String, protected readonly antennaProperty: any) {
        this._builder = new GeometryStreamBuilder();
    }

    private createDgnShape = (width: any, length: any, height: any): any => {
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

    private createConeShape = (name: string, startNode: any, endNode: any, antennaProperty: any): any => {

        const dishHeight = mandateConvertInchToMeter(this.antennaProperty['Depth']) / 2
        const dishRadius = mandateConvertInchToMeter(this.antennaProperty['Width']) / 2;

        let origin = new Point3d(startNode['X'], startNode['Y'], startNode['Z']*1 + (dishRadius)*1);

        const pointA = Point3d.create(0, 0, 0);
        const pointB = Point3d.create(0, 0, dishHeight);
        let shape =  Cone.createAxisPoints(pointA, pointB, dishRadius * .5, dishRadius, true);
        let pipe = LineString3d.create([[startNode['X'], startNode['Y'], 0], [startNode['X'], startNode['Y'], endNode['Z'] + 10]])

        if(shape) {
            let shapeId = this.insertGeometryPart(name, shape, CategoryColor.AntennaDish);
            // this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 90));
            if(shapeId) {
                this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 90));
                // this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(0, 0, 0));
                // this._builder.appendGeometry(pipe);
            }
        }
    }

    private constructBoxShape = (startNode: any, endNode: any, antennaProperties: any, name: any): any => {

        let boxWitdh: any = mandateConvertInchToMeter(antennaProperties['Width']);
        let boxLength: any = mandateConvertInchToMeter(antennaProperties['Depth']);
        let boxHeight: any = mandateConvertInchToMeter(antennaProperties['Height']);

        const baseShape = this.createDgnShape(boxWitdh, boxLength, boxHeight);

        if (baseShape) {
            let origin = new Point3d((boxWitdh / 2),(boxLength/ 2), 0);
            let shapeId = this.insertGeometryPart(name, baseShape, CategoryColor.Antenna, origin);
            return shapeId;
        }
    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive, color: any, origin?: any,): Id64String | null => {
        const geometryStreamBuilder = new GeometryStreamBuilder();
        const params = new GeometryParams(this._categoryId, "antenna");
        params.fillColor = ColorDef.fromTbgr(color);
        params.lineColor = params.fillColor;
        geometryStreamBuilder.appendGeometryParamsChange(params);
        if(origin)
            geometryStreamBuilder.setLocalToWorld3d(origin);

        geometryStreamBuilder.appendGeometry(primitive);

        const code = GeometryPart.createCode(this._imodel, this._definitionModelId, name);
        let geometryPartProps: GeometryPartProps = {
            classFullName: GeometryPart.classFullName,
            model: this._definitionModelId,
            code: code,
            geom: geometryStreamBuilder.geometryStream,
        };

        try {
            const element = this._imodel.elements.getElement<GeometryPart>(code, GeometryPart);
            if(element) {
                geometryPartProps.id = element.id;
                this._imodel.elements.updateElement(geometryPartProps);

                const elementAfterUpdate = this._imodel.elements.getElement<GeometryPart>(code, GeometryPart);
                return element.id;
            } else {
                return null;
            }
        } catch(e) {
            // console.log(`geometryPartProps error: Not found`);
            // console.log(e);
            return this._imodel.elements.insertElement(geometryPartProps);
        }
    }

    private createAntennaMember = (categoryId: Id64String, startNode: any, endNode: any, antennaProperties: any): any => {

        const name = "Antenna_" + antennaProperties['ID'];

        const options = StrokeOptions.createForFacets();
        options.needParams = true;
        options.needNormals = true;
        const builder = PolyfaceBuilder.create(options);

        let shapeElementID = null;
        shapeElementID = this.constructBoxShape(startNode, endNode, antennaProperties, name);

        let origin = new Point3d(startNode['X'],  startNode['Y'], startNode['Z']);
        if (shapeElementID) {
            this._builder.appendGeometryPart3d(shapeElementID, origin, YawPitchRollAngles.createDegrees(antennaProperties["AntennaAzmith"], 0, 0));
        }
    }


    public createGeometry(antennaElement: any, antennaNodes: any, sections: any): GeometryStreamProps {


        const startNodeID = antennaElement[0]['elements'][0]['StartNodeID'];
        const endNodeID = antennaElement[0]['elements'][0]['EndNodeID'];
        const sectionID = antennaElement[0]['elements'][0]['SectionID'];

        const startNode = antennaNodes.filter((node: any) => {
            if (node['ID'] == startNodeID) {
                return node;
            }
        })[0]
        const endNode = antennaNodes.filter((node: any) => {
            if (node['ID'] == endNodeID) {
                return node;
            }
        })[0];
        const section = sections.find((section: any) => section["ID"] == sectionID);
        const name = "Antenna_" + antennaElement[0]['elements'][0]['AntennaPropertyID'] + "_Member_" + antennaElement[0]['elements'][0]["ID"];

        let origin = new Point3d(startNode['X'], startNode['Y'], startNode['Z']);
        let shape = null;
        let degree = 0;
        if (this.antennaProperty['Type'] !== 'DISH') {
            this.createAntennaMember(this._categoryId, startNode, endNode, this.antennaProperty);
        } else {
            this.createConeShape(name, startNode, endNode, this.antennaProperty)
            
        }   

        return this._builder.geometryStream;

    }




}