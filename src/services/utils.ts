import axios from 'axios';
import config from "../utils/config";

const REEF_DENOM = 'reef';

export interface Price {
  usd: number;
  usd_24h_change: number;
}

interface PriceWrapper {
  [coin: string]: Price;
}

export const fetchReefPrice = async (): Promise<Price> => axios
  .get<PriceWrapper>(`https://api.coingecko.com/api/v3/simple/price?ids=${REEF_DENOM}&vs_currencies=usd&include_24hr_change=true`)
  .then((res) => res.data[REEF_DENOM])
  .then((res) => ({ ...res }))
  .catch((err) => {
      if(config.debug) {
          console.log(err);
      }
    throw new Error('Can not extract reef price from coingecko...');
  });
