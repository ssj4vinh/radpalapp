/**
 * Test script to verify agent logic IPC is working
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Set fetch globally
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
  console.log('✅ node-fetch configured');
}

// Test Supabase connection
const supabaseUrl = 'https://ynzikfmpzhtohwsfniqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluemlrZm1wemh0b2h3c2ZuaXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjc5NzYsImV4cCI6MjA2NTY0Mzk3Nn0.uHIXkVvI03vjZ0XdLPkkznME1K0ivDJ6FVU2VeoJdHc';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: global.fetch
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Test a simple query
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('user_default_logic')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Query error:', error);
    } else {
      console.log('✅ Query successful, connection working!');
    }
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

testConnection();