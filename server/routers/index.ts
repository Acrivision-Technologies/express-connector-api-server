import express, { Express, Request, Response, NextFunction } from 'express';
var indexRouter = express.Router();

/* GET home page. */
indexRouter.get('/', function(req: Request, res: Response, next: NextFunction) {
    res.send('Express + TypeScript Server Emotion');
});

module.exports = indexRouter;
