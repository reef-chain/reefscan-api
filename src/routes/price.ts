import {fetchReefPrice, Price} from "../services/utils";
import {NextFunction, Response} from 'express';
import config from "../utils/config";


const CACHE_PRICE_MS = 60000;
let currentPrice:{timestamp: number, price?: Price}={timestamp:0}

export const getReefPrice = async (_, res: Response, next: NextFunction) => {
    const now = (new Date()).getTime();

    if (now - currentPrice.timestamp > CACHE_PRICE_MS) {
        try {
            const price = await fetchReefPrice();
            currentPrice = {timestamp: (new Date()).getTime(), price};
        } catch (err) {
            // TODO remove
            currentPrice = {timestamp: (new Date()).getTime(), price:{usd:0.00145339, usd_24h_change:2.834696428592735, _live:false}};
            console.log("REMOVE WHEN coingecko API ENABLED")
            //next(err);
            // return;
        }
    }
    res.send({...currentPrice.price, timestamp: currentPrice.timestamp});

}
