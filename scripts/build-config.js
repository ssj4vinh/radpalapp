const fs = require('fs');
const path = require('path');

// Make dotenv optional for production builds
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not found, using environment variables directly');
}

// Generate config.js with environment variables
const config = `// This file is generated at build time
// DO NOT COMMIT THIS FILE TO VERSION CONTROL
module.exports = {
  VITE_SUPABASE_URL: '${process.env.VITE_SUPABASE_URL || ''}',
  VITE_SUPABASE_ANON_KEY: '${process.env.VITE_SUPABASE_ANON_KEY || ''}',
  OPENAI_API_KEY: '${process.env.OPENAI_API_KEY || ''}',
  ANTHROPIC_API_KEY: '${process.env.ANTHROPIC_API_KEY || ''}',
  GEMINI_API_KEY: '${process.env.GEMINI_API_KEY || ''}',
  MOONSHOT_API_KEY: '${process.env.MOONSHOT_API_KEY || ''}',
  DEEP_GRAM_API: '${process.env.DEEP_GRAM_API || ''}'
};`;

const configPath = path.join(__dirname, '..', 'electron', 'config.js');
fs.writeFileSync(configPath, config);
console.log('Config file generated successfully');