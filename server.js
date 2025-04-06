// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const testRoutes = require('./routes/test-routes');
const authRoutes = require('./routes/auth-routes');
const proprietaireRoutes = require('./routes/proprietaire-routes');
const reunionRoutes = require('./routes/reunion-routes');
const notificationRoutes = require('./routes/notification-routes');
const chargeRoutes = require('./routes/charge-routes');
const financialReportRoutes = require('./routes/financial-report-routes');
const paymentRoutes = require('./routes/payment-routes');
const appartementRoutes = require('./routes/appartement-routes');
const path = require('path');

// Import initialization scripts
const initDefaultSyndic = require('./scripts/init-default-syndic');
const seedImmeubleWithAppartements = require('./scripts/seed-immeuble-appartement');

const app = express();
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request Body:', req.body);
  next();
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/proprietaires', proprietaireRoutes);
app.use('/api/reunions', reunionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/financial-reports', financialReportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/appartements', appartementRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Express Firebase API' });
});

// Initialize the default syndic when the server starts
initDefaultSyndic()
  .then(syndic => {
    console.log(`Default syndic initialized: ${syndic.firstName} ${syndic.lastName}`);

    // Seed immeubles and appartements after syndic is initialized
    return seedImmeubleWithAppartements(syndic.id);
  })
  .then(() => {
    console.log('Immeubles and appartements seeded successfully');
  })
  .catch(error => {
    console.error('Initialization error:', error);
  });

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});