import { StrictDB } from 'strictdb';

// Store the Promise itself so concurrent cold-start calls share one connection
// rather than racing to create multiple instances.
let _instance: Promise<StrictDB> | null = null;

export function getDb(): Promise<StrictDB> {
  if (!_instance) {
    if (!process.env.STRICTDB_URI) {
      throw new Error('STRICTDB_URI environment variable is not set');
    }
    _instance = StrictDB.create({ uri: process.env.STRICTDB_URI });
  }
  return _instance;
}
