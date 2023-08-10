import { GeometryPart, IModelDb } from "@itwin/core-backend";
import { Id64String } from "@itwin/core-bentley";
import { ColorDef, GeometryParams, GeometryPartProps, GeometryStreamBuilder} from "@itwin/core-common";
import { Gradient, ThematicGradientSettings, ThematicGradientSettingsProps, ThematicGradientMode, ThematicGradientColorScheme } from "@itwin/core-common";
import { Box, Cone, Point3d, SolidPrimitive, Vector3d } from "@itwin/core-geometry";
import { convertInchToMeter, distanceBetweenPoint, fromSumOf, getSlopeAngle, toNumber } from "../../../ConnectorUtils";
import { CategoryColor } from "../../Categories";


export class LegGeometry {

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: any) {

    }

    public createLShapeLeg(categoryId: Id64String, startNode: any, endNode: any, section: any, name: any): any {
        let length = Math.abs(distanceBetweenPoint(startNode, endNode));
        const baseShape = this.createDgnShape(convertInchToMeter(section['Depth']), convertInchToMeter(section['Thickness']), length);
        const verticalShape = this.createDgnShape(convertInchToMeter(section['Thickness']), convertInchToMeter(section['Depth']), length);
        if (baseShape && verticalShape) {
            const geometryStreamBuilder = new GeometryStreamBuilder();

            const params = new GeometryParams(this._categoryId, "l-shape");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Legs);
            params.lineColor = params.fillColor;
            geometryStreamBuilder.appendGeometryParamsChange(params);
            geometryStreamBuilder.appendGeometry(baseShape);
            geometryStreamBuilder.appendGeometry(verticalShape);

            const geometryPartProps: GeometryPartProps = {
                classFullName: GeometryPart.classFullName,
                model: this._definitionModelId,
                code: GeometryPart.createCode(this._imodel, this._definitionModelId, name),
                geom: geometryStreamBuilder.geometryStream,
            };

            return this._imodel.elements.insertElement(geometryPartProps);

        }
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


    public createLegShape = (startNode: any, endNode: any, section: any, name: string): any => {


        let radius = convertInchToMeter(section['Radius']);
        if (radius == 0) {
            radius = convertInchToMeter(section['Width']) / 2;
        }

        const zPointDifference = endNode['Z'] - startNode['Z'];


        const pointA = Point3d.create(startNode['X'], startNode['Y'], startNode['Z']);
        const pointB = Point3d.create(endNode['X'], endNode['Y'], endNode['Z']);

        const legShape = Cone.createAxisPoints(pointA, pointB, radius, radius, true);

        let legShapeID: Id64String = "";
        if (legShape) {
            legShapeID = this.insertGeometryPart(name, legShape)!;
        }
        return legShapeID;

    }

    private insertGeometryPart = (name: string, primitive: SolidPrimitive): Id64String | undefined => {
        try {
            const geometryStreamBuilder = new GeometryStreamBuilder();
            const params:GeometryParams = new GeometryParams(this._categoryId, "leg-cone-shape");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.Legs);
            params.lineColor = params.fillColor;
            const thematicOptions: ThematicGradientSettingsProps = {
                mode: ThematicGradientMode.Stepped,
                stepCount: 16,
                colorScheme: ThematicGradientColorScheme.Monochrome
    
            }
            params.gradient = Gradient.Symb.createThematic(ThematicGradientSettings.fromJSON(thematicOptions));
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
            console.log("Error while inserting Leg element");
            console.log(e)
        }
    }
}