const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Dependencies to check and install
const dependencies = [
  'express-mongo-sanitize',
  'helmet',
  'xss-clean',
  'express-rate-limit',
  'hpp',
  'colors'
];

console.log('Checking for missing dependencies...');

// Load package.json
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson;

try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Find missing dependencies
const installedDeps = Object.keys(packageJson.dependencies || {});
const missingDeps = dependencies.filter(dep => !installedDeps.includes(dep));

if (missingDeps.length === 0) {
  console.log('All dependencies are already installed.');
  process.exit(0);
}

console.log(`Installing missing dependencies: ${missingDeps.join(', ')}`);

try {
  // Install missing dependencies
  execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}
