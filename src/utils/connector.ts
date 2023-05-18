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

const queryClient = new ApolloClient({
  link: new HttpLink({
    uri: `${config.explorerApi}`,
    fetch,
  }),
  cache: new InMemoryCache()
});

const mutateClient = new ApolloClient({
  link: new HttpLink({
    uri: `${config.explorerApi}`,
    fetch,
    headers: {
      authorization: `Bearer ${jwt.sign({ value: "MUTATE" }, config.jwtSecret)}`
    }
  }),
  cache: new InMemoryCache()
});

const logError = (error: any): any => {
  if (error.networkError?.result?.errors?.length) {
    console.log(error.networkError.result.errors);
  } else if (error.message) {
    console.log(error.message);
  } else {
    console.log(error);
  }
}

export const query = async <Res>(entityName: string, statement: string): Promise<Res | null> => {
  try {
    const result = await queryClient.query({ query: gql(statement), fetchPolicy: 'no-cache' });
    return result.data[entityName];
  } catch (error) {
    console.log(`ERROR for query: ${trim(statement)}`)
    logError(error);
    return null;
  }
};

export const mutate = async <Res>(statement: string, input?: any): Promise<Res | null> => {
  try {
    const result = await mutateClient.mutate({ mutation: gql(statement), variables: input ? {input} : {}});
    return result.data;
  } catch (error) {
    console.log(`ERROR for mutation: ${trim(statement)}`)
    logError(error);
    return null;
  }
};

const provider = new Provider({
  provider: new WsProvider(config.nodeWs),
});

export const getProvider = (): Provider => provider;
