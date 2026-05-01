const path = require('path');
const { spawn } = require('child_process');

const dir = __dirname;
process.chdir(dir);

const cmd = process.argv[2] || 'dev';
const child = spawn(
  process.execPath,
  [path.join(dir, 'node_modules', 'next', 'dist', 'bin', 'next'), cmd, '-p', '3000'],
  { stdio: 'inherit', cwd: dir }
);

child.on('exit', (code) => process.exit(code));
