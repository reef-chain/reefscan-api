import { Response } from 'express';
import { query } from '../utils/connector';
import { AppRequest } from '../utils/types';
import { toChecksumAddress } from '../utils/utils';
import ethers from 'ethers';
import { upload } from '../services/updateTokenIcon';
import { updateVerifiedContractData } from '../services/verification';
import { verifiedContractRepository } from '..';
import { Provider } from '@reef-defi/evm-provider';
import { WsProvider } from '@polkadot/rpc-provider'
import config from '../utils/config';
import {findVerifiedContract as fetchVerifiedContract} from '../services/verification'
import Erc20Abi from '../assets/Erc20Abi';
import Erc721Abi from '../assets/Erc721Abi';
import Erc1155Abi from '../assets/Erc1155Abi';

interface SignerInterface {
  id: string;
}

interface VerifiedContract {
  signer: SignerInterface;
  iconUrl: String;
  id: String;
}

interface SignedMessageRequest {
  signMsg: JSON;
  file: File;
  signature: string;
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

const generateSHA256Hash = (data) => {
  const buffer = new Uint8Array(data)
  return crypto.subtle.digest('SHA-256', buffer).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return hashHex
  })
}

const checkContractHasIconUrl = async (contractAddress: string): Promise<boolean> => {
  const provider = new Provider({
    provider: new WsProvider(config.nodeWs),
  })

  //creating contract instance
  let contract:any;

  //fetch detail of contract which has to be updated
  let contractData = await fetchVerifiedContract(contractAddress);

  //determining the type of contract 
  const typeOfContract = contractData?.type;

  //based on type of contract - hardcoding the ABI
  if(typeOfContract === 'ERC20'){
    contract = new ethers.Contract(contractAddress, Erc20Abi, provider);
  }else if(typeOfContract === 'ERC721'){
    contract = new ethers.Contract(contractAddress, Erc721Abi, provider);
  }else if(typeOfContract === 'ERC1155'){
    contract = new ethers.Contract(contractAddress, Erc1155Abi, provider);
  }

  //check if iconUrl exists or not
  try {
    const iconUrl = await contract.iconUrl();
    return iconUrl ? true : false;
  } catch (error) {
    console.error(`Error checking contract icon URL: ${error}`);
    return false;
  }
};

export const uploadTokenIcon = async (
  req: AppRequest<SignedMessageRequest>,
  res: Response,
) => {
  //contract address of the token whose icon has to be updated
  const contractAddress = toChecksumAddress(req.body.signMsg['contractAddress']);

  // # FILE - CHECK 1
  //file hash from the frontend to verify if the file sent is the same file or not
  const fileHash = req.body.signMsg['fileHash'];

  //checking if the file sent is the one which was hashed earlier
  const file = req.body.file;

  // BLOCK REPETITIVE REQUESTS
  try {
    const verifiedBackup = await verifiedContractRepository.findByPk(contractAddress);
    // Check if the fileHash is already present in the localdb or not
    if (verifiedBackup) {
      if (verifiedBackup.contractData.fileHash === fileHash) {
        return res.status(400).json({ error: "This image is already token icon." });
      } else if (verifiedBackup.contractData.pending) {
        return res.status(400).json({ error: "A request to update the icon of this token is already pending." });
      }
    }
    // Check if there is another pending request with the same contract ID and file size
    const pendingRequests = await verifiedContractRepository.findAll({
      where: {
        address:contractAddress,
        'contractData.fileSize': file.size,
        'contractData.pending': true,
        },
      }
    );

  //if Icon is in pending
  if (pendingRequests.length > 0) {
    return res.status(400).json({ error: "A request with the same contract ID and file size is already pending." });
  }
  } catch (err: any) {
    console.error(err);
  }

  //calculating the hash for verification
  const calculatedHash = generateSHA256Hash(file);
  //validating the hash of file
  if (calculatedHash != fileHash) {
    return res.status(400).json({ error: "Invalid hash" });
  }

  // # FILE - CHECK 2
  //size of file should be less than 500kb
  if (file.size > 500000) {
    return res.status(413).json({ error: "File size too large" });
  }

  //file is same - now checking if the icon is already uploaded or not
  if(!(await checkContractHasIconUrl(contractAddress))){
    res.send(200).json({error:"Token already has an icon!"})
  }

  // address of user who is trying to upload icon
  const signerAddress = ethers.utils.verifyMessage(JSON.stringify(req.body.signMsg), ethers.utils.toUtf8Bytes(req.body.signature));

  //fetching contract details
  const contract = await findVerifiedContract(contractAddress);

  if (signerAddress === contract?.signer.id) {
    // Add a new record to the local db with a pending status
    await verifiedContractRepository.create({
    address: contractAddress,
    contractData: {
      fileSize: file.size,
      pending: true
    }
    });

    //obtain the ipfsHash by uploading the file
    const ipfsHash = upload(file);
    await updateVerifiedContractData(contractAddress, 'ipfs://' + ipfsHash);

    //when the file is uploaded then change the pending status to false
    await verifiedContractRepository.update(
      { contractData: { iconUrl: 'ipfs://' + ipfsHash, pending: false } },
      { where: { address: contractAddress } }
    );
    //return success status
    res.status(200).json({ success: true });
  }
  //if not validated
  res.status(403).json({ error: "You are not the owner" });
  
};