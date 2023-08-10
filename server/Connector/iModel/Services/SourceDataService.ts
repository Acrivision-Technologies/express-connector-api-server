import * as fs from "fs";
import * as xmlJs from "xml-js";
import { transformNodeCoordinates } from "../../ConnectorUtils";


const collectElemets = (elements: any) => {
    const elementsData: any = [];
    if (elements && elements.length > 0) {
        elements.forEach((element: any) => {
            let elementAttributes = element['attributes'];
            let transformedElementAttributes = transformNodeCoordinates(elementAttributes);
            elementsData.push(transformedElementAttributes);
        })
    }
    return elementsData;
}
const collectNodes = (elements: any) => {
    const nodes: any = [];
    if (elements && elements.length > 0) {
        elements.forEach((element: any) => {
            let elementAttributes = element['attributes'];
            let transformedElementAttributes = transformNodeCoordinates(elementAttributes);
            nodes.push(transformedElementAttributes);
        })
    }
    return nodes;
}

const collectHipBracingInfo = (elements: any) => {
    const hipBracingInfo = elements.map((ele: any) => {
        let eleObject = { ...ele.attributes };
        return eleObject;
    })

    return hipBracingInfo;
}

const collectPlanBracingInfo = (elements: any) => {

    const planBracingInfo = elements.map((ele: any) => {
        let eleObject = { ...ele.attributes };
        eleObject['Members'] = [];
        ele.elements.map((childEle: any) => {
            eleObject['Members'].push({ ...childEle.attributes });
        })

        return eleObject;
    })

    return planBracingInfo;

}
const collectPanelFaceBracingInfo = (elements: any) => {


    const faceBracingInfo = elements.map((ele: any) => {
        let eleObject = { ...ele.attributes }

        eleObject['Segment'] = [];

        const segmentsElements = ele['elements'][0].elements;
        // console.log('segmentsElements');
        // console.log(segmentsElements);
        segmentsElements.map((segmentElement: any) => {
            let segmentObject = { ...segmentElement.attributes };
            segmentObject['Members'] = [];
            if(segmentElement.elements) {
                segmentElement.elements.map((childele: any) => {
                    segmentObject['Members'].push({ ...childele.attributes })
                });
                eleObject['Segment'].push(segmentObject);
            }


        })

        return eleObject;
    });

    // console.log('faceBracingInfo')
    // console.log(faceBracingInfo)


    return faceBracingInfo;

}

const collectPanelLegInfo = (elements: any) => {

    let legCollection = elements.map((ele: any) => {
        return { ...ele.attributes, ...ele.elements[0].attributes };
    });

    return legCollection;

}

export const importSourceData = (sourcePath: string) => {
    try {
        const fileContent = fs.readFileSync(sourcePath, "utf8");
    
        // console.log("fileContent");
        // console.log(fileContent)
    
        const xmlJSonData: any = JSON.parse(xmlJs.xml2json(fileContent));
    
        const outputJson: any = {};
    
        xmlJSonData.elements[0].elements.forEach((element: any) => {
    
            const elementName = element['name'];
            // console.log(`elementName: ${elementName}`)
            if (elementName === 'Panel') {
                
                if (element.elements) {
                    if (!outputJson[elementName]) {
                        outputJson[elementName] = [];
                    }
                    let eleObject: any = { ...element.attributes };
                    element.elements.forEach((ele: any) => {
    
                        switch (ele.name) {
                            case 'Legs':
                                if (ele.elements)
                                    eleObject[ele.name] = collectPanelLegInfo(ele.elements)
                                break;
                            case 'FaceBracingDetails':
                                if (ele.elements)
                                    eleObject[ele.name] = collectPanelFaceBracingInfo(ele.elements)
                                break;
    
                            case 'PlanBracingDetails':
                                if (ele.elements)
                                    eleObject[ele.name] = collectPlanBracingInfo(ele.elements)
                                break;
    
                            case 'HipBracingDetails':
                                if (ele.elements)
                                    eleObject[ele.name] = collectHipBracingInfo(ele.elements)
                                break;
                        }
                    })
                    outputJson[elementName].push(eleObject);
                } else {
                    if (!outputJson[elementName]) {
                        outputJson[elementName] = { ...element.attributes };
                    }
                }
            } else if (elementName === 'MountPipes') {
                if (element.elements) {
    
                    if (!outputJson[elementName]) {
                        outputJson[elementName] = [];
                    }
                    element.elements.forEach((ele: any) => {
    
                        outputJson[elementName].push(...ele.elements);
    
                    })
                }
            } else if (elementName === 'Nodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            } else if (elementName === 'GuyNodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            }
            else if (elementName === 'MountNodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            }
            else if (elementName === 'MountPipesNodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            }
            else if (elementName === 'AntennaNodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            }
            else if (elementName === 'AppurtenanceNodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            }
            else if (elementName === 'AttachmentNodes') {
    
                const nodes = collectNodes(element.elements);
    
                outputJson[elementName] = nodes;
    
            } else {
                if (element.elements) {
                    if (!outputJson[elementName]) {
                        outputJson[elementName] = [];
                    }
                    element.elements.forEach((ele: any) => {
                        let eleObject: any = { ...ele.attributes };
                        if (ele.elements) {
                            eleObject["elements"] = [];
                            ele.elements.forEach((ele: any) => {
                                eleObject["elements"].push({ ...ele.attributes });
                            })
                        }
                        outputJson[elementName].push(eleObject);
                    })
                } else {
                    if (!outputJson[elementName]) {
                        outputJson[elementName] = { ...element.attributes };
                    }
                }
    
            }
    
        });
        return outputJson;
    } catch(e){
        console.log("importSourceData Exception");
        console.log(e)
        throw e;
    }


}