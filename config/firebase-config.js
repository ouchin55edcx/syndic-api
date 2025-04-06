const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const serviceAccount = require(path.join(__dirname, '..', 'pfe-project-97821-firebase-adminsdk-fbsvc-ac37cf24d0.json'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://pfe-project-97821.firebaseio.com`
  });

  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1); 
}

const db = admin.firestore();

db.settings({
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true
});

const testFirestoreConnection = async () => {
  try {
    await db.listCollections();
    console.log('Successfully connected to Firestore');
    return true;
  } catch (error) {
    console.error('Firestore connection error:', error.message);
    console.log('Make sure you have created a Firestore database in your Firebase project');
    console.log('Visit: https://console.firebase.google.com/project/pfe-project-97821/firestore to create one');
    return false;
  }
};

testFirestoreConnection();

module.exports = { admin, db };
