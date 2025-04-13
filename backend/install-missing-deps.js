const { execSync } = require('child_process');

// Just install the missing dependencies directly
console.log('Installing required dependencies...');

try {
  execSync('npm install express-mongo-sanitize xss-clean hpp express-rate-limit colors', { 
    stdio: 'inherit' 
  });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}
