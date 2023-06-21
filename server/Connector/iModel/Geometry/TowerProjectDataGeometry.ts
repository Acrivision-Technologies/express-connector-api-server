
/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Box, Cone, Point3d, PolyfaceBuilder, SolidPrimitive, YawPitchRollAngles, LineString3d } from "@itwin/core-geometry";
import type { IModelDb } from "@itwin/core-backend";
import { GeometryPart } from "@itwin/core-backend";
import { GeometryPartProps, GeometryStreamProps } from "@itwin/core-common";
import { ColorDef, GeometryParams, GeometryStreamBuilder, Cartographic, Frustum, EcefLocationProps } from "@itwin/core-common";
import type { Id64String } from "@itwin/core-bentley";
import { CategoryColor } from "../Categories";
import { convertInchToMeter } from "@/Connector/ConnectorUtils";



export class TowerProjectDataBuilder {

    protected _builder: GeometryStreamBuilder;
    constructor(protected readonly _imodel: IModelDb, protected readonly _definitionModelId: Id64String, protected readonly _categoryId: Id64String) {
        this._builder = new GeometryStreamBuilder();
    }



    private insertGeometryPart = (name: string, primitive: SolidPrimitive, origin?: any): Id64String | null => {
        const geometryStreamBuilder = new GeometryStreamBuilder();
        const params = new GeometryParams(this._categoryId, "antenna");
        params.fillColor = ColorDef.fromTbgr(CategoryColor.Antenna);
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


    public createGeometry(projectData: any): GeometryStreamProps {


        // const ecefLocationProps: EcefLocationProps = {
        //     origin: { x:  projectData['Site_Lattitude'], y: projectData['Site_Longitude'], z: projectData['Site_Altitude']},
        //     orientation: YawPitchRollAngles.createDegrees(0, 0, 0),
        //     cartographicOrigin: { latitude:  projectData['Site_Lattitude'], longitude: projectData['Site_Longitude'], height: projectData['Site_Altitude']},
        // }
        // this._imodel.setEcefLocation(ecefLocationProps);
        // console.log('this._imodel.ecefLocation');
        // console.log(this._imodel.ecefLocation);
        // return "Done";
        // convert extents to an 8 point array
        // const pts: any =  Frustum.fromRange(this._imodel.projectExtents).points;
        // const shape: Cartographic[] = [];
        // for (let i = 0; i < 4; ++i) {
        //     const ecefToSpatial = this._imodel.ecefToSpatial(pts[i]);
        //     shape[i] = this._imodel.spatialToCartographicFromEcef(ecefToSpatial);
        //     if(shape[i]) {
        //         shape[i].latitude = pts[i][0];
        //         shape[i].longitude = pts[i][1];
        //         shape[i].height = pts[i][2];
        //     }
        // }

        // shape[4] = shape[0];
        // const lineString: LineString3d = LineString3d.create(Point3d.create(0, 0, 0), Point3d.create(0, 0, 10))
        // this._builder.appendGeometry(lineString);
        return this._builder.geometryStream;

    }




}