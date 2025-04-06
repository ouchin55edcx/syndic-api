const Syndic = require('../models/syndic');
const { db } = require('../config/firebase-config');

const defaultSyndicData = {
  email: 'admin@syndic.com',
  password: 'admin123', 
  firstName: 'Admin',
  lastName: 'Syndic',
  phoneNumber: '0123456789',
  company: 'Default Syndic Company',
  licenseNumber: 'SYN-12345'
};

const initDefaultSyndic = async () => {
  try {
    console.log('Checking for default syndic...');
    
    const syndicSnapshot = await db.collection('users')
      .where('role', '==', 'syndic')
      .limit(1)
      .get();
    
    if (syndicSnapshot.empty) {
      console.log('No syndic found. Creating default syndic...');
      
      try {
        const syndic = await Syndic.create(defaultSyndicData);
        console.log(`Default syndic created with ID: ${syndic.id}`);
        return syndic;
      } catch (createError) {
        console.error('Error creating default syndic:', createError);
        throw createError;
      }
    } else {
      console.log('Default syndic already exists.');
      const syndicDoc = syndicSnapshot.docs[0];
      return new Syndic(syndicDoc.id, syndicDoc.data());
    }
  } catch (error) {
    console.error('Error initializing default syndic:', error);
    throw error;
  }
};

module.exports = initDefaultSyndic;

if (require.main === module) {
  initDefaultSyndic()
    .then(() => {
      console.log('Default syndic initialization complete.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Default syndic initialization failed:', error);
      process.exit(1);
    });
}
