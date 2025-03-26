import { Response } from 'express';
import { AppRequest } from '../utils/types';
import { getReefMainnetSupply, reefMainnet } from '../routes/supply';

const abi = [
    {
        "name": "totalSupply",
        "type": "function",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    }
];

export const totalReefSupply = async (
  req: AppRequest<{}>,
  res: Response,
) => {
  const response = await getReefMainnetSupply(reefMainnet);
  res.json(response);
};
