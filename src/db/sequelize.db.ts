import { Sequelize } from "sequelize-typescript";
import config from "../utils/config";
import { VerifiedContractMainnet, VerifiedContractTestnet } from "./VerifiedContract.db";
// TODO: @anukulpandey remove after campaign is over
import { MagicSquare } from "./MagicSquare.db";

//let connStr = `postgres://${config.dbUser}:${config.dbPassword}@${config.dbHost}/${config.dbName}`;
//export const sequelize = new Sequelize(connStr, {
//    models: [VerifiedContractMainnet, VerifiedContractTestnet],
//    repositoryMode: true,});
 export const sequelize = new Sequelize(
   config.dbName,
   config.dbUser,
   config.dbPassword,
   {
     host: config.dbHost,
     dialect: "postgres",
     logging: false,
     models: [VerifiedContractMainnet, VerifiedContractTestnet,MagicSquare],
     repositoryMode: true,
     dialectOptions:{
        connectTimeout: 30000
     }
   }
 );
