import { SubjectProps, EcefLocationProps } from "@itwin/core-common";
import { queryDefinitionModel, queryPhysicalModel, queryTowerInformationGroup } from "./ConnectorGroupModelService";
import { TowerAntennaPropertyPhysicalElementService } from "./TowerAntennaPropertyPhysicalElementService";
import { TowerAppurtenancePropertyPhysicalElementService } from "./TowerAppurtenancePropertyPhysicalElementService";
import { TowerAttachmentPropertyPhysicalElementService } from "./TowerAttachmentPropertyPhysicalElementService";
import { TowerMountPipePropertyPhysicalElementService } from "./TowerMountPipePropertyPhysicalElementService";
import { TowerMountPropertyPhysicalElementService } from "./TowerMountPropertyPhysicalElementService";
import { TowerPanelPhysicalElementService } from "./TowerPanelPhysicalElementService";
import { TowerPolePropertyPhysicalElementService } from "./TowerPolePropertyPhysicalElementService";
import { IModelDb } from "@itwin/core-backend";
import { YawPitchRollAngles } from "@itwin/core-geometry";
import { TowerProjectDataPhysicalElementService } from "./TowerProjectDataPhysicalElementService";
import { TowerGuyPropertyPhysicalElementService } from "./TowerGuyPropertyPhysicalElementService";


export class TowerPhysicalElementService {

    private synchronizer: any;
    private jobSubject: any;
    private repositoryLinkId: any;
    private repositoryModelId: any;
    private data: any;
    private towerName: string;
    private definitaionModelId: string | undefined;
    private physicalModelId: string | undefined;
    public ecefLocationProps: EcefLocationProps | null;


