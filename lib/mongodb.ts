import 'server-only';
import { MongoClient, type Db } from 'mongodb';

// In development, use a global to preserve the connection across HMR reloads.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let _prodClientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI environment variable');
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  if (!_prodClientPromise) {
    _prodClientPromise = new MongoClient(uri).connect();
  }
  return _prodClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db('sheet-admin');
}
