import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Runs once before the suite: creates the test database if needed and rebuilds the schema from migrations.
export async function setup() {
  process.env.NODE_ENV = 'test';
  const env = require('../src/config/env.js');

  // Safety net: this drops every table, so it must never point at a real database.
  if (!/^[A-Za-z0-9_-]+_test$/.test(env.db.database)) {
    throw new Error(`Refusing to run tests: DB_NAME "${env.db.database}" must end in _test (see api/.env.test.example)`);
  }

  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4`);
  await conn.end();

  const knex = require('knex')(require('../knexfile.js'));
  await knex.migrate.rollback(undefined, true);
  await knex.migrate.latest();
  await knex.destroy();
}
