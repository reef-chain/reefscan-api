import { Response } from 'express';
import { query } from '../utils/connector';
import { AppRequest } from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import ethers from 'ethers';
import { upload , insertTokenHash } from '../services/updateTokenIcon';
import { exportBackupToFiles, verifyPendingFromBackup } from '../services/verification';
import { Provider } from "@reef-defi/evm-provider";
import { WsProvider } from "@polkadot/rpc-provider";

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
    const contractAddress = toChecksumAddress(req.params.address);
    const message = contractAddress;
    const signedMessage = req.body['signedMessage'];

    // Checking if user signed message
    const signerAddress = ethers.utils.verifyMessage(message, signedMessage);
    ensure(signerAddress !== req.body['signer'], 'The signerAddress does not match the provided address');

    // Checking if pending status for this contract address is in the local database
    await verifyPendingFromBackup();

    // Get verified contract from GraphQL
    const contract = await findVerifiedContract(contractAddress);
    ensure(!contract, 'Contract does not exist');
    
    //hard coding ABI here
    const ABI = [

    ]

    //Setting network
    let URL = '';
    if (process.env.NETWORK === 'mainnet') {
        URL = process.env.NODE_URL_TESTNET || '';
    } else {
        URL = process.env.NODE_URL_MAINNET || '';
    }

    // Check if contract has an icon URL and if not check the owner
    if (!contract!.iconUrl) {

       // Use the ABI to get the contract instance
       const provider = new Provider({
        provider: new WsProvider(URL),
      });
       const contractInstance = new ethers.Contract(contractAddress, ABI, provider);
 
       // Call the contract method to get the owner
       const owner = await contractInstance.functions.owner();
 
       // Checking if signer and owner are equal
      let ownerOfContract = ethers.utils.getAddress(owner);
      if (ownerOfContract === req.body['signer']) {
        // Upload to IPFS
        const result = await upload(req.params.body!['file']);

        // Save to GraphQL
        await insertTokenHash(result);

        // TODO: Save to local database
        await exportBackupToFiles();

        res.send(result);
      } else {
        res.send("You are not the owner");
      }
    }
};