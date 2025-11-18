// server.js (Updated with Connection Pooling)

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors'); // <-- 1. Import cors
const fs = require('fs');

const dbConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: process.env.DB_USER || '2H2yQBmKbT2t1zf.root',
  password: process.env.DB_PASS || '3MrAkbr20DjeguBM',
  database: process.env.DB_NAME || 'test',
  port: 4000,
  ssl: {
    ca: fs.readFileSync(process.env.DB_CA)
  }
};

console.log("ATTEMPTING TO CONNECT TO DATABASE:");
console.log("HOST:", process.env.DB_HOST);
console.log("USER:", process.env.DB_USER);
console.log("DATABASE NAME:", process.env.DB_NAME);

// Create a pool of connections instead of a single one
const pool = mysql.createPool(dbConfig);
console.log('MySQL Connection Pool created.');

const corsOptions = {
  origin: 'https://real-crm-frontend.vercel.app' // Allow only your frontend to access
};

const app = express();
app.use(bodyParser.json());
app.use(cors(corsOptions));


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