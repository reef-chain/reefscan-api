import { Response } from 'express';
import { query } from '../utils/connector';
import { AppRequest } from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import { upload } from '../services/updateTokenIcon';
import crypto from 'crypto';
import {u8aToHex} from "@polkadot/util";
import {decodeAddress, signatureVerify} from "@reef-defi/util-crypto";
import { updateVerifiedContractData } from '../services/verification';

export const findVerifiedContract = async (
  id: string,
): Promise<any | null> => {
  const verifiedContractById = await query<any | null>(
    'verifiedContractById',
    `query {
      verifiedContractById(id: "${id}") {
        id
        contractData
        contract {
          signer {
            id
          }
        }
      }
    }`
  );
  return verifiedContractById;
};

const getVerifiedContract = async (
  contractId
) => {
  const contract = await findVerifiedContract(
    toChecksumAddress(contractId),
  );
  console.log(contract)
  ensure(!!contract, 'Contract does not exist');
  return contract;
};

const isValidSignature = (signedMessage, signature, address) => {
  const publicKey = decodeAddress(address);
  const hexPublicKey = u8aToHex(publicKey);

  return signatureVerify(signedMessage, signature, hexPublicKey).isValid;
};

function generateSHA256Hash(inputString) {
  const hash = crypto.createHash('sha256');
  hash.update(inputString);
  return hash.digest('hex');
}

export const uploadTokenIcon = async (
    req: AppRequest<any>,
    res: Response,
  ) => {
    // extracting all the data from the req
    const contractAddress = toChecksumAddress(req.body['contractAddress']);
    const file = req.body['file'];
    const signature = req.body['signature'];
    const fileHash = req.body['fileHash'];
    const signingAddress = req.body['signingAddress'];

    //checking if the file sent is the one which was hashed earlier
    const calculatedHash = generateSHA256Hash(file);
    if(calculatedHash != fileHash){
      res.send(403).send('different file uploaded')
    }

    // checking validity of signature
    if(!isValidSignature(fileHash,signature,signingAddress)){
      res.status(403).send('invalid signature')
    }

    // who is owner of contract?
    const contract = await getVerifiedContract(contractAddress);
    const ownerOfContract = contract.contract.signer.id;

    // check if signer is owner
    if(ownerOfContract!=signingAddress){
      res.status(403).send("you are not the owner")
    }else{
      // uploads file to ipfs
      upload(file).then(hash=>{
        updateVerifiedContractData(contractAddress,{'iconUrl':'ipfs://'+hash});
      res.status(200).send('token updated successfully');
      }).catch(error => {
        res.status(403).send("encountered some error");
      });
    }
    res.status(403).send("encountered some error");
};