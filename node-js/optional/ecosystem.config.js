require("dotenv").config();

module.exports = {
  apps: [
    {
      name: 'my-app',
      script: 'server.js',
      watch: true,
      ignore_watch: ['node_modules', 'logs'],
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 8000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000
      }
    }
  ]
};
