/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { ClassRegistry, Schema, Schemas } from "@itwin/core-backend";
import { KnownLocations } from "./KnownLocations";
import * as towerConnectorGroupInformationModel from "./iModel/SchemaClasses/TowerConnectorGroupInformationModel";
import * as towerInformationModel from "./iModel/SchemaClasses/TowerInformation";
import * as towerProjectDataModel from "./iModel/SchemaClasses/TowerProjectDataElement";
import * as towerPanelElement from "./iModel/SchemaClasses/TowerPanelElement";
import * as towerMountElement from "./iModel/SchemaClasses/TowerMountElement";
import * as towerGuyElement from "./iModel/SchemaClasses/TowerGuyElement";
import * as towerMountPipeElement from "./iModel/SchemaClasses/TowerMountPipeElement";
import * as towerAntennaElement from "./iModel/SchemaClasses/TowerAntennaElement";
import * as towerAttachementElement from "./iModel/SchemaClasses/TowerAttachementElement";
import * as towerAppurtenanceElement from "./iModel/SchemaClasses/TowerAppurtenanceElement";
import * as towerPoleElement from "./iModel/SchemaClasses/TowerPoleElement";

/** Schema class for the TowerConnector domain.
 * @beta
 */
export class ConnectorSchema extends Schema {
  public static override get schemaName(): string { return "OpenTower"; }
  public static get schemaFilePath(): string {
    return path.join(KnownLocations.assetsDir, "iModelHubSchema/Connector.ecschema.xml");
  }
  public static registerSchema() {
    if (this !== Schemas.getRegisteredSchema(this.schemaName)) {
      Schemas.unregisterSchema(this.schemaName);
      Schemas.registerSchema(this);

      ClassRegistry.registerModule(towerConnectorGroupInformationModel, this);
      ClassRegistry.registerModule(towerProjectDataModel, this);
      ClassRegistry.registerModule(towerInformationModel, this);
      ClassRegistry.registerModule(towerPanelElement, this);
      ClassRegistry.registerModule(towerMountElement, this);
      ClassRegistry.registerModule(towerGuyElement, this);
      ClassRegistry.registerModule(towerMountPipeElement, this);
      ClassRegistry.registerModule(towerAntennaElement, this);
      ClassRegistry.registerModule(towerAttachementElement, this);
      ClassRegistry.registerModule(towerAppurtenanceElement, this);
      ClassRegistry.registerModule(towerPoleElement, this);
    }
  }
}
