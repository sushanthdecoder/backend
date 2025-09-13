const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');

// Use a service account key from an environment variable if available
let serviceAccount;
if (process.env.FIREBASE_SERVICE_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
  } catch (e) {
    throw new Error('Invalid FIREBASE_SERVICE_KEY JSON in environment variable');
  }
} else {
  // fallback for local development (file must be in root, NOT committed to git)
  serviceAccount = require('../firebase-service-key.json');
}

// Prevent double initialization in dev
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const app = express();
const corsOptions = {
  origin: 'https://sih-hackthon-alpha.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable CORS preflight for all routes
app.use(bodyParser.json());

// In-memory token storage - NOT for production!
let tokens = [];

// Register FCM token
app.post('/register-token', (req, res) => {
  const { token } = req.body;
  if (token && !tokens.includes(token)) tokens.push(token);
  res.send({ status: 'token registered' });
});

// Trigger alert to all registered tokens
app.post('/trigger-alert', async (req, res) => {
  const { disaster, message } = req.body;
  const notification = {
    title: `⚠️ ${disaster} ALERT!`,
    body: `Tap to see alert: ${message}`,
    disaster,
    message
  };
  const payload = {
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: {
      disaster,
      message
    }
  };
  try {
    const response = await admin.messaging().sendMulticast({
      ...payload,
      tokens
    });
    res.send({ status: 'Alert sent', success: response.successCount, failure: response.failureCount });
  } catch (err) {
    res.status(500).send({ status: 'error', message: err.message });
  }
});

// Export the app for Vercel serverless
module.exports = app;