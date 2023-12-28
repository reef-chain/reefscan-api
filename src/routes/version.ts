import {fetchReefPrice, Price} from "../services/utils";
import {NextFunction, Response} from 'express';
import config from "../utils/config";

export const getVersion = (_, res: Response, next: NextFunction) => {
    return res.send({
        network: config.network,
        version: process.env.npm_package_version,
        time: (new Date()).getTime()
    });
};
