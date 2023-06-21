import { GeometryPart, IModelDb } from "@itwin/core-backend";
import { Id64String } from "@itwin/core-bentley";
import { ColorDef, GeometryParams, GeometryPartProps, GeometryStreamBuilder } from "@itwin/core-common";
import { Box, Point3d, SolidPrimitive, Vector3d } from "@itwin/core-geometry";
import { convertInchToMeter, distanceBetweenPoint, fromSumOf } from "../../../ConnectorUtils";
import { CategoryColor } from "../../Categories";


export class PlanBracingMemberGeometry {

    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: any) {
        // this._builder = new PolyfaceBuilder();
    }

    public createGeometry(startNode: any, endNode: any, section: any, name: any): any {
        let baseShapePartID = this.constructLShape(startNode, endNode, section, name);
        if(baseShapePartID) {
            return baseShapePartID;
        }
    }

    private constructLShape = ( startNode: any, endNode: any, section: any, name: any): any => {

        let length = Math.abs(distanceBetweenPoint(startNode, endNode));

        let baseElementWidth = convertInchToMeter(section['Depth']) * -1;
        let baseElementLength = length;
        let baseElementHeight = convertInchToMeter(section['Thickness']);

        let verticalElementWidth = convertInchToMeter(section['Thickness']) * -1;
        let verticalElementLength = length;
        let verticalElementHeight = convertInchToMeter(section['Depth']) * -1;

        const baseShape = this.createDgnShape(baseElementWidth, baseElementLength, baseElementHeight);
        const verticalShape = this.createDgnShape(verticalElementWidth, verticalElementLength, verticalElementHeight);

        if (baseShape && verticalShape) {
            const geometryStreamBuilder = new GeometryStreamBuilder();

            const params = new GeometryParams(this._categoryId, "plan-l-shape");
            params.fillColor = ColorDef.fromTbgr(CategoryColor.PlanBracing);
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

    private createDgnShape = (width: any, length: any, height: any) : any => {
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


    // private insertGeometryPart = (definitionModelId: Id64String, name: string, primitive: SolidPrimitive): Id64String => {
    //     const geometryStreamBuilder = new GeometryStreamBuilder();
    //     const params = new GeometryParams(this._categoryId, "plan-t-shape");
    //     params.fillColor = ColorDef.fromTbgr(CategoryColor.PlanBracing);
    //     params.lineColor = params.fillColor;
    //     geometryStreamBuilder.appendGeometryParamsChange(params);

    //     geometryStreamBuilder.appendGeometry(primitive);

    //     const geometryPartProps: GeometryPartProps = {
    //         classFullName: GeometryPart.classFullName,
    //         model: definitionModelId,
    //         code: GeometryPart.createCode(this._imodel, definitionModelId, name),
    //         geom: geometryStreamBuilder.geometryStream,
    //     };


    //     return this._imodel.elements.insertElement(geometryPartProps);
    // }
}