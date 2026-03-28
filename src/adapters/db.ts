import { StrictDB } from 'strictdb';

// Store the Promise itself so concurrent cold-start calls share one connection
// rather than racing to create multiple instances.
let _instance: Promise<StrictDB> | null = null;

export function getDb(): Promise<StrictDB> {
  if (!_instance) {
    // StrictDB internally uses MONGODB_URI for pool lookups — bridge from STRICTDB_URI if needed.
    const uri = process.env.MONGODB_URI ?? process.env.STRICTDB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    if (!process.env.MONGODB_URI) process.env.MONGODB_URI = uri;
    _instance = StrictDB.create({ uri }).catch((err) => {
      _instance = null;
      return Promise.reject(err);
    });
  }
  return _instance;
}
