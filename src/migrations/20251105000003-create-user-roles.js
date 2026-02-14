'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_roles', {
      user_role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'roles',
            schema: process.env.DB_SCHEMA || 'auth_service'
          },
          key: 'role_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'USERS',
            schema: process.env.DB_SCHEMA || 'auth_service'
          },
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    }, {
      schema: process.env.DB_SCHEMA || 'auth_service'
    });

    const schema = process.env.DB_SCHEMA || 'auth_service';
    await queryInterface.addIndex({
      tableName: 'user_roles',
      schema: schema
    }, ['user_id', 'role_id'], {
      unique: true,
      name: 'unique_user_role'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'user_roles', schema: process.env.DB_SCHEMA || 'auth_service' });
  }
};
