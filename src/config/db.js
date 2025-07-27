// ct313hm02-project-DrStone113/backend-api/src/config/db.js
const knex = require('knex');
const knexConfig = require('../../knexfile'); 

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

module.exports = knex(config);