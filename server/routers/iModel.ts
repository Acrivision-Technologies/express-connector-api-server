import { ConnectorController } from '../controllers/ConnectorController';
import express, { Express, Request, Response, NextFunction } from 'express';
var iModelRouter = express.Router();


iModelRouter.post('/build', function(req: Request, res: Response, next: NextFunction) {
    console.log("Process Start Time", new Date())
    try {
        ConnectorController.processIModelCreationRequest(req.body)
            .then((result: any) => {
                console.log("Process End Time", new Date());
                res.send({ status: "Success", message: "IModel Created" })
            })
            .catch((error: any) => {
                res.send({ status: "Failed", message: error })
            })
    } catch(e) {
        res.send({ status: "Failed", message: "Controller failed" })
    }

});

iModelRouter.post('/insert-elements', function(req: Request, res: Response, next: NextFunction) {
    console.log("Process Start Time", new Date())
    try {
        ConnectorController.processIModelInsertElementsRequest(req.body)
            .then((result: any) => {
                console.log("Process End Time", new Date());
                res.send({ status: "Success", message: "IModel Elements Inserted" })
            })
            .catch((error: any) => {
                res.send({ status: "Failed", message: error })
            })
    } catch(e) {
        res.send({ status: "Failed", message: "Controller failed" })
    }

});

iModelRouter.post('/update-elements', function(req: Request, res: Response, next: NextFunction) {
    console.log("Update Elements Process Start Time", new Date())
    try {
        ConnectorController.processIModelUpdateElementsRequest(req.body)
            .then((result: any) => {
                console.log("Process End Time", new Date());
                res.send({ status: "Success", message: "IModel Elements Updated" })
            })
            .catch((error: any) => {
                res.send({ status: "Failed", message: error })
            })
    } catch(e) {
        res.send({ status: "Failed", message: "Controller failed" })
    }

});

iModelRouter.post('/delete-elements', function(req: Request, res: Response, next: NextFunction) {
    console.log("Delete Elements Process Start Time", new Date())
    try {
        ConnectorController.processIModelDeleteElementsRequest(req.body)
            .then((result: any) => {
                console.log("Process End Time", new Date());
                res.send({ status: "Success", message: "IModel Elements Deleted" })
            })
            .catch((error: any) => {
                res.send({ status: "Failed", message: error })
            })
    } catch(e) {
        res.send({ status: "Failed", message: "Controller failed" })
    }

});

module.exports = iModelRouter;
