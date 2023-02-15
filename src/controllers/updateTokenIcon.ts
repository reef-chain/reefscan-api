import { Response } from 'express';
import { query } from '../utils/connector';
import { AppRequest } from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import ethers from 'ethers';
import { upload } from '../services/updateTokenIcon';
import { updateVerifiedContractData } from '../services/verification';

interface VerifiedContract {
  signer: JSON;
  iconUrl: String;
  id:String;
}

interface SignedMessageRequest {
  signMsg: JSON;
  file: File;
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

const generateSHA256Hash=(data)=>{
  const buffer = new Uint8Array(data)
  return crypto.subtle.digest('SHA-256', buffer).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return hashHex
  })
}

const getVerifiedContract = async (
  contractId
) => {
  const contract = await findVerifiedContract(
    toChecksumAddress(contractId),
  );
  ensure(!!contract, 'Contract does not exist');
  return contract;
};

export const uploadTokenIcon = async (
    req: AppRequest<SignedMessageRequest>,
    res: Response,
  ) => {
    const contractAddress = toChecksumAddress(req.body.signMsg['contractAddress']);
    const fileHash = req.body.signMsg['fileHash'];

    //checking if the file sent is the one which was hashed earlier
    const file = req.body.file;
    const calculatedHash = generateSHA256Hash(file);

    //if hash is not same i.e different file uploaded
    if(calculatedHash != fileHash){
      return "invalid hash";
    }

    //file is same - now checking if owner signed message or not
    const signerAddress = ethers.utils.verifyMessage(req.body.signMsg['data'], req.body['signature']);

    const contract = getVerifiedContract(contractAddress);
    const ownerOfContract = contract['owner'];

    if(signerAddress === ownerOfContract){
      const ipfsHash = upload(file);
      await updateVerifiedContractData(contractAddress,'ipfs://'+ipfsHash);
      res.send('Updated token successfully');
    } 
    res.send('You are not owner of contract');
};