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

const queryClient = new ApolloClient({
  link: new HttpLink({
    uri: `${config.graphqlApi}`,
    fetch,
  }),
  cache: new InMemoryCache()
});

const mutateClient = new ApolloClient({
  link: new HttpLink({
    uri: `${config.graphqlApi}`,
    fetch,
    headers: {
      authorization: `Bearer ${jwt.sign({ value: "MUTATE" }, config.jwtSecret)}`
    }
  }),
  cache: new InMemoryCache()
});

export const query = async <Res>(entityName: string, statement: string): Promise<Res> => {
  const result = await queryClient.query({ query: gql(statement) });
  return result.data[entityName];
};

export const mutate = async <Res>(statement: string, input?: any): Promise<Res> => {
  const result = await mutateClient.mutate({ mutation: gql(statement), variables: input ? {input} : {}});
  return result.data;
};

const provider = new Provider({
  provider: new WsProvider(config.nodeWs),
});

export const getProvider = (): Provider => provider;
