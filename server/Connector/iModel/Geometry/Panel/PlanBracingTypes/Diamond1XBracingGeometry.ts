import { GeometryPart, IModelDb } from "@itwin/core-backend";
import { Id64String } from "@itwin/core-bentley";
import { ColorDef, GeometryParams, GeometryPartProps, GeometryStreamBuilder } from "@itwin/core-common";
import { Box, Point3d, SolidPrimitive, Vector3d } from "@itwin/core-geometry";
import { convertInchToMeter, distanceBetweenPoint, fromSumOf } from "../../../../ConnectorUtils";
import { CategoryColor } from "../../../Categories";


export class Diamond1XBracingGeometry {

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: any) {
        // this._builder = new PolyfaceBuilder();
    }

    public createGeometry(startNode: any, endNode: any, section: any, name: any) {
        let length = Math.abs(distanceBetweenPoint(startNode, endNode));
        let baseShapePartID: Id64String = "";

        const baseShape = this.createDgnShape(convertInchToMeter(section['Width']), length, convertInchToMeter(section['Thickness']));
        if (baseShape) {
            baseShapePartID = this.insertGeometryPart(this._definitionModelId, name, baseShape)!;
        }
        return baseShapePartID;
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


    private insertGeometryPart = (definitionModelId: Id64String, name: string, primitive: SolidPrimitive): Id64String | undefined => {
        try {
            const geometryStreamBuilder = new GeometryStreamBuilder();
            const params = new GeometryParams(this._categoryId, "plan-t-shape");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.PlanBracing);
            params.lineColor = params.fillColor;
            geometryStreamBuilder.appendGeometryParamsChange(params);
    
            geometryStreamBuilder.appendGeometry(primitive);
    
            const geometryPartProps: GeometryPartProps = {
                classFullName: GeometryPart.classFullName,
                model: definitionModelId,
                code: GeometryPart.createCode(this._imodel, definitionModelId, name),
                geom: geometryStreamBuilder.geometryStream,
            };
    
    
            return this._imodel.elements.insertElement(geometryPartProps);
        } catch(e) {
            console.log("Error while inserting the X bracing");
            console.log(e)
        }
    }
}