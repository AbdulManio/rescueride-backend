const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = require(path.join(
      __dirname,
      '../../firebase-service-account.json'
    ));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('🔥 Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
  }

  return firebaseApp;
};

module.exports = { admin, initFirebase };
