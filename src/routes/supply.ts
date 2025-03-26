import { Supply } from "../services/utils";
import { NextFunction, Response } from 'express';
import { ethers } from 'ethers';
import { getProvider } from "../utils/connector";
import config from "../utils/config";

const { infuraApiKey } = config;

const reefEth = {
    contractAddress: '0xFE3E6a25e6b192A42a44ecDDCd13796471735ACf',
    rpc: `https://mainnet.infura.io/v3/${infuraApiKey}`
};

const reefBsc = {
    contractAddress: '0xF21768cCBC73Ea5B6fd3C687208a7c2def2d966e',
    rpc: `https://bsc-mainnet.infura.io/v3/${infuraApiKey}`
};

export const reefMainnet = {
    contractAddress: '0x0000000000000000000000000000000001000000',
    rpc: 'wss://rpc.reefscan.info/ws'
};

const erc20Abi = ["function totalSupply() view returns (uint256)"];

// updates every hour
const CACHE_SUPPLY_MS = 60000*60;
const CACHED_SUPPLY_ERROR_AFTER_MS = 600000;
const MAX_RETRIES = 3;

let currentSupply: { timestamp: number, supply?: Supply } = { timestamp: 0 };

interface TokenSupply {
    contractAddress: string,
    rpc: string
}

const getTotalSupplyWithRetry = async (
    contractInfo: TokenSupply,
    getSupplyFn: (contractInfo: TokenSupply) => Promise<number>,
    retries = 0
): Promise<number> => {
    try {
        let totalSupply = await getSupplyFn(contractInfo);

        // Retry if supply is 0 and within max retries
        if (totalSupply === 0 && retries < MAX_RETRIES) {
            console.log(`Retrying for ${contractInfo.contractAddress}, attempt ${retries + 1}`);
            return await getTotalSupplyWithRetry(contractInfo, getSupplyFn, retries + 1);
        }
        return totalSupply;
    } catch (error) {
        console.error(`Error fetching supply for ${contractInfo.contractAddress}: ${error.message}`);
        return 0;
    }
};

const getTotalSupply = async ({ contractAddress, rpc }: TokenSupply) => {
    try {
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const contract = new ethers.Contract(contractAddress, erc20Abi, provider);
        const totalSupply = await contract.totalSupply();
        return parseFloat(ethers.utils.formatEther(totalSupply));
    } catch (error) {
        console.log("error===",error);
        return 0;
    }
};

export const getReefMainnetSupply = async ({ contractAddress, rpc }: TokenSupply) => {
    try {
        const evmProvider = getProvider();
        const contract = new ethers.Contract(contractAddress, erc20Abi, evmProvider);
        const totalSupply = await contract.totalSupply();
        return parseFloat(ethers.utils.formatEther(totalSupply));
    } catch (error) {
        console.log(error);
        return 0;
    }
};

const fetchReefSupply = async () => {
    try {
        const [eth, bsc, reef] = await Promise.all([
            getTotalSupplyWithRetry(reefEth, getTotalSupply),
            getTotalSupplyWithRetry(reefBsc, getTotalSupply),
            getTotalSupplyWithRetry(reefMainnet, getReefMainnetSupply)
        ]);

        const total = eth + bsc + reef;

        return { eth, bsc, reef, total };
    } catch (error) {
        console.log("fetchReefSupply error: ", error.message);
        return { eth: 0, bsc: 0, reef: 0, total: 0 };
    }
};

export const getReefSupply = async (_, res: Response, next: NextFunction) => {
    const now = (new Date()).getTime();

    if (now - currentSupply.timestamp > CACHE_SUPPLY_MS) {
        try {
            const supply = await fetchReefSupply();
            currentSupply.timestamp = now;
            currentSupply = { timestamp: (new Date()).getTime(), supply };
        } catch (err) {
            if (now - currentSupply.timestamp > CACHED_SUPPLY_ERROR_AFTER_MS) {
                next(err);
                return;
            }
        }
    }

    res.send({ ...currentSupply.supply, timestamp: currentSupply.timestamp });
};
