import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory (parent of dist)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vote_kit_dev',
    },
    migrations: {
      directory: './database/migrations',
      extension: 'js',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vote_kit_test',
    },
    migrations: {
      directory: './database/migrations',
      extension: 'js',
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './database/migrations',
      extension: 'js',
    },
  },
};

export default config;
