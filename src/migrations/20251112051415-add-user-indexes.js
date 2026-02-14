'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'auth_service';
    
    // Helper function para crear índice de forma segura
    async function createIndexSafely(indexName, columnName) {
      try {
        await queryInterface.addIndex(
          { tableName: 'USERS', schema },
          [columnName],
          {
            name: indexName,
            unique: false
          }
        );
        console.log(`✅ Índice ${indexName} creado`);
      } catch (error) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️ Índice ${indexName} ya existe, saltando`);
        } else if (error.message && error.message.includes('does not exist')) {
          console.warn(`⚠️ Columna ${columnName} no existe, saltando índice ${indexName}`);
        } else {
          console.error(`❌ Error al crear índice ${indexName}:`, error.message);
        }
      }
    }
    
    // Crear índices de forma segura
    await createIndexSafely('idx_users_google_id', 'google_id');
    await createIndexSafely('idx_users_email', 'email');
    await createIndexSafely('idx_users_auth_provider', 'auth_provider');
  },

  async down (queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'auth_service';
    
    // Eliminar índices
    await queryInterface.removeIndex(
      { tableName: 'USERS', schema },
      'idx_users_google_id'
    );
    
    await queryInterface.removeIndex(
      { tableName: 'USERS', schema },
      'idx_users_email'
    );
    
    await queryInterface.removeIndex(
      { tableName: 'USERS', schema },
      'idx_users_auth_provider'
    );
  }
};
