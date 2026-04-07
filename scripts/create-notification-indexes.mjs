/**
 * One-time script to create MongoDB indexes for the notification system.
 * Run with: node scripts/create-notification-indexes.mjs
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read MONGODB_URI from .env.local
const envPath = resolve(__dirname, '../.env.local');
const env = readFileSync(envPath, 'utf8');
const match = env.match(/^MONGODB_URI="?([^"\n]+)"?/m);
if (!match) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}
const uri = match[1];

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db('sheet-admin');

  // 1. Unique index on notification_subscriptions.email
  await db.collection('notification_subscriptions').createIndex(
    { email: 1 },
    { unique: true, name: 'email_unique' },
  );
  console.log('✓ notification_subscriptions: unique index on email');

  // 2. Compound query index on notifications
  await db.collection('notifications').createIndex(
    { recipientEmail: 1, read: 1, createdAt: -1 },
    { name: 'recipient_read_date' },
  );
  console.log('✓ notifications: compound index (recipientEmail, read, createdAt)');

  // 3. TTL index: auto-delete read notifications after 30 days
  await db.collection('notifications').createIndex(
    { createdAt: 1 },
    {
      expireAfterSeconds: 2592000,
      partialFilterExpression: { read: true },
      name: 'ttl_read_30d',
    },
  );
  console.log('✓ notifications: TTL index on createdAt (read docs, 30 days)');

  console.log('\nAll indexes created successfully.');
} finally {
  await client.close();
}
