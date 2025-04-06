// find-apartments.js
const { db } = require('./config/firebase-config');

async function findApartments() {
  try {
    console.log('=== Finding All Apartments ===');
    
    // Get all apartments
    const apartmentsSnapshot = await db.collection('appartements').get();
    
    if (apartmentsSnapshot.empty) {
      console.log('No apartments found in the database.');
      return;
    }
    
    console.log('Found', apartmentsSnapshot.size, 'apartments:');
    console.log('\n=== Apartments ===');
    
    for (const doc of apartmentsSnapshot.docs) {
      const apartment = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Number: ${apartment.numero}`);
      console.log(`Floor: ${apartment.etage}`);
      console.log(`Building ID: ${apartment.immeubleId}`);
      
      // Get building info
      if (apartment.immeubleId) {
        const buildingDoc = await db.collection('immeubles').doc(apartment.immeubleId).get();
        if (buildingDoc.exists) {
          const building = buildingDoc.data();
          console.log(`Building Name: ${building.nom}`);
          console.log(`Building Syndic ID: ${building.syndicId}`);
        } else {
          console.log(`Building not found for ID: ${apartment.immeubleId}`);
        }
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error finding apartments:', error);
  }
}

findApartments().then(() => {
  console.log('Search complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
