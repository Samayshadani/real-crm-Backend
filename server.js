

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');

const app = express();



const dbConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: process.env.DB_USER || '2H2yQBmKbT2t1zf.root',
  password: process.env.DB_PASS || '3MrAkbr20DjeguBM',
  database: process.env.DB_NAME || 'test',
  port: 4000,
  ssl: process.env.DB_CA
    ? {
        ca: fs.readFileSync(process.env.DB_CA),
      }
    : undefined,
};

console.log("========== DATABASE CONFIG ==========");
console.log("HOST:", dbConfig.host);
console.log("USER:", dbConfig.user);
console.log("DATABASE:", dbConfig.database);
console.log("=====================================");

/* ================================
   CREATE CONNECTION POOL
================================ */

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log('✅ MySQL Connection Pool created.');



// const allowedOrigins = [
//   'http://localhost:8010',
//   'https://barphani.vasifytech.com'
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(null, false); 
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true,
// }));


/* ================================
   CORS CONFIGURATION
================================ */
const allowedOrigins = [
  'http://localhost:8010',
  'https://barphani.vasifytech.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed origin: ${origin}`);  // Debug log
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);  // Debug log
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200  // For older browsers
}));

// Handle preflight requests
// app.options('*', cors());

/* ================================
   MIDDLEWARE
================================ */

app.use(bodyParser.json());
app.use(express.json());

// Attach DB pool to every request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

/* ================================
   ROUTES
================================ */

const whatsappRoutes = require('./routes/whatsapp');
const leadsRoutes = require('./routes/leads');
const duplicatesRoutes = require('./routes/duplicates');

app.use('/api/leads', leadsRoutes);
app.use('/api/contacts', whatsappRoutes);
app.use('/api/duplicates', duplicatesRoutes);

/* ================================
   HEALTH CHECK
================================ */

app.get('/', (req, res) => {
  res.send('🚀 Server is running successfully');
});

/* ================================
   START SERVER
================================ */

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});