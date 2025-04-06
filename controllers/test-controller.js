const { db } = require('../config/firebase-config');

exports.getAllItems = async (req, res) => {
  try {
    const collectionRef = db.collection('items');

    try {
      await db.listCollections();

      const snapshot = await collectionRef.limit(1).get();

      if (snapshot.empty) {
        return res.status(200).json([]);
      }

      const itemsSnapshot = await collectionRef.get();
      const items = [];

      itemsSnapshot.forEach(doc => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.status(200).json(items);
    } catch (dbError) {
      console.error('Firestore Error:', dbError);

      if (dbError.code === 5) {
        return res.status(500).json({
          message: 'Firestore database not found',
          error: 'You need to create a Firestore database in your Firebase project. Visit https://console.firebase.google.com/project/pfe-project-97821/firestore to create one.',
          originalError: dbError.message
        });
      }

      return res.status(500).json({
        message: 'Database connection error',
        error: dbError.message || 'Unknown database error'
      });
    }
  } catch (error) {
    console.error('General Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const newItem = {
      name,
      description,
      createdAt: new Date().toISOString()
    };

    try {
      await db.listCollections();

      const docRef = await db.collection('items').add(newItem);

      res.status(201).json({
        id: docRef.id,
        ...newItem
      });
    } catch (dbError) {
      console.error('Firestore Error:', dbError);

      if (dbError.code === 5) {
        return res.status(500).json({
          message: 'Firestore database not found',
          error: 'You need to create a Firestore database in your Firebase project. Visit https://console.firebase.google.com/project/pfe-project-97821/firestore to create one.',
          originalError: dbError.message
        });
      }

      return res.status(500).json({
        message: 'Database connection error',
        error: dbError.message || 'Unknown database error'
      });
    }
  } catch (error) {
    console.error('General Error:', error);
    res.status(500).json({ message: error.message });
  }
};
