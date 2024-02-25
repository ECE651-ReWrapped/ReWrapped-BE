// install_dependencies.js

const { exec } = require('child_process');

const dependencies = [
  'express',
  'pg',
  'passport',
  'passport-spotify',
  'spotify-web-api-node',
  'querystring',
  'express-session',
  'crypto',
  'request',
  'fs',
  'path',
];

const installCommand = `npm install ${dependencies.join(' ')}`;

exec(installCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error during installation: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Installation warnings: ${stderr}`);
    return;
  }

  console.log('Dependencies installed successfully.');
});
