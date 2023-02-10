import { Response } from 'express';
import { mutate, query } from '../utils/connector';
import { ABI, AppRequest, ContractType, License, Target } from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import axios from 'axios'
import { uploadAndInsert } from '../services/uploadTokenIcon';

interface VerifiedContract {
  signer: JSON;
  iconUrl: String;
  id:String;
}

export const findVerifiedContract = async (
  id: string,
): Promise<VerifiedContract | null> => {
  const verifiedContract = await query<VerifiedContract | null>(
    'fetchContract',
    `query {
      contracts(limit: 1, where: {id_containsInsensitive:"${id}"}) {
        signer {
            id
          }
        iconUrl
        }
    }`
  );
  return verifiedContract;
};

export const uploadTokenIcon = async (
    req: AppRequest<{}>,
    res: Response,
  ) => {
    const contract = await findVerifiedContract(
      toChecksumAddress(req.params.address),
    );
    ensure(!contract, 'Contract does not exist');
    if(!(contract!.iconUrl)){
        //checking if signer and owner are equal
        let ownerOfcontract = contract!.signer['id'];

        if( ownerOfcontract == req.body['signer']){
            //upload to IPFS
            uploadAndInsert(req.params.body!['file']);
        }
        res.send("You are not the owner")
    }
  };
