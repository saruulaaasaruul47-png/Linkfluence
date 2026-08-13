import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const directory = path.resolve(process.env.BACKUP_DIRECTORY || 'backups');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const target = path.join(directory, `influence-hub-${stamp}.dump`);
const processHandle = spawn('pg_dump', ['--format=custom', '--no-owner', '--file', target, databaseUrl], { stdio: 'inherit', shell: false });
processHandle.on('exit', (code) => {
  if (code) process.exit(code);
  console.log(JSON.stringify({ level: 'info', event: 'database_backup_complete', target }));
});
