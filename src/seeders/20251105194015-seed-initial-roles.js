'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'auth_service';
    await queryInterface.bulkInsert({ tableName: 'roles', schema: schema }, [
      { role_name: 'user' },
      { role_name: 'admin' }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'auth_service';
    await queryInterface.bulkDelete({ tableName: 'roles', schema: schema }, {
      role_name: ['user', 'admin']
    }, {});
  }
};
