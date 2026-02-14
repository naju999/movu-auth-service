'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `CREATE SCHEMA IF NOT EXISTS ${process.env.DB_SCHEMA || 'auth_service'};`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `DROP SCHEMA IF EXISTS ${process.env.DB_SCHEMA || 'auth_service'} CASCADE;`
    );
  }
};
