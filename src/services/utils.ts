import axios from 'axios';
import config from '../utils/config';

const REEF_DENOM = 'reef';

interface Price {
  usd: number;
  usd_24h_change: number;
}

interface PriceWrapper {
  [coin: string]: Price;
}

export const authenticationToken = async (token: string): Promise<boolean> => axios
  .get(`https://www.google.com/recaptcha/api/siteverify?secret=${config.recaptchaSecret}&response=${token}`)
  .then((res) => res.data.success)
  .catch((err) => {
    // TODO add logger
    console.log(err);
    throw new Error('Can not extract recaptcha token...');
  });

export const getReefPrice = async (): Promise<Price> => axios
  .get<PriceWrapper>(`https://api.coingecko.com/api/v3/simple/price?ids=${REEF_DENOM}&vs_currencies=usd&include_24hr_change=true`)
  .then((res) => res.data[REEF_DENOM])
  .then((res) => ({ ...res }))
  .catch((err) => {
    console.log(err);
    throw new Error('Can not extract reef price from coingecko...');
  });
