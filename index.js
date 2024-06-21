const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const serviceAccount = require("sveccha-11c31-firebase-adminsdk-njk55-2136da8a3b.json"); // replace with the path to your service account file

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: "https://sveccha-11c31.firebaseio.com", // replace with your actual database URL
});

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  console.log("Received webhook:", req.body);

  const { order_id, current_status } = req.body;

  if (order_id && current_status) {
    try {
      // Update the order status in Firebase
      await updateOrderStatusInFirebase(order_id, current_status);
      res.status(200).send("Webhook received and processed");
    } catch (error) {
      console.error("Error updating order status in Firebase:", error);
      res.status(500).send("Internal server error");
    }
  } else {
    console.error("Invalid payload:", req.body);
    res.status(400).send("Invalid payload");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Function to update the order status in Firebase
async function updateOrderStatusInFirebase(orderId, status) {
  const db = admin.firestore();
  const collection = db.collection("invoice_shipment_id");

  // Query the document with the matching order_ref field
  const snapshot = await collection.where("order_id", "==", orderId).get();

  if (snapshot.empty) {
    console.log("No matching documents found.");
    return;
  }

  // Update the status for each matching document
  snapshot.forEach((doc) => {
    collection
      .doc(doc.id)
      .update({ current_status: status })
      .then(() =>
        console.log(`Updated order ID ${orderId} to status ${status}`)
      )
      .catch((error) => console.error("Error updating document:", error));
  });
}
