import { Response } from 'express';
import { query } from '../utils/connector';
import { AppRequest } from '../utils/types';
import { toChecksumAddress } from '../utils/utils';
import ethers from 'ethers';
import { upload } from '../services/updateTokenIcon';
import { updateVerifiedContractData } from '../services/verification';
import { verifiedContractRepository } from '..';
import config from '../utils/config';
import { sequelize } from '../db/sequelize.db';
import { uploadIconMainnet, uploadIconTestnet } from '../db/UploadIcon.db';

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

const uploadIconRepository = config.network === 'mainnet' 
  ? sequelize.getRepository(uploadIconMainnet) 
  : sequelize.getRepository(uploadIconTestnet);

const findVerifiedContract = async (
  id: string,
): Promise<VerifiedContract | null> => {
  const verifiedContract = await query<VerifiedContract | null>(
    'verifiedContractById',
    `query {
      verifiedContractById(id: "${id}") {
        id
        contract {
          signer{
              id
          }
        }
        type
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

export const uploadTokenIcon = async (
  req: AppRequest<SignedMessageRequest>,
  res: Response,
) => {
  //contract address of the token whose icon has to be updated
  const contractAddress = toChecksumAddress(req.body.signMsg['contractAddress']);

  //fetching contract details
  const contract = await findVerifiedContract(contractAddress);
  if(contract === null){
    res.status(404);
  }

  // # FILE - CHECK 1
  //file hash from the frontend to verify if the file sent is the same file or not
  const fileHash = req.body.signMsg['fileHash'];

  //checking if the file sent is the one which was hashed earlier
  const file = req.body.file;

  // BLOCK REPETITIVE REQUESTS
  const uploadIconBackup = await uploadIconRepository.findByPk(contractAddress);
  const verifiedBackup = await verifiedContractRepository.findByPk(contractAddress);
  try {
    // Check if the fileHash is already present in the localdb or not
    if (verifiedBackup) {
      if (verifiedBackup.contractData.fileHash === fileHash) {
        return res.status(400).json({ error: "This image is already token icon." });
      } 
    }
    if(uploadIconBackup && uploadIconBackup.pending){
      res.status(403).json({error: "Same file is being uploaded"})
    }
  } catch (err: any) {
    console.error(err);
  }

  //calculating the hash for verification
  const calculatedHash = generateSHA256Hash(file);
  //validating the hash of file
  if (calculatedHash != fileHash) {
    return res.status(400).json({ error: "Invalid hash , different file uploaded" });
  }

  // # FILE - CHECK 2
  //size of file should be less than 500kb
  if (file.size > 500000) {
    res.status(413).json({ error: "File size too large" });
  }

  //file is same - now checking if the icon is already uploaded or not
  // to make it fast - checking it in localdb
  if(verifiedBackup?.contractData.iconUrl){
    res.status(403).json({error: "icon url already present"});
  } 

  // address of user who is trying to upload icon
  const signerAddress = ethers.utils.verifyMessage(JSON.stringify(req.body.signMsg), ethers.utils.toUtf8Bytes(req.body.signature));


  if (signerAddress === contract?.signer.id) {
    // Add a new record to the local db with a pending status
    await uploadIconRepository.create({
    address: contractAddress,
    filesize: file.size,
    pending:true,
    });

    //obtain the ipfsHash by uploading the file
    const ipfsHash = upload(file);
    await updateVerifiedContractData(contractAddress, 'ipfs://' + ipfsHash);

     // When the file is uploaded, delete the pending status from the verifiedContractRepository
      const pendingRecord = await uploadIconRepository.findOne({ where: { address: contractAddress } });
      if (pendingRecord) {
        await verifiedContractRepository.destroy(pendingRecord.id);
      }

    //return success status
    res.status(200).json({ success: true });
  }
  //if not validated
  res.status(403).json({ error: "You are not the owner" });
  
};