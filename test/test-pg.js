const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://root:kmnRR5ema6si@43.142.234.139:5432/lobehub'
});

client.connect()
  .then(() => console.log('✅ Connected!'))
  .catch(err => console.error('❌ Connection failed:', err));

  