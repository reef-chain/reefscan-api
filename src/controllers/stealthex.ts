import { AppRequest } from "../utils/types";
import { Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import config from '../utils/config';

const baseUrl = config.stealthexEndpoint;
const bearerToken = config.stealthexApiKey

const getOptions = (method:string,url:string,data:any)=>{
    return {
        method,
        url,
        headers: {Authorization: `Bearer ${bearerToken}`},
        data
      } as AxiosRequestConfig;
}

const checkIfReefRouteExists=(availableRoutes:[{symbol:string,network:string}])=>{
  let doesRouteExist = false;
  availableRoutes.forEach((route)=>{
    if(route.symbol=="reef" && route.network=="mainnet"){
      doesRouteExist=true;
    }
  });
  return doesRouteExist;
}

export const listCurrencies = async (
    req: AppRequest<any>,
    apiResponse: Response,
) => {
  try {
    const { data } = await axios.request(getOptions('GET', `${baseUrl}/currencies?include_available_routes=true&limit=250&network=mainnet`, {}));
    let reefNetwork = [];

    // Finding all routes for reef network
    data.forEach((val) => {
      if (val["symbol"] === "reef") {
        reefNetwork = val.available_routes;
      }
    });

    // Map for tracking the currency symbols
    let availableNetworkRoutesMap = {
        "reef":"reef"
    };

    reefNetwork.forEach((val:{
        network:string;
        symbol:string;
    }) => {
      if (availableNetworkRoutesMap[val.network]) {
        availableNetworkRoutesMap[val.network].push(val.symbol);
      } else {
        availableNetworkRoutesMap[val.network] = [val.symbol];
      }
    });

    let res:any[] = [];

    data.forEach((val:any) => {
      if (availableNetworkRoutesMap[val.network] && availableNetworkRoutesMap[val.network].indexOf(val.symbol) !== -1) {
        res.push(val);
      }
    });

    res = res.filter((v) => checkIfReefRouteExists(v["available_routes"]));

    res.sort((a, b) => {
      if (a.symbol === "eth") return -1;
      if (b.symbol === "eth") return 1;
      if (a.symbol === "bnb") return -1;
      if (b.symbol === "bnb") return 1;
      return 0;
    });

    apiResponse.json({
        data:res,
        error:undefined
    });
  } catch (error) {
    console.log("listCurrencies===", error);
    apiResponse.json({
        data:[],
        error:error
    });;
  }
};

export const getExchangeRange = async(
    req: AppRequest<any>,
    apiResponse: Response,
  ) =>{
    try {
        const fromSymbol =req.params.symbol;
        const fromNetwork = req.params.network;
      const { data } = await axios.request(getOptions('POST',`${baseUrl}/rates/range`,{
      route: {
        from: {symbol: fromSymbol, network: fromNetwork},
        to: {symbol: 'reef', network: 'mainnet'}
      },
      estimation: 'direct',
      rate: 'floating'
    }));
    apiResponse.json({data});
    } catch (error) {
      console.log(error);
      apiResponse.json({
        "min_amount": null,
        "max_amount": null
      });
    }
  }

export const getEstimatedExchange = async(
    req: AppRequest<any>,
    apiResponse: Response,
)=>{
    const sourceChain=req.params.chain;
    const sourceNetwork=req.params.network;
    const amount=parseFloat(req.params.amount);
    try {
        const { data } = await axios.request(getOptions('POST',`${baseUrl}/rates/estimated-amount`,{
            route: {
              from: {symbol: sourceChain, network: sourceNetwork},
              to: {symbol: 'reef', network: 'mainnet'}
            },
            estimation: 'direct',
            rate: 'floating',
            amount
          }));
          apiResponse.json({data:data.estimated_amount});
    } catch (error) {
        return apiResponse.json({data:0});
    }
}

export const setTransactionHash = async(
    req: AppRequest<any>,
    apiResponse: Response,
)=>{
    const id = req.body['id'];
    const tx_hash=req.body['tx_hash'];

    const options = {
      method: 'PATCH',
      url: `${baseUrl}/exchanges/${id}`,
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}`},
      data: {tx_hash}
    } as AxiosRequestConfig;
    
    try {
      const { data } = await axios.request(options);
      apiResponse.json({data,error:undefined});
    } catch (error) {
      console.log("setTransactionHash error===",error);
      apiResponse.json({error:error,data:undefined})
    }
}

export const createExchange = async(
    req: AppRequest<any>,
    apiResponse: Response,
)=>{
    const fromSymbol = req.body['fromSymbol'];
    const fromNetwork = req.body['fromNetwork'];
    const toSymbol = req.body['toSymbol'];
    const toNetwork = req.body['toNetwork'];
    const amount = parseFloat(req.body['number']);
    const address = req.body['address'];

    const options = {
      method: 'POST',
      url: `${baseUrl}/exchanges/`,
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}`},
      data: {
        route: {
          from: {symbol: fromSymbol, network: fromNetwork},
          to: {symbol: toSymbol, network: toNetwork}
        },
        amount: amount,
        estimation: 'direct',
        rate: 'floating',
        address
      }
    };
    
    try {
      const { data } = await axios.request(options as AxiosRequestConfig);
      apiResponse.json({data,error:undefined});
    } catch (error) {
        apiResponse.json({data:undefined,error});
    }
    }
    