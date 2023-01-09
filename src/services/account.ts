import { mutate, query } from '../utils/connector';
import {
  TokenHolder,
  User, UserTokenBalance,
} from '../utils/types';
import { toChecksumAddress } from '../utils/utils';

export const getAllUsersWithEvmAddress = async (): Promise<User[]> => {
  return query<User[]>(
    'accounts',
    `query {
      accounts(where: {
        active_eq: true, 
        evmAddress_startsWith: "0x", 
        evmAddress_not_endsWith: "0x"
      }) {
        id
        evmAddress
      }
    }`);
};

export const insertTokenHolders = async (accountTokenBalances: UserTokenBalance[]): Promise<void> => {
  if (!accountTokenBalances.length) return;

  const tokenHolders: TokenHolder[] = accountTokenBalances.map(atb => {
    return {
      id: atb.id,
      evmAddress: atb.evmAddress,
      nftId: undefined,
      type: 'Account',
      balance: atb.balance,
      tokenId: toChecksumAddress(atb.tokenAddress),
      signerId: atb.id,
      timestamp: Date.now(),
    }
  });

  await mutate(`
    mutation {
      saveTokenHolders(
        tokenHolders: ${JSON.stringify(tokenHolders)}
      )
    }
  `);
};