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

export const plotOffsetOnCoordintates = (startPoint: any, LateralOffset: any, HorizontalOffset?: any) => {

	const centerPoint = Point3d.create(0, 0, startPoint['Z'])
	const discretePoint = Point3d.create(startPoint['X'], startPoint['Y'], startPoint['Z'])
	console.log("inside plotOffsetOnCoordintates")
	console.log(`centerPoint: ${JSON.stringify(centerPoint)}`)
	console.log(`discretePoint: ${JSON.stringify(discretePoint)}`)

	let result = null;
	// if(LateralOffset !== 0) {
	const { firstPoint, secondPoint } = constructPerpendicularOnLine(centerPoint, discretePoint)
	console.log("----")
	console.log(firstPoint, secondPoint)
	if (LateralOffset !== 0) {
		console.log("+++++++++++++++")
		if (LateralOffset < 0) {
			console.log(`LateralOffset: ${LateralOffset} is less than zero`)
			result = plotPointAtDistanceOnLine(discretePoint, firstPoint, LateralOffset)
		} else {
			console.log(`LateralOffset: ${LateralOffset} is greater than zero`)
			result = plotPointAtDistanceOnLine(discretePoint, secondPoint, LateralOffset)
		}
		// console.log(`result:`, result)
	}

	// if(HorizontalOffset && HorizontalOffset !== 0) {
	// 	let leftPhase = null
	// 	let centerPhase = null
	// 	let endPhase = null
	// 	console.log("inside HorizontalOffset case")
	// 	console.log(`result: ${result}`)
	// 	if(!result) {
	// 		result = [discretePoint['x'], discretePoint['y']];
	// 		leftPhase = centerPoint;
	// 		centerPhase = discretePoint
	// 		endPhase = Point3d.create(result[0] * 2, result[1] * 2)
	// 	} else {
	// 		let lateralPerpendicularPoint = Point3d.create(result[0], result[1])
	// 		const { firstPoint, secondPoint } = constructPerpendicularOnLine(discretePoint, lateralPerpendicularPoint)
	// 		leftPhase = firstPoint
	// 		centerPhase = lateralPerpendicularPoint
	// 		endPhase = secondPoint
	// 	}
	// 	console.log("HorizontalOffset++: ", HorizontalOffset)
	// 	console.log(` HorizontalOffset leftPhase: ${JSON.stringify(leftPhase)}`)
	// 	console.log(` HorizontalOffset centerPhase: ${JSON.stringify(centerPhase)}`)
	// 	console.log(` HorizontalOffset endPhase: ${JSON.stringify(endPhase)}`)
	// 	if(HorizontalOffset < 0) {
	// 		console.log(`HorizontalOffset: ${HorizontalOffset} is less than zero`)
	//         result = plotPointAtDistanceOnLine(centerPhase, leftPhase, HorizontalOffset)
	// 	} else {
	// 		console.log(`HorizontalOffset: ${HorizontalOffset} is greater than zero`)
	//         result = plotPointAtDistanceOnLine(centerPhase, endPhase, HorizontalOffset)
	// 	}

	// 	console.log(`HorizontalOffset result: `, JSON.stringify(result))
	// }
	return result;
}

export const constructPerpendicularOnLine = (startPoint: Point3d, endPoint: Point3d, length?: number) => {
	// console.log(`startPoint: ${JSON.stringify(startPoint)}`)
	// console.log(`endPoint: ${JSON.stringify(endPoint)}`)
	let slope = parseFloat('0');
	let yDiff = (endPoint['y'] - startPoint['y'])
	let xDiff = (endPoint['x'] - startPoint['x'])

	const lengthToUse = length ? length : 1.5

	// console.log(`yDiff: ${yDiff}`)
	// console.log(`xDiff: ${xDiff}`)

	let firstPoint = null;
	let secondPoint = null;
	if (xDiff != slope) {
		slope = yDiff / xDiff;
		if (Math.abs(slope) != parseFloat("0")) {
			let perSlope = - (1 / slope)
			let cos = Math.cos(Math.atan(perSlope))
			let sin = Math.sin(Math.atan(perSlope))
			firstPoint = Point3d.create(endPoint['x'] + lengthToUse * cos, endPoint['y'] + lengthToUse * sin, endPoint['z'])
			secondPoint = Point3d.create(endPoint['x'] - lengthToUse * cos, endPoint['y'] - lengthToUse * sin, endPoint['z'])
			// return { firstPoint, secondPoint }
		} else {
			// console.log(`yDiff is zero`)
			firstPoint = Point3d.create(endPoint['x'], endPoint['y'] + lengthToUse, endPoint['z'])
			secondPoint = Point3d.create(endPoint['x'], endPoint['y'] - lengthToUse, endPoint['z'])
			// return { firstPoint, secondPoint }
		}
	} else {
		// console.log(`xDiff is zero`)
		firstPoint = Point3d.create(endPoint['x'] + lengthToUse, endPoint['y'], endPoint['z'])
		secondPoint = Point3d.create(endPoint['x'] - lengthToUse, endPoint['y'], endPoint['z'])
	}

	const result = determinePointSideOnLine(endPoint, startPoint, firstPoint)
	console.log(`determinePointSideOnLine result: ${result}`)
	if (result > 0) {
		return { "firstPoint": secondPoint, "secondPoint": firstPoint }
	} else {
		return { firstPoint, secondPoint }
	}


	// console.log("original coordinates")
	// console.log(`firstPoint: ${JSON.stringify(firstPoint)}`)
	// console.log(`secondPoint: ${JSON.stringify(secondPoint)}`)
	// if((firstPoint.x < secondPoint.x && firstPoint.y > secondPoint.y) || (firstPoint.x > secondPoint.x && firstPoint.y < secondPoint.y)) {
	// 	firstPoint = firstPoint
	// 	secondPoint = secondPoint
	// } else {
	// 	let temp = firstPoint
	// 	firstPoint = secondPoint
	// 	secondPoint = temp
	// }
	
}

