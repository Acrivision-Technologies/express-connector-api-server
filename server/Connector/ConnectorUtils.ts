/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as fs from "fs";
import { IModelHost, IModelHostConfiguration } from "@itwin/core-backend";
import { KnownLocations } from "./KnownLocations";
import { BackendIModelsAccess } from "@itwin/imodels-access-backend";
import { Point3d, Vector3d } from "@itwin/core-geometry";
import { ClientAuthorization } from "./ClientAuthorization";
import { Config } from "./Config";
// import { ServiceAuthorizationClient, ServiceAuthorizationClientConfiguration } from "@itwin/service-authorization"

/** Loads the provided `.env` file into process.env */
function loadEnv(envFile: string) {
  if (!fs.existsSync(envFile))
    return;

  const dotenv = require("dotenv"); // eslint-disable-line @typescript-eslint/no-var-requires
  const dotenvExpand = require("dotenv-expand"); // eslint-disable-line @typescript-eslint/no-var-requires
  const envResult = dotenv.config({ path: envFile });

  if (envResult.error) {
    throw envResult.error;
  }

  dotenvExpand(envResult);
}

export async function startBackend(): Promise<void> {
  loadEnv(path.join(__dirname, "..", ".env"));
  const config = new IModelHostConfiguration();
  // config.concurrentQuery.concurrent = 4; // for test restrict this to two threads. Making closing connection faster
  // NEEDSWORK how do we do this in imodel js V3.x?
  config.cacheDir = KnownLocations.outputDir;

  // config.hubAccess = 
  config.hubAccess = new BackendIModelsAccess();
  await IModelHost.startup(config);
}

export async function shutdownBackend() {
  await IModelHost.shutdown();
}


export const distanceBetweenPoint = (p: any, q: any) => {
  const formula = (Math.pow((q.X - p.X), 2)) + (Math.pow(q.Y - p.Y, 2) + Math.pow(q.Z - p.Z, 2));
  const result = Math.sqrt(formula);

  return result;
}

export const getSlopeAngle = (s1: any, s2: any) => {
  return Math.atan(((s2.Y) - (s1.Y)) / (s2.X - s1.X)) * 180 / Math.PI;
}

export const fromSumOf = (p: Point3d, v: Vector3d, scale: number): Point3d => {
  const result = new Point3d();
  result.x = p.x + v.x * scale;
  result.y = p.y + v.y * scale;
  result.z = p.z + v.z * scale;
  return result;
}


export function toNumber(val: any) {
  let value = 0.0;
  if (val === undefined)
    value = 0.0;
  if (typeof (val) == "number")
    value = val;
  if (typeof (val) == "string")
    value = parseFloat(val);

  return value;
}

export function convertFeetToMeter(val: any): number {
  let meterUnit = 3.281;
  let value: any = 0.0;
  if (typeof (val) == "number")
    value = val;
  if (typeof (val) == "string")
    value = parseFloat(val);

  return value / meterUnit;
}

export function convertInchToMeter(val: any): number {
  let meterUnit = 39.3701;
  let value: any = 0.0;
  if (typeof (val) == "number")
    value = val;
  if (typeof (val) == "string")
    value = parseFloat(val);

  return value / meterUnit;
}

export function mandateConvertInchToMeter(val: any): number {
  let meterUnit = 39.3701;
  let value: any = 0.0;
  if (typeof (val) == "number")
    value = val;
  if (typeof (val) == "string")
    value = parseFloat(val);

  return parseFloat((value / meterUnit).toFixed(4));
}

export function mandateConvertFeetToMeter(val: any): number {
  let meterUnit = 3.281;
  let value: any = 0.0;
  if (typeof (val) == "number")
    value = val;
  if (typeof (val) == "string")
    value = parseFloat(val);

  return parseFloat((value / meterUnit).toFixed(4));
}


export const convertParseExpotentialToDecimal = (value: any) => {
  return parseFloat(value).toFixed(4);
}


export const transformNodeCoordinates = (node: any) => {
  let attributes = { ...node };
  attributes['X'] = toNumber(convertParseExpotentialToDecimal(node['X']));
  attributes['Y'] = toNumber(convertParseExpotentialToDecimal(node['Z'])) * -1;
  attributes['Z'] = toNumber(convertParseExpotentialToDecimal(node['Y']));

  return attributes;

}

export function convertInchToFeet(val: any): number {
  let feetUnit = 12;
  // let feetUnit = 1;
  let value: any = 0.0;
  if (typeof (val) == "number")
    value = val;
  if (typeof (val) == "string")
    value = parseFloat(val);


  return value / feetUnit;
}