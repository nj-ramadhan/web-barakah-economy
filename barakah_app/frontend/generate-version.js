const fs = require('fs');
const path = require('path');

const versionInfo = {
  version: Date.now().toString(),
  builtAt: new Date().toISOString()
};

const targetPath = path.join(__dirname, 'public', 'version.json');
fs.writeFileSync(targetPath, JSON.stringify(versionInfo, null, 2));
console.log('✅ Generated public/version.json:', versionInfo);
