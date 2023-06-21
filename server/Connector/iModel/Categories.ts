import { ColorByName } from "@itwin/core-common";

export enum Categories {
    ProjectData =  "ProjectData",
    Panels =  "Panels",
    Legs = "Legs",
    FaceBracing = "FaceBracing",
    PlanBracing = "PlanBracing",
    Mounts = "Mounts",
    Guys = "Guys",
    Attachments = "Attachments",
    Appurtenances = "Appurtenances",
    Poles = "Poles",
}

export enum CategoryColor {
    Panels = ColorByName.silver,
    Legs = ColorByName.silver,
    FaceBracing = ColorByName.silver,
    PlanBracing = ColorByName.silver,
    Guys = ColorByName.silver,
    Mounts = ColorByName.yellow,
    MountPipes = ColorByName.orange,
    Antenna = ColorByName.blue,
    AntennaDish = ColorByName.blue,
    Attachment = ColorByName.red,
    Appurtenance = ColorByName.green,
    Poles = ColorByName.lightSteelBlue,
}
