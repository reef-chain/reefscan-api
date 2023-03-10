import {fetchReefPrice, Price} from "../services/utils";
import express, { Response, Request, NextFunction } from 'express';

let cachedPrice:{time: number, price?: Price}={time:0}

export const getReefPrice = async (_, res: Response, next: NextFunction) => {
    const now = (new Date()).getTime();

    if (now - cachedPrice.time > 10000) {
        try {
            const price = await fetchReefPrice();
            cachedPrice = {time: (new Date()).getTime(), price};
        } catch (err) {
            next(err);
        }
    }
    res.send({...cachedPrice.price, time:cachedPrice.time});

}