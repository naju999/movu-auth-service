'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      role_name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
    }, {
      schema: process.env.DB_SCHEMA || 'auth_service'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'roles', schema: process.env.DB_SCHEMA || 'auth_service' });
  }
};
