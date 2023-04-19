import { Sequelize } from "sequelize-typescript";
import config from "../utils/config";
import { VerifiedContractMainnet, VerifiedContractTestnet } from "./VerifiedContract.db";

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
     models: [VerifiedContractMainnet, VerifiedContractTestnet],
     repositoryMode: true,
       dialectOptions:{
           connectTimeout: 30000
       }
   }
 );
