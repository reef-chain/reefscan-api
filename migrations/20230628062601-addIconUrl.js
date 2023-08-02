'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */

const tableMainnet = 'verified_contract_mainnet';
const tableTestnet = 'verified_contract_testnet';
const columnName = 'iconUrl'; 

module.exports = {
  async up ({ context: queryInterface }) {
    const tableMainnetInfo = await queryInterface.describeTable(tableMainnet);
    if (!tableMainnetInfo[columnName]) {
      await queryInterface.addColumn(tableMainnet, columnName, { 
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    const tableTestnetInfo = await queryInterface.describeTable(tableTestnet);
    if (!tableTestnetInfo[columnName]) {
      await queryInterface.addColumn(tableTestnet, columnName, { 
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down ({ context: queryInterface }) {
    await queryInterface.removeColumn(tableMainnet, columnName);
    await queryInterface.removeColumn(tableTestnet, columnName);
  }
};
