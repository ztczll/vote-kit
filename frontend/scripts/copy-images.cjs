const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.join(frontendDir, '..');
const src = path.join(repoRoot, 'resource', 'images');
const dest = path.join(frontendDir, 'public', 'images');

if (!fs.existsSync(path.join(frontendDir, 'public'))) {
  fs.mkdirSync(path.join(frontendDir, 'public'), { recursive: true });
}
fs.cpSync(src, dest, { recursive: true });
console.log('Copied resource/images to public/images');
