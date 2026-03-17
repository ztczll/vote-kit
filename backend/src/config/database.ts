import knex, { Knex } from 'knex';
import knexConfig from '../knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

const db: Knex = knex(config);

export default db;