const plotPointAtDistanceOnLine = (pointA: Point3d, pointB: Point3d, distance: any) => {
	let slope = parseFloat('0');
	let x1 = (pointA['x'])
	let y1 = (pointA['y'])
	let x2 = (pointB['x'])
	let y2 = (pointB['y'])
	let xDiff = x2 - x1;
	let yDiff = y2 - y1;
	const f = (x: any) => slope * (x - x1) + y1;
	console.log(`xDiff: ${xDiff}`)
	console.log(`yDiff: ${yDiff}`)
	console.log(`slope: ${slope}`)
	if (xDiff != slope) {
		slope = (yDiff / xDiff)
		console.log(`slope: ${slope}`)
		if (slope != parseFloat('0')) {
			const alpha = Math.atan(slope);
			console.log("alpha: ", alpha)
			console.log(" Math.cos(alpha)L: ",  Math.cos(alpha))
			const xVector = distance * Math.cos(alpha);
			let foundX = x1 + distance // Normal case
			if(Math.sign(distance) == -1) {
				if(x2 > x1) {
					foundX = x1 + Math.abs(distance)
				}
			}
			if(Math.sign(distance) == 1) {
				if(x2 <= x1) {
					foundX  = x1 - distance
				}
			}
			console.log("xVector: ", xVector)
			console.log( "Sum sign: ", ((Math.sign(xVector) == -0 || Math.sign(xVector) == -1) ? -1 : 1))
			// const foundX = x1 + ((xVector) * ((Math.sign(xVector) == -0 || Math.sign(xVector) == -1) ? -1 : 1));
			console.log("x1: ", x1)
			console.log("foundX: ", foundX)
			return [
				foundX,
				f(foundX)
			].map(v => +v.toFixed(2));
		} else {
			const foundX = x1 + (distance)
			return [
				foundX,
				f(foundX)
			].map(v => +v.toFixed(2));
		}
	} else {
		console.log("Need to handle")
		if (distance < 0) {
			return [
				0,
				y1 - Math.abs(distance)
			].map(v => +v.toFixed(2));

		} else {
			return [
				0,
				y1 + Math.abs(distance)
			].map(v => +v.toFixed(2));
		}
	}
}


export const getAntennaAzimuth = (startNode: any, antennaProperties: any): any => {
	console.log(`antennaProperties: ${JSON.stringify(antennaProperties)}`)
	const boxWitdh = mandateConvertInchToMeter(antennaProperties['Width']);
	// console.log(`++ boxWitdh: ${boxWitdh}`)
	let startPoint = Point3d.create(0, 0, startNode['Z'])
	let endPoint = Point3d.create(startNode['X'], startNode['Y'], startNode['Z'])
	console.log(`startPoint: ${JSON.stringify(startPoint)}`)
	console.log(`endPoint: ${JSON.stringify(endPoint)}`)
	const perpendicularResult = constructPerpendicularOnLine(startPoint, endPoint, (boxWitdh / 2));
	console.log(`perpendicularResult: ${JSON.stringify(perpendicularResult)}`)
	let boxBPoint = Point3d.create(startNode['X'] - (boxWitdh / 2), startNode['Y'], startNode['Z'])
	console.log(`boxBPoint: ${JSON.stringify(boxBPoint)}`)

	let lineVector: Vector3d = endPoint.vectorTo(perpendicularResult.firstPoint)
	console.log(`lineVector: ${JSON.stringify(lineVector)}`)
	let boxVector: Vector3d = endPoint.vectorTo(boxBPoint)
	console.log(`boxVector: ${JSON.stringify(boxVector)}`)

	const result: any = boxVector.angleTo(lineVector);
	// console.log(`result: ${JSON.stringify(result)}`)
	let _radians = 0;
	if (result) {
		_radians = result['_radians'] * 180 / Math.PI;
	}
	// console.log(`_radians: ${_radians}`)

	const result2: any = lineVector.angleTo(boxVector);
	// console.log(`result2: ${JSON.stringify(result2)}`)
	_radians = 0;
	if (result2) {
		_radians = result2['_radians'] * 180 / Math.PI;
	}
	console.log(`_radians2: ${_radians}`)
	// console.log(`antennaProperties['Location']: ${antennaProperties['Location']}`)
	if (lineVector['y'] > boxVector['y']) {
		console.log("-------------- should be negative")
		_radians = _radians * -1
	}
	// if(antennaProperties['Location'] == 'LegC') {
	// _radians = _radians * -1
	// }
	return _radians
}

const determinePointSideOnLine = (startPoint: Point3d, endPoint: Point3d, point: Point3d) => {
	// 𝑑=(𝑥−𝑥1)(𝑦2−𝑦1)−(𝑦−𝑦1)(𝑥2−𝑥1)
	let d = ((point.x - startPoint.x) * (endPoint.y - startPoint.y)) - ((point.y - startPoint.y) * (endPoint.x - startPoint.x))
	return d
}