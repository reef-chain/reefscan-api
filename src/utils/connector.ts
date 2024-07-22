import {
  ApolloClient,
  gql,
  HttpLink,
  InMemoryCache,
} from "@apollo/client/core";
import { Provider } from '@reef-defi/evm-provider';
import { WsProvider } from '@polkadot/api';
import jwt from 'jsonwebtoken';
import config from './config';
import fetch from "cross-fetch";
import { trim } from "./utils";

const createQueryClient = (squidVersion?: number): ApolloClient<any> => {
  const uri = squidVersion 
    ? config.explorerApi.replace(/(graphql)/, `v/v${squidVersion}/$1`)
    : config.explorerApi;

  return new ApolloClient({
    link: new HttpLink({
      uri: uri,
      fetch,
    }),
    cache: new InMemoryCache()
  });
}

const createMutateClient = (squidVersion?: number): ApolloClient<any> => {
  const uri = squidVersion 
    ? config.explorerApi.replace(/(graphql)/, `v/v${squidVersion}/$1`)
    : config.explorerApi;

  return new ApolloClient({
    link: new HttpLink({
      uri: uri,
      fetch,
      headers: {
        authorization: `Bearer ${jwt.sign({ value: "MUTATE" }, config.jwtSecret)}`
      }
    }),
    cache: new InMemoryCache()
  });
}

const logError = (error: any): any => {
  if (error.networkError?.result?.errors?.length) {
    console.log(error.networkError.result.errors);
  } else if (error.message) {
    console.log(error.message);
  } else {
    console.log(error);
  }
}

const queryClientProd = createQueryClient();
const mutateClientProd = createMutateClient();

export const query = async <Res>(entityName: string, statement: string, squidVersion?: number): Promise<Res | null> => {
  const queryClient = squidVersion ? createQueryClient(squidVersion) : queryClientProd;

  try {
    const result = await queryClient.query({ query: gql(statement), fetchPolicy: 'no-cache' });
    if (squidVersion) queryClient.stop();
    return result.data[entityName];
  } catch (error) {
    console.log(`ERROR for query: ${trim(statement)}`)
    logError(error);
    if (squidVersion) queryClient.stop();
    return null;
  }
};

export const mutate = async <Res>(statement: string, input?: any, squidVersion?: number): Promise<Res | null> => {
  const mutateClient = squidVersion ? createMutateClient(squidVersion) : mutateClientProd;

  try {
    const result = await mutateClient.mutate({ mutation: gql(statement), variables: input ? {input} : {}});
    if (squidVersion) mutateClient.stop();
    return result.data;
  } catch (error) {
    console.log(`ERROR for mutation: ${trim(statement)}`)
    logError(error);
    if (squidVersion) mutateClient.stop();
    return null;
  }
};

const provider = new Provider({
  provider: new WsProvider(config.nodeWs),
});

export const getProvider = (): Provider => provider;
