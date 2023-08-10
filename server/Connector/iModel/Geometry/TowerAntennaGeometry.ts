
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Box, Cone, Point3d, PolyfaceBuilder, SolidPrimitive, StrokeOptions, Vector3d, YawPitchRollAngles, LineString3d, LineSegment3d, Loop, LinearSweep } from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart } from "@itwin/core-backend";
import { ColorByName, GeometryPartProps, GeometryStreamProps } from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { convertFeetToMeter, convertInchToFeet, convertInchToMeter, fromSumOf, getAntennaAzimuth, mandateConvertInchToMeter, plotOffsetOnCoordintates, toNumber } from "../../ConnectorUtils";
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
        // let origin = new Point3d(startNode['X'], startNode['Y'], startNode['Z']);

        // console.log("dish Antenna startNode", JSON.stringify(startNode))
        // console.log("dish Antenna endNode", JSON.stringify(endNode))
        // console.log("dish Antenna origin", JSON.stringify(origin))

        const pointA = Point3d.create(0, 0, dishHeight); 
        const pointB = Point3d.create(0, 0, 0);
        let shape =  Cone.createAxisPoints(pointA, pointB, dishRadius * .5, dishRadius, true);
        console.log(`pointA: ${JSON.stringify(pointA)}`)
        console.log(`pointB: ${JSON.stringify(pointB)}`)
        console.log(`dishHeight: ${dishHeight}`)
        console.log(`dishRadius: ${dishRadius}`)

        if(shape) {
            console.log("shape created")
            let shapeId = this.insertGeometryPart(name, shape, CategoryColor.AntennaDish);
            console.log("got shape id")
            // this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 90));
            if(shapeId) {
                this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, -90));
                // this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(0, 0, 0));
                // this._builder.appendGeometry(pipe);
            }
        }
    }

    private constructBoxShape = (startNode: any, endNode: any, antennaProperty: any, name: any): any => {

        let boxWitdh: any = mandateConvertInchToMeter(antennaProperty['Width']);
        let boxLength: any = mandateConvertInchToMeter(antennaProperty['Depth']);
        let boxHeight: any = mandateConvertInchToMeter(antennaProperty['Height']);

        const baseShape = this.createDgnShape(boxWitdh, boxLength, boxHeight);

        if (baseShape) {
            let origin = new Point3d((boxWitdh / 2),(boxLength/ 2), 0);
            let shapeId = this.insertGeometryPart(name, baseShape, CategoryColor.Antenna, origin);
            return shapeId;
        }
    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive, color: any, origin?: any,): Id64String | undefined => {
        try {
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
                    return this._imodel.elements.insertElement(geometryPartProps);
                }
            } catch(e) {
                // console.log(`geometryPartProps error: Not found`);
                // console.log(e);
                return this._imodel.elements.insertElement(geometryPartProps);
            }
        } catch(e) {
            console.log("Error while inserting antenna element")
            console.log(e)
        }
    }


    public createGeometry(antennaElement: any, antennaNodes: any, sections: any): GeometryStreamProps {


        const startNodeID = antennaElement[0]['elements'][0]['StartNodeID'];
        const endNodeID = antennaElement[0]['elements'][0]['EndNodeID'];
        // const sectionID = antennaElement[0]['elements'][0]['SectionID'];

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


        this.antennaProperty["AntennaAzmith"] = getAntennaAzimuth(startNode, this.antennaProperty)

        console.log(`Dipole this.antennaProperty["AntennaAzmith"]: ${this.antennaProperty["AntennaAzmith"]}`)
        console.log(`type of angle: ${typeof this.antennaProperty["AntennaAzmith"]}`)


        console.log("antennaProperty: ", JSON.stringify(this.antennaProperty))
        console.log("startNode: ", JSON.stringify(startNode))
        console.log("endNode: ", JSON.stringify(endNode))

        let LateralOffset = parseFloat(this.antennaProperty['LateralOffset'])
        if (LateralOffset != 0) {
            LateralOffset =  parseFloat(convertFeetToMeter(LateralOffset - this.antennaProperty['Standoff']).toFixed(3))
        }

        let HorizontalOffset = parseFloat('0')
        // let HorizontalOffset = parseFloat(this.antennaProperty['HorizontalOffset']);
        // if (HorizontalOffset != 0) {
        //     HorizontalOffset =  parseFloat(convertFeetToMeter(HorizontalOffset - this.antennaProperty['Standoff']).toFixed(3))
        // }

        const newPoint = plotOffsetOnCoordintates(startNode, LateralOffset, HorizontalOffset)
        console.log(`newPoint: ${newPoint}`)
        
        if(newPoint) {
            startNode['X'] = newPoint[0];
            startNode['Y'] = newPoint[1];
            endNode['X'] = newPoint[0];
            endNode['Y'] = newPoint[1];
        }

        console.log("HHH startNode: ", JSON.stringify(startNode))
        console.log("endNode: ", JSON.stringify(endNode))

        const name = "Antenna_" + antennaElement[0]['elements'][0]['AntennaPropertyID'] + "_Member_" + antennaElement[0]['elements'][0]["ID"];

        if (this.antennaProperty['Type'] !== 'DISH') {
            if(this.antennaProperty['Type'] == 'DIPOLE') {
                this.createDipoleAntenna(this._categoryId, startNode, endNode, this.antennaProperty);
            } else {
                this.createAntennaMember(this._categoryId, startNode, endNode, this.antennaProperty);
            }
        } else {
            this.createConeShape(name, startNode, endNode, this.antennaProperty)
            
        }   

        return this._builder.geometryStream;

    }

    private createPanelAntennaMember = (categoryId: Id64String, startNode: any, endNode: any, antennaProperty: any) => {

        // console.log("inside createPanelAntennaMember =====");

        const name = "Antenna_" + antennaProperty['ID'];
        // console.log(`AntennaName: ${name}`);
        // console.log("antennaProperty: ", antennaProperty)
        // console.log("startNode: ", startNode)

        const options = StrokeOptions.createForCurves();
        options.needParams = true;
        options.needNormals = true;
        const builder = PolyfaceBuilder.create(options);

        let boxWitdh = mandateConvertInchToMeter(antennaProperty['Width']) + 0.4;
        let boxLength = mandateConvertInchToMeter(antennaProperty['Depth']) + 0.4;
        let boxHeight = mandateConvertInchToMeter(antennaProperty['Height']);

        // const panelAntennaShape =  LinearSweep.create(ParityRegion.create(path, path1), Vector3d.create(0, 0,boxHeight), true)!;

        let noOfFraction = 5;
        let widthfractionValue = parseFloat((boxWitdh / noOfFraction).toFixed(4));
        let depthfractionValue = parseFloat((boxLength / 5).toFixed(4));

        let pointA = Point3d.create(0, 0, 0);
        let pointB = Point3d.create(boxWitdh * -1, 0, 0);
        let pointC = Point3d.create(boxWitdh * -1, (depthfractionValue*4) * -1, 0);
        let pointD = Point3d.create((widthfractionValue*4) *-1, boxLength *-1, 0);
        let pointE = Point3d.create((widthfractionValue*1) * -1, boxLength *-1, 0);
        let pointF = Point3d.create(0, (depthfractionValue*4) *-1, 0)
        let pointG = Point3d.create(0, 0, 0);

        const loop = Loop.create(LineSegment3d.create(pointA, pointB), LineSegment3d.create(pointB, pointC), LineSegment3d.create(pointC, pointD), LineSegment3d.create(pointD, pointE), LineSegment3d.create(pointE, pointF), LineSegment3d.create(pointF, pointA));
        const panelAntennaShape = LinearSweep.create(loop, Vector3d.create(0, 0, boxHeight), true)!;

        let shapeElementID = null;

        if (panelAntennaShape) {
            let shapeorigin = new Point3d(- (boxWitdh / 2), 0, 0);
            let shapeId = this.insertGeometryPart(name, panelAntennaShape, CategoryColor.Antenna, shapeorigin);

            let origin = new Point3d(startNode['X'],  startNode['Y'], startNode['Z']);
            console.log("origin: ", JSON.stringify(origin))
            if (shapeId) {
                this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0));
            }
        }
        return this._builder.geometryStream;


    }


    private createAntennaMember = (categoryId: Id64String, startNode: any, endNode: any, antennaProperty: any): any => {

        const name = "Antenna_" + antennaProperty['ID'];

        // console.log('antennaProperty')
        // console.log(antennaProperty)
        // console.log('startNode')
        // console.log(startNode)

        const options = StrokeOptions.createForFacets();
        options.needParams = true;
        options.needNormals = true;
        const builder = PolyfaceBuilder.create(options);

        let shapeElementID = null;
        shapeElementID = this.constructBoxShape(startNode, endNode, antennaProperty, name);

        let origin = new Point3d(startNode['X'],  startNode['Y'], startNode['Z']);
        if (shapeElementID) {
            this._builder.appendGeometryPart3d(shapeElementID, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0));
        }
    }



    public createLineGeometry(categoryId: Id64String, startNode: any, endNode: any): GeometryStreamProps {

        const params = new GeometryParams(categoryId, "tower-antenna-element");

        const options = StrokeOptions.createForFacets();
        options.needParams = true;
        options.needNormals = true;
        const builder = PolyfaceBuilder.create(options);

        console.log("insife createLineGeometry")
        const pointA = Point3d.create(startNode['X'], startNode['Y'], 0);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);
        const line = LineString3d.create(pointA, pointB);
        params.fillColor = ColorDef.fromTbgr(ColorByName.black);
        params.lineColor = params.fillColor;
        this._builder.appendGeometryParamsChange(params);

        this._builder.appendGeometry(line);

        return this._builder.geometryStream;

    }

    private createDipoleAntenna = (categoryId: Id64String, startNode: any, endNode: any, antennaProperties: any) => {
        const name = "Antenna_" + antennaProperties['ID'];
        const options = StrokeOptions.createForFacets();
        options.needParams = true;
        options.needNormals = true;
        let shapeElementID = null;
        return this.constructDipoleShape(categoryId, startNode, endNode, antennaProperties, name);


    }

    private constructDipoleShape = (categoryId: Id64String, startNode: any, endNode: any, antennaProperty: any, name: any) => {
        
        const dishHeight = mandateConvertInchToMeter(antennaProperty['Height']);
        const dishDepth = mandateConvertInchToMeter(antennaProperty['Depth']);
        // const dishRadius = mandateConvertInchToMeter(antennaProperty['Width']) / 2;
        const dishRadius = dishDepth / 2;

        let firstHalf = dishHeight / 2
        let secondHalf = firstHalf / 2
        let thirdHalf = secondHalf / 2

        let origin = new Point3d(startNode['X'], startNode['Y'], startNode['Z']*1 + (dishRadius)*1);

        const pointA = Point3d.create(0, 0, dishHeight); 
        const pointB = Point3d.create(0, 0, 0);
        let shape =  Cone.createAxisPoints(pointA, pointB, dishRadius, dishRadius, true);

        // let pole1 = Cone.createAxisPoints(Point3d.create(dishRadius, 0, firstHalf), Point3d.create(3, 0, firstHalf), dishRadius, dishRadius, true);
        // let pole2 = Cone.createAxisPoints(Point3d.create(dishRadius, 0, secondHalf), Point3d.create(2, 0, secondHalf), dishRadius, dishRadius, true);
        // let pole3 = Cone.createAxisPoints(Point3d.create(dishRadius, 0, firstHalf + secondHalf), Point3d.create(2, 0, firstHalf + secondHalf), dishRadius, dishRadius, true);
        let horizontalBarRadius = dishRadius * .3;
        // let pole4 = Cone.createAxisPoints(Point3d.create(0, dishRadius, thirdHalf), Point3d.create(0, -.5, thirdHalf), horizontalBarRadius, horizontalBarRadius, true);
        // let pole5 = Cone.createAxisPoints(Point3d.create(0, dishRadius, thirdHalf + secondHalf ), Point3d.create(0, -.5, thirdHalf + secondHalf), horizontalBarRadius, horizontalBarRadius, true);
        // let pole6 = Cone.createAxisPoints(Point3d.create(0, dishRadius, thirdHalf + firstHalf ), Point3d.create(0, -.5, thirdHalf + firstHalf), horizontalBarRadius, horizontalBarRadius, true);
        // let pole7 = Cone.createAxisPoints(Point3d.create(0, dishRadius, thirdHalf + firstHalf + secondHalf ), Point3d.create(0, -.5, thirdHalf + firstHalf + secondHalf), horizontalBarRadius, horizontalBarRadius, true);
        let horizontalBar = Cone.createAxisPoints(Point3d.create(0, -1 * dishRadius, 0), Point3d.create(0, (-1 * dishRadius + (-.5)), 0), horizontalBarRadius, horizontalBarRadius, true);
        let horizontalPoleshape = null;
        if(horizontalBar) {
            const geometryStreamBuilder = new GeometryStreamBuilder();

            const params = new GeometryParams(categoryId, "antenna-dipole-horizontal-bar");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Antenna);
            params.lineColor = params.fillColor;
            geometryStreamBuilder.appendGeometryParamsChange(params);
            geometryStreamBuilder.appendGeometry(horizontalBar);

            const geometryPartProps: GeometryPartProps = {
                classFullName: GeometryPart.classFullName,
                model: this._definitionModelId,
                code: GeometryPart.createCode(this._imodel, this._definitionModelId, name+'-horizontal-bar'),
                geom: geometryStreamBuilder.geometryStream,
            };

            horizontalPoleshape =  this._imodel.elements.insertElement(geometryPartProps);
        }
        

        let verticalElementRadius = dishRadius * .5;
        let verticalElementHeight = secondHalf - thirdHalf
        let verticalElementShape = Cone.createAxisPoints(Point3d.create(0, ((-1 * dishRadius) + (-.5)), 0), Point3d.create(0, ((-1 * dishRadius) + (-.5)), verticalElementHeight), verticalElementRadius, verticalElementRadius, true);
        let verticalElementShapeId = null;
        if(verticalElementShape) {
            const geometryStreamBuilder = new GeometryStreamBuilder();

            const params = new GeometryParams(categoryId, "antenna-dipole-vertical-element");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Antenna);
            geometryStreamBuilder.appendGeometryParamsChange(params);
            geometryStreamBuilder.appendGeometry(verticalElementShape);

            const geometryPartProps: GeometryPartProps = {
                classFullName: GeometryPart.classFullName,
                model: this._definitionModelId,
                code: GeometryPart.createCode(this._imodel, this._definitionModelId, name+'-vertical-element'),
                geom: geometryStreamBuilder.geometryStream,
            };

            verticalElementShapeId =  this._imodel.elements.insertElement(geometryPartProps);
        }

        if(shape && horizontalPoleshape && verticalElementShapeId) {

            let shapeId = null

            const geometryStreamBuilder = new GeometryStreamBuilder();

            
            // geometryStreamBuilder.appendGeometry(pole4);
            // geometryStreamBuilder.appendGeometry(pole5);
            // geometryStreamBuilder.appendGeometry(pole6);
            // geometryStreamBuilder.appendGeometry(pole7);
   

            const params = new GeometryParams(categoryId, "antenna-dipole");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Antenna);
            geometryStreamBuilder.appendGeometryParamsChange(params);
            geometryStreamBuilder.appendGeometry(shape);

            const geometryPartProps: GeometryPartProps = {
                classFullName: GeometryPart.classFullName,
                model: this._definitionModelId,
                code: GeometryPart.createCode(this._imodel, this._definitionModelId, name),
                geom: geometryStreamBuilder.geometryStream,
            };

            shapeId =  this._imodel.elements.insertElement(geometryPartProps);
            if(shapeId) {
                this._builder.appendGeometryPart3d(shapeId, origin, YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0));
            }
            this._builder.appendGeometryPart3d(horizontalPoleshape, Point3d.create(origin.x, origin.y, origin.z + thirdHalf), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(verticalElementShapeId, Point3d.create(origin.x, origin.y, ((origin.z + thirdHalf) - (verticalElementHeight / 2)) ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(horizontalPoleshape, Point3d.create(origin.x, origin.y, origin.z + thirdHalf + secondHalf ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(verticalElementShapeId, Point3d.create(origin.x, origin.y, ((origin.z + thirdHalf + secondHalf)- (verticalElementHeight / 2)) ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(horizontalPoleshape, Point3d.create(origin.x, origin.y, origin.z + thirdHalf + firstHalf ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(verticalElementShapeId, Point3d.create(origin.x, origin.y, ((origin.z + thirdHalf + firstHalf) - (verticalElementHeight / 2)) ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(horizontalPoleshape, Point3d.create(origin.x, origin.y, origin.z + thirdHalf + firstHalf + secondHalf ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
            this._builder.appendGeometryPart3d(verticalElementShapeId, Point3d.create(origin.x, origin.y, ((origin.z + thirdHalf + firstHalf + secondHalf) - (verticalElementHeight / 2)) ), YawPitchRollAngles.createDegrees(antennaProperty["AntennaAzmith"], 0, 0))
        }

        return this._builder.geometryStream;
    }

}