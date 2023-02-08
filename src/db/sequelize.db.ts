import { Sequelize } from "sequelize-typescript";
import config from "../utils/config";
import { VerifiedContractMainnet, VerifiedContractTestnet } from "./VerifiedContract.db";

export const sequelize = new Sequelize(
  config.dbName,
  config.dbUser,
  config.dbPassword,
  {
    host: config.dbHost,
    dialect: "postgres",
    models: [VerifiedContractMainnet, VerifiedContractTestnet],
    repositoryMode: true,
  }
);