    constructor(synchronizer: any, jobSubject: any, repositoryLinkId: any, data: any, repositoryModelId: any) {
        this.synchronizer = synchronizer;
        this.jobSubject = jobSubject;
        this.repositoryLinkId = repositoryLinkId;
        this.repositoryModelId = repositoryModelId;
        this.data = data;
        this.towerName = this.data['TowerInformation']?.["TowerName"];

        this.definitaionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
        this.physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);
        this.ecefLocationProps = null;
    }


    processTowerPanelProperties = () => {
        console.log("Processing Panels")
        if (this.data['PanelProperties']) {
            for (const panelIndex of Object.keys(this.data['PanelProperties'])) {
                const panelProperty = this.data["PanelProperties"][panelIndex];
                const definitaionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
                const physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);
                const towerInformationGroupId = queryTowerInformationGroup(this.synchronizer, this.jobSubject);

                const towerPanelPhysicalElements = new TowerPanelPhysicalElementService(this.synchronizer, this.jobSubject, panelProperty, this.data['Nodes'], this.data['Sections'], this.repositoryLinkId, definitaionModelId, physicalModelId);
                const panel = this.data['Panel'].find((panel: any) => {
                    if (panel['ID'] == panelProperty['PanelID']) {
                        return panel;
                    }
                });

                towerPanelPhysicalElements.processPanelPhysicalElementCreation(panel);

            }
        } else {
        }
    }

    processTowerMounts = () => {
        console.log("Processing Mounts")
        if (this.data['MountProperties']) {

            for (const mountPropertyIndex of Object.keys(this.data['MountProperties'])) {


                const mountProperty = this.data["MountProperties"][mountPropertyIndex];

                const definitaionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
                const physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);

                const mount = this.data["Mounts"].find((mount: any) => {
                    if (mount["ID"] == mountProperty["ID"]) {
                        return mount['elements']
                    }
                });

                if (mount) {
                    const towerMountPropertyPhysicalElement = new TowerMountPropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, definitaionModelId, physicalModelId, mountProperty, this.data['MountNodes'], this.data['Sections'])
                    towerMountPropertyPhysicalElement.processMount(mount)
                }


            }

        }
    }

    processTowerMountPipes = () => {
        console.log("Processing MountPipes")
        if (this.data['MountPipesProperties']) {

            for (const mountPipePropertyIndex of Object.keys(this.data['MountPipesProperties'])) {

                const mountProperties = this.data['MountProperties']
                const mountPipeProperty = this.data["MountPipesProperties"][mountPipePropertyIndex];

                const definitaionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
                const physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);

                const pipes: any[] = [];

                let nodes: any = null
                if(this.data["MountPipesNodes"]) {
                    nodes = this.data['MountPipesNodes'];
                }  else {
                    nodes = this.data['MountNodes'];
                }
                this.data["MountPipes"].find((mountPipe: any) => {
                    if (mountPipe.attributes["MountPipePropertyID"] == mountPipeProperty["ID"]) {
                        pipes.push(mountPipe.attributes);
                    }
                });

                if (pipes) {
                    const towerMountPropertyPhysicalElement = new TowerMountPipePropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, definitaionModelId, physicalModelId, mountPipeProperty, nodes, this.data['Sections'], mountProperties)
                    towerMountPropertyPhysicalElement.processMountPipes(pipes)
                }


            }

        }

    }

    processTowerAntennas = (noOfLegs: any) => {
        console.log("Processing Antennas")
        if (this.data['AntennaProperties']) {
            for (const antennaIndex of Object.keys(this.data['AntennaProperties'])) {
                let antennaProperty = this.data['AntennaProperties'][antennaIndex];
                const definitaionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
                const physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);

                const antennaElement = this.data['Antennas'].filter((antennaElement: any) => {
                    if (antennaElement['elements']) {
                        if (antennaElement['elements'][0]['AntennaPropertyID'] == antennaProperty['ID']) {
                            return antennaElement;
                        }
                    }
                });

                if (antennaElement.length > 0) {
                    let Standoff = parseFloat('0')
                    let MountProperty: any = null;
                    if(this.data['MountProperties']) {
                        MountProperty = this.data['MountProperties'].find((mountProperty: any) => {
                            return mountProperty['ID'] === antennaElement[0]['elements'][0]['MountID'];
                        });
                    }
                    if(MountProperty) {
                        Standoff = parseFloat(MountProperty['Standoff'])
                    }

                    // if (MountProperty) {
                    //     const Location = MountProperty['Location'];
                    //     const Azimuth = MountProperty['Azimuth'] * 1;


                    //     let legLocation = 0;
                    //     if (noOfLegs == 3) {
                    //         // if (Location === 'LegA') {
                    //         //     legLocation = 60;
                    //         // } else if (Location === 'LegB') {
                    //         //     legLocation = 180; // 45 + 90;
                    //         // } else if (Location === 'LegC') {
                    //         //     legLocation = 300; // 45 + 90 + 90;
                    //         // }
                    //         if (Location === 'LegA') {
                    //             legLocation = 0;
                    //         } else if (Location === 'LegB') {
                    //             legLocation = 120; // 45 + 90;
                    //         } else if (Location === 'LegC') {
                    //             legLocation = 240; // 45 + 90 + 90;
                    //         }
                    //         if (Location.includes('FaceA')) {
                    //             legLocation = 300;
                    //         } else if (Location.includes('FaceB')) {
                    //             legLocation = 60; // 45 + 90;
                    //         } else if (Location.includes('FaceC')) {
                    //             legLocation = 180; // 45 + 90 + 90;
                    //         }

                    //     } else {
                    //         // if (Location === 'LegA') {
                    //         //     legLocation = 45;

                    //         // } else if (Location === 'LegB') {
                    //         //     legLocation = 135; // 45 + 90;
                    //         // } else if (Location === 'LegC') {
                    //         //     legLocation = 225; // 45 + 90 + 90;
                    //         // } else if (Location === 'LegD') {
                    //         //     legLocation = 315; // 45 + 90 + 90 + 90;
                    //         // }

                    //         if (Location === 'LegA') {
                    //             legLocation = 0;
                    //         } else if (Location === 'LegB') {
                    //             legLocation = 90; // 45 + 90;
                    //         } else if (Location === 'LegC') {
                    //             legLocation = 180; // 45 + 90 + 90;
                    //         } else if (Location === 'LegD') {
                    //             legLocation = 270; // 45 + 90 + 90;
                    //         }
                    //         if (Location.includes('FaceA')) {
                    //             legLocation = 315;
                    //         } else if (Location.includes('FaceB')) {
                    //             legLocation = 45; // 45 + 90;
                    //         } else if (Location.includes('FaceC')) {
                    //             legLocation = 135; // 45 + 90 + 90;
                    //         } else if (Location.includes('FaceD')) {
                    //             legLocation = 225; // 45 + 90 + 90;
                    //         }
                    //     }


                    //     const antennaAzmith = (legLocation + Azimuth) * -1;

                    //     antennaProperty['AntennaAzmith'] = antennaAzmith;
                    // } else {
                    //     antennaProperty['AntennaAzmith'] = antennaProperty['Azimuth'];
                    // }
                    antennaProperty['Azimuth'] = antennaProperty['Azimuth'] * 1; 
                    antennaProperty['AntennaAzmith'] = antennaProperty['Azimuth'] * 1;
                    antennaProperty['Standoff'] = Standoff;

                    // console.log("antennaProperty");
                    // console.log(JSON.stringify(antennaProperty));


                    if (antennaElement) {
                        const towerAntennaPropertyPhysicalElement = new TowerAntennaPropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, definitaionModelId, physicalModelId, antennaProperty, this.data['AntennaNodes'], this.data['Sections'])
                        towerAntennaPropertyPhysicalElement.processAntennas(antennaElement)

                    }
                }

            }

        }
    }

    processTowerAttachments = () => {

        console.log("Processing Attachments")
        if (this.data['AttachmentProperties']) {

            for (const attachmentPropertyIndex of Object.keys(this.data['AttachmentProperties'])) {
                const attachmentProperty = this.data['AttachmentProperties'][attachmentPropertyIndex];
                const attahcment = this.data['Attachments'].find((attachment: any) => {
                    if (attachment['ID'] == attachmentProperty['ID']) {
                        return attachment;
                    }
                });
                if (attahcment && attahcment.elements) {
                    const towerAttachmentPropertyPhysicalElement = new TowerAttachmentPropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, this.definitaionModelId, this.physicalModelId, attachmentProperty, this.data['AttachmentNodes'], this.data['Sections'])
                    towerAttachmentPropertyPhysicalElement.processAttachment(attahcment)
                }
            }

        }

    }

    processTowerAppurtenances = () => {
        console.log("Processing Appurtenance")
        if (this.data['AppurtenanceProperties'] && this.data['AppurtenanceProperties'].length > 0) {
            const appurtenanceSections = this.data["LinearAppurtenancesSections"].filter((section: any) => section["ID"]);
            for (const appurtenancePropertyIndex of Object.keys(this.data['AppurtenanceProperties'])) {
                const appurtenanceProperty = this.data['AppurtenanceProperties'][appurtenancePropertyIndex];
                const appurtenance = this.data['Appurtenances'].find((appurtenance: any) => {
                    if (appurtenance['ID'] == appurtenanceProperty['ID']) {
                        return appurtenance;
                    }
                });
                if (appurtenance && appurtenance.elements) {
                    const towerAppurtenancePropertyPhysicalElement = new TowerAppurtenancePropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, this.definitaionModelId, this.physicalModelId, appurtenanceProperty, this.data['AppurtenanceNodes'], appurtenanceSections)
                    towerAppurtenancePropertyPhysicalElement.processAppurtenance(appurtenance)
                }
            }
        }

    }

    processTowerPoles = () => {
        console.log("Processing Poles")
        if (this.data['PoleProperties']) {
            for (const polePropertyIndex of Object.keys(this.data['PoleProperties'])) {
                const poleProperty = this.data['PoleProperties'][polePropertyIndex];
                const pole = this.data['Pole'].find((pole: any) => {
                    if (pole['PolePropertyID'] == poleProperty['PoleID']) {
                        return pole;
                    }
                });

                if (pole) {
                    const towerPolePropertyPhysicalElementService = new TowerPolePropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, this.definitaionModelId, this.physicalModelId, poleProperty, this.data['Nodes'], this.data['Sections'])
                    towerPolePropertyPhysicalElementService.processPole(pole);
                }

            }

        }
    }
    
    processProjectData = () => {
        if (this.data['ProjectData']) {
            console.log("Processing ProjectData")

            const projectDataService = new TowerProjectDataPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, this.definitaionModelId, this.physicalModelId);
            projectDataService.processProjectData(this.data['ProjectData'])


        }
    }

    processElementsForDelete = async() => {

        if(this.data['Elements']) {
            for (const attachmentPropertyIndex of Object.keys(this.data['Elements'])) {
                let element = this.data['Elements'][attachmentPropertyIndex]
                let imodel: IModelDb = this.synchronizer.imodel
                try {
                    await imodel.elements.deleteElement(element['ID']);
                } catch(e) {
                    console.log(`Error while deleting the element with ID: ${element['ID']}`);
                    console.log(e)
                }
            }
            return "Done";
        }

    }

    processTowerGuys = () => {
        console.log("Processing Guys")
        if (this.data['GuyProperties']) {

            for (const guyPropertyIndex of Object.keys(this.data['GuyProperties'])) {


                const guyProperty = this.data["GuyProperties"][guyPropertyIndex];

                const definitaionModelId = queryDefinitionModel(this.synchronizer, this.jobSubject);
                const physicalModelId = queryPhysicalModel(this.synchronizer, this.jobSubject);

                const guy = this.data["Guys"].find((guy: any) => {
                    if (guy["ID"] == guyProperty["ID"]) {
                        return guy['elements']
                    }
                });

                if (guy) {
                    const towerGuyPropertyPhysicalElement = new TowerGuyPropertyPhysicalElementService(this.synchronizer, this.jobSubject, this.repositoryLinkId, definitaionModelId, physicalModelId, guyProperty, this.data['GuyNodes'], this.data['Sections'])
                    towerGuyPropertyPhysicalElement.processGuy(guy)
                }


            }

        }
    }

}