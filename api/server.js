const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Path to the service key (relative to api/server.js)
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error('Missing firebase-service-key.json! Make sure to upload it as a secret on Vercel, or add it locally for development.');
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const corsOptions = {
  origin: 'https://sih-hackthon-alpha.vercel.app', // <-- your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes
app.use(bodyParser.json());

// In-memory token storage (WARNING: Will NOT persist between serverless invocations!)
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
      disaster: disaster,
      message: message
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