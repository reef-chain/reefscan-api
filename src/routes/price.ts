import axios from "axios";
import {fetchReefPrice, Price} from "../services/utils";
import {NextFunction, Response} from 'express';


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


/**
 * This function acts as a proxy to fetch the latest REEF price from Gate.io.
 * It retrieves the REEF/USDT ticker data and returns it in JSON format.
 */
export const getReefPriceGateIo = async(_, res:Response) =>{
    try {
      const { data } = await axios.get(
        'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=REEF_USDT'
      )
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data[0]))
    } catch (err) {
      console.error('Proxy error:', err.message)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to fetch data from Gate.io' }))
    }
  }