import { Response } from 'express';
import { getProvider, query } from '../utils/connector';
import { AppRequest } from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import { upload } from '../services/updateTokenIcon';
import crypto from 'crypto';
import {u8aToHex} from "@polkadot/util";
import {decodeAddress, signatureVerify} from "@reef-defi/util-crypto";
import { updateVerifiedContractData } from '../services/verification';
import {Contract,ethers} from 'ethers';

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
    const fileData = req.body['fileData'];
    const uploadTimestamp = fileData['timestamp'];
    const file = fileData['fileBase64'];
    const fileHash = req.body['fileHash'];
    const signature = req.body['signature'];
    const signerAddress = req.body['signerAddress'];
    const imageSizeInKB = Buffer.from(file, 'base64').length/ 1024;

    // if image is more than 500KB return
    if(imageSizeInKB>500){
      res.status(403).send("image too big");
    }

    // obtaining file hash and comparing to check if it is same file
    const calculatedFileHash = generateSHA256Hash(JSON.stringify(fileData));
    if(calculatedFileHash !== fileHash){
      res.status(403).send('different file uploaded')
    }

    // checking validity of signature
    if(!isValidSignature(calculatedFileHash,signature,signerAddress)){
      res.status(403).send('invalid signature');
    }

    // does contract have iconUri function
    const abi = [
      "function owner() view returns (address)",
      "function iconUri() view returns (string)",
    ];
    const provider = getProvider()
    try {
      const contract = new Contract(contractAddress, abi, provider as any);
      const iconUri = await contract.iconUri()
      if(iconUri) res.status(403).send("icon already exists");
      try {
        const owner = await contract.owner()
        if(owner && owner !== ethers.constants.AddressZero && owner !== signerAddress) res.status(403).send("not contract owner");
      } catch (error) {}
    } catch (error) {}


    // who is owner of contract?
    const contract = await getVerifiedContract(contractAddress);
    const contractDeployer = contract.contract.signer.id;
    const lastUpdatedOn = contract.contractData['updatedOn'];
    
    // if request is being sent again [ someone stole the request by intercepting network ]
    if(lastUpdatedOn!= undefined && lastUpdatedOn>uploadTimestamp){
      res.status(403).send("malicious intent");
    }

    // check if signer is owner
    if(contractDeployer!=signerAddress){
      res.status(403).send("you are not the owner")
    }else{
      // uploads file to ipfs
      upload(file).then(hash=>{
        updateVerifiedContractData(contractAddress,{'iconUrl':'ipfs://'+hash});
      res.status(200).send(`token updated successfully at ${hash}`);
      }).catch(error => {
        res.status(403).send("encountered some error");
      });
    }
};