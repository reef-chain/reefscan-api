import {fetchReefPrice, Price} from "../services/utils";
import express, { Response, Request, NextFunction } from 'express';

const CACHE_PRICE_MS = 30000;
let currentPrice:{time: number, price?: Price}={time:0}

export const getReefPrice = async (_, res: Response, next: NextFunction) => {
    const now = (new Date()).getTime();

    if (now - currentPrice.time > CACHE_PRICE_MS) {
        try {
            const price = await fetchReefPrice();
            currentPrice = {time: (new Date()).getTime(), price};
        } catch (err) {
            next(err);
        }
    }
    res.send(currentPrice);

}