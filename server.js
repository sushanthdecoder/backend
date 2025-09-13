const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cors = require("cors");

// --- Load Firebase service account ---
let serviceAccount;

if (process.env.FIREBASE_SERVICE_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
  } catch (e) {
    throw new Error("Invalid FIREBASE_SERVICE_KEY JSON");
  }
} else {
  // fallback for local dev
  serviceAccount = require("./firebase-service-key.json");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// --- Express App ---
const app = express();

// CORS (allow all origins for now – can restrict later if needed)
app.use(cors());
app.use(bodyParser.json());

let tokens = [];

// Register device FCM token
app.post("/register-token", (req, res) => {
  const { token } = req.body;
  if (token && !tokens.includes(token)) {
    tokens.push(token);
  }
  res.send({ status: "token registered", total: tokens.length });
});

// Trigger alert push notification
app.post("/trigger-alert", async (req, res) => {
  const { disaster, message } = req.body;

  const notification = {
    title: `⚠️ ${disaster} ALERT!`,
    body: `Tap to see alert: ${message}`,
  };

  const payload = {
    notification,
    data: {
      disaster: disaster || "",
      message: message || "",
    },
  };

  try {
    const response = await admin.messaging().sendMulticast({
      ...payload,
      tokens,
    });

    res.send({
      status: "Alert sent",
      success: response.successCount,
      failure: response.failureCount,
    });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
});

// --- Start server   ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
