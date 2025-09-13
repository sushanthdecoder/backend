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
  // fallback for local development
  serviceAccount = require('../firebase-service-key.json');
}

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
app.options('*', cors(corsOptions)); // <--- CRUCIAL for preflight!
app.use(bodyParser.json());

let tokens = [];

app.post('/register-token', (req, res) => {
  const { token } = req.body;
  if (token && !tokens.includes(token)) tokens.push(token);
  res.send({ status: 'token registered' });
});

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

module.exports = app;