#!/usr/bin/env node
/**
 * create-admin-user.js
 * Sets role='admin' for teste@compreouvenda.com in the users table.
 * Adds the column if it doesn't exist yet.
 */

const { Client } = require('pg');

const TARGET_EMAIL = 'teste@compreouvenda.com';

const client = new Client({
  host: 'db.auxaajrjwbdsnxtvgmsb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '122459pa01#01',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL');

  // 1. Ensure the role column exists
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
  `);
  console.log('Column "role" ensured on users table');

  // 2. Update the target user
  const updateRes = await client.query(
    `UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, email, role`,
    [TARGET_EMAIL]
  );

  if (updateRes.rowCount === 0) {
    console.warn(`\nWARNING: No user found with email "${TARGET_EMAIL}".`);
    console.warn('Make sure the user has signed up first, then re-run this script.');
  } else {
    console.log(`\nSuccess! Updated ${updateRes.rowCount} row(s):`);
    console.table(updateRes.rows);
  }

  // 3. Verify
  const check = await client.query(
    `SELECT id, email, role, created_at FROM users WHERE email = $1`,
    [TARGET_EMAIL]
  );
  console.log('\nCurrent state:');
  console.table(check.rows);

  await client.end();
  console.log('\nDone. Connection closed.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
