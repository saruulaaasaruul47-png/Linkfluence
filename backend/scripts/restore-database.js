import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [source] = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!source) throw new Error('Usage: npm run db:restore -- <backup.dump>');
const absolute = path.resolve(source);
if (!fs.existsSync(absolute)) throw new Error(`Backup not found: ${absolute}`);
if (process.env.CONFIRM_DATABASE_RESTORE !== 'RESTORE') throw new Error('Set CONFIRM_DATABASE_RESTORE=RESTORE to confirm this destructive operation.');
const processHandle = spawn('pg_restore', ['--clean', '--if-exists', '--no-owner', '--dbname', databaseUrl, absolute], { stdio: 'inherit', shell: false });
processHandle.on('exit', (code) => process.exit(code || 0));
