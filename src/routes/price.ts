import {fetchReefPrice, Price} from "../services/utils";
import {NextFunction, Response} from 'express';
import config from "../utils/config";


const CACHE_PRICE_MS = 60000;
const CACHED_PRICE_ERROR_AFTER_MS = 600000;
let currentPrice: { timestamp: number, price?: Price; } = {timestamp: 0};

export const getReefPrice = async (_, res: Response, next: NextFunction) => {
    const now = (new Date()).getTime();

    if (now - currentPrice.timestamp > CACHE_PRICE_MS) {
        try {
            currentPrice.timestamp = now;
            const price = await fetchReefPrice();
            currentPrice = {timestamp: (new Date()).getTime(), price};
        } catch (err) {
            // if price didn't refresh for longer time return error
            if(now - currentPrice.timestamp > CACHED_PRICE_ERROR_AFTER_MS) {
                next(err);
                return;
            }
        }
    }
    res.send({...currentPrice.price, timestamp: currentPrice.timestamp});

}
