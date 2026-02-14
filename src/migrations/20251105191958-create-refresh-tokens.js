'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      token_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      token: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_revoked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    }, {
      schema: process.env.DB_SCHEMA || 'auth_service'
    });

    const schema = process.env.DB_SCHEMA || 'auth_service';
    
    await queryInterface.addIndex({
      tableName: 'refresh_tokens',
      schema: schema
    }, ['user_id'], {
      name: 'idx_refresh_tokens_user_id'
    });

    await queryInterface.addIndex({
      tableName: 'refresh_tokens',
      schema: schema
    }, ['token'], {
      name: 'idx_refresh_tokens_token'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'refresh_tokens', schema: process.env.DB_SCHEMA || 'auth_service' });
  }
};
