const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: "https://sveccha-11c31.firebaseio.com" // replace with your actual database URL
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    // Log the entire incoming request for debugging
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));

    const { order_id, current_status } = req.body;

    if (order_id && current_status) {
        try {
            console.log(`Processing order ID: ${order_id} with status: ${current_status}`);
            // Update the order status in Firebase
            await updateOrderStatusInFirebase(order_id, current_status);
            console.log(`Successfully updated order ID: ${order_id}`);
            res.status(200).send('Webhook received and processed');
        } catch (error) {
            console.error('Error updating order status in Firebase:', error);
            res.status(500).send('Internal server error');
        }
    } else {
        console.error('Invalid payload received:', req.body);
        res.status(400).send('Invalid payload');
    }
});

// Function to update the order status in Firebase
async function updateOrderStatusInFirebase(orderId, status) {
    const db = admin.firestore();
    const collection = db.collection('invoice_shipment_id');

    // Query the document with the matching order_id field
    const snapshot = await collection.where('order_id', '==', orderId).get();

    if (snapshot.empty) {
        console.log('No matching documents found for order ID:', orderId);
        return;
    }

    // Update the status for each matching document
    snapshot.forEach(doc => {
        collection.doc(doc.id).update({ current_status: status })
            .then(() => console.log(`Updated document ${doc.id} for order ID ${orderId} to status ${status}`))
            .catch(error => console.error('Error updating document:', error));
    });
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
