// find-buildings.js
const { db } = require('./config/firebase-config');

async function findBuildings() {
  try {
    console.log('=== Finding All Buildings ===');
    
    // Get all buildings
    const buildingsSnapshot = await db.collection('immeubles').get();
    
    if (buildingsSnapshot.empty) {
      console.log('No buildings found in the database.');
      return;
    }
    
    console.log('Found', buildingsSnapshot.size, 'buildings:');
    console.log('\n=== Buildings ===');
    
    for (const doc of buildingsSnapshot.docs) {
      const building = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${building.nom}`);
      console.log(`Address: ${building.adresse}, ${building.ville}, ${building.codePostal}`);
      console.log(`Syndic ID: ${building.syndicId}`);
      
      // Get syndic info
      if (building.syndicId) {
        const syndicDoc = await db.collection('users').doc(building.syndicId).get();
        if (syndicDoc.exists) {
          const syndic = syndicDoc.data();
          console.log(`Syndic Name: ${syndic.firstName} ${syndic.lastName}`);
          console.log(`Syndic Email: ${syndic.email}`);
        } else {
          console.log(`Syndic not found for ID: ${building.syndicId}`);
        }
      }
      
      // Get apartments in this building
      const apartmentsSnapshot = await db.collection('appartements')
        .where('immeubleId', '==', doc.id)
        .get();
      
      console.log(`Number of apartments: ${apartmentsSnapshot.size}`);
      
      if (!apartmentsSnapshot.empty) {
        console.log('Apartments:');
        apartmentsSnapshot.forEach((aptDoc, index) => {
          const apt = aptDoc.data();
          console.log(`  ${index + 1}. ID: ${aptDoc.id}, Number: ${apt.numero}, Floor: ${apt.etage}`);
        });
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error finding buildings:', error);
  }
}

findBuildings().then(() => {
  console.log('Search complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
