'use strict';

const { Sequelize } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up ({ context: queryInterface }) {
    await queryInterface.addColumn('verified_contract_mainnet', 'iconUrl', { 
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('verified_contract_testnet', 'iconUrl', { 
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down ({ context: queryInterface }) {
    await queryInterface.removeColumn('verified_contract_mainnet', 'iconUrl');
    await queryInterface.removeColumn('verified_contract_testnet', 'iconUrl');
  }
};
