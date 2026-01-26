require('dotenv').config();

module.exports = {
  apps: [{
    name: 'trichology-backend',
    script: 'npm',
    args: 'run start',
    cwd: '/root/backend-src',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || 3001,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      FRONTEND_URL: process.env.FRONTEND_URL,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      EMAIL_FROM: process.env.EMAIL_FROM,
      UPLOAD_DIR: process.env.UPLOAD_DIR,
      PDF_OUTPUT_DIR: process.env.PDF_OUTPUT_DIR,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    },
  }],
};
