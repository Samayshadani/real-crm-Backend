// server.js (Updated with Connection Pooling)

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '43.204.203.98',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root@autoPart',
  database: process.env.DB_NAME || 'LeadcaptureCRM',
  waitForConnections: true,
  connectionLimit: 10, // Adjust as needed
  queueLimit: 0
};

// Create a pool of connections instead of a single one
const pool = mysql.createPool(dbConfig);
console.log('MySQL Connection Pool created.');

const app = express();
app.use(bodyParser.json());

const whatsappRoutes = require('./routes/whatsapp');
const leadsRoutes = require('./routes/leads');
const duplicatesRoutes = require('./routes/duplicates');

// Middleware to attach the pool to every request
app.use((req, res, next) => {
  // Instead of creating a new connection, we attach the whole pool
  // The routes will be responsible for getting a connection from the pool
  req.db = pool;
  next();
});

app.use('/api/leads', leadsRoutes);
app.use('/api/contacts', whatsappRoutes);
app.use('/api/duplicates', duplicatesRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));