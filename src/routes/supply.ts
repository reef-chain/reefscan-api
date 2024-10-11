import {Supply} from "../services/utils";
import {NextFunction, Response} from 'express';
import { ethers } from 'ethers';
import { getProvider } from "../utils/connector";


const reefEth = {
    contractAddress:'0xFE3E6a25e6b192A42a44ecDDCd13796471735ACf',
    rpc:'https://rpc.mevblocker.io/fullprivacy'
}

const reefBsc = {
    contractAddress:'0xF21768cCBC73Ea5B6fd3C687208a7c2def2d966e',
    rpc:'https://bsc-dataseed1.bnbchain.org'
}

const reefMainnet = {
    contractAddress:'0x0000000000000000000000000000000001000000',
    rpc:'wss://rpc.reefscan.info/ws'
}

const erc20Abi = ["function totalSupply() view returns (uint256)"];

const CACHE_SUPPLY_MS = 60000;
const CACHED_SUPPLY_ERROR_AFTER_MS = 600000;
let currentSupply: { timestamp: number, supply?: Supply; } = {timestamp: 0};

interface TokenSupply{
    contractAddress:string,
    rpc:string
}

const getTotalSupply = async({contractAddress,rpc}:TokenSupply)=>{
    try {
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const contract = new ethers.Contract(contractAddress, erc20Abi, provider);
        const totalSupply = await contract.totalSupply();
        return parseFloat(ethers.utils.formatEther(totalSupply));
    } catch (error) {
        return 0;
    }
}

const getReefMainnetSupply = async({contractAddress,rpc}:TokenSupply)=>{
    try {
        const evmProvider = getProvider();
        const contract = new ethers.Contract(contractAddress, erc20Abi, evmProvider);
        const totalSupply = await contract.totalSupply();
        return parseFloat(ethers.utils.formatEther(totalSupply));
    } catch (error) {
        console.log(error)
        return 0;
    }
}

const fetchReefSupply = async()=>{
    let eth = 0;
    let bsc = 0;
    let reef = 0;
    let total = 0;

    try {
        eth = await getTotalSupply(reefEth);
        bsc = await getTotalSupply(reefBsc);
        reef = await getReefMainnetSupply(reefMainnet);
        total = reef+bsc+eth;
    } catch (error) {
        console.log("fetchReefSupply===",error.message);
    }

    return {
        eth,bsc,reef,total
    }
}

export const getReefSupply = async (_, res: Response, next: NextFunction) => {
    const now = (new Date()).getTime();

    if (now - currentSupply.timestamp > CACHE_SUPPLY_MS) {
        try {
            currentSupply.timestamp = now;
            const supply = await fetchReefSupply();
            currentSupply = {timestamp: (new Date()).getTime(), supply};
        } catch (err) {
            // if supply didn't refresh for longer time return error
            if(now - currentSupply.timestamp > CACHED_SUPPLY_ERROR_AFTER_MS) {
                next(err);
                return;
            }
        }
    }
    res.send({...currentSupply.supply, timestamp: currentSupply.timestamp});

}
