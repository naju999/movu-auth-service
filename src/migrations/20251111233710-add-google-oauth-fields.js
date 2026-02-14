'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'auth_service';
    
    // Helper para agregar columna de forma segura
    async function addColumnSafely(columnName, definition) {
      try {
        const tableDescription = await queryInterface.describeTable({ tableName: 'USERS', schema });
        if (!tableDescription[columnName]) {
          await queryInterface.addColumn({ tableName: 'USERS', schema }, columnName, definition);
          console.log(`✅ Columna ${columnName} agregada`);
        } else {
          console.log(`ℹ️ Columna ${columnName} ya existe`);
        }
      } catch (error) {
        console.error(`❌ Error al agregar columna ${columnName}:`, error.message);
      }
    }
    
    await addColumnSafely('google_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    await addColumnSafely('auth_provider', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'local'
    });
    
    await addColumnSafely('profile_picture', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    // Hacer password nullable para usuarios de Google
    try {
      await queryInterface.changeColumn({ tableName: 'USERS', schema }, 'password', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Columna password ahora es nullable');
    } catch (error) {
      console.log('ℹ️ Password ya es nullable o hubo un error:', error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'auth_service';
    
    await queryInterface.removeColumn({ tableName: 'USERS', schema }, 'google_id');
    await queryInterface.removeColumn({ tableName: 'USERS', schema }, 'auth_provider');
    await queryInterface.removeColumn({ tableName: 'USERS', schema }, 'profile_picture');
    
    await queryInterface.changeColumn({ tableName: 'USERS', schema }, 'password', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
