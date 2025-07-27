// knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres', 
      password: process.env.DB_PASSWORD || '1', 
      database: process.env.DB_NAME || 'clothing_db', 
    },
    migrations: {
      directory: './migrations', 
    },
    seeds: {
      directory: './seeds', 
    },
  },
 
};