import { query } from '../utils/connector';
import { ABI } from '../utils/types';
import { toChecksumAddress } from '../utils/utils';

interface FindContractDB {
  address: string;
  bytecode: string;
  name: string | null;
  filename: string | null;
  args: string[] | null;
  source: {[filename: string]: string} | null
  compileddata: {[filename: string]: ABI} | null;
}

export const findContractDB = async (address: string): Promise<FindContractDB[]> => {
  return query<FindContractDB[]>(
    'findContract',
    `query {
      findContract(id: "${toChecksumAddress(address)}") {
        address
        bytecode
        compiledData
        source
        args
        name
        filename
      }
    }`
  );
};