// find-proprietaires.js
const { db } = require('./config/firebase-config');

async function findProprietaires() {
  try {
    console.log('=== Finding All Proprietaires ===');
    
    // Get all users with role 'proprietaire'
    const proprietairesSnapshot = await db.collection('users')
      .where('role', '==', 'proprietaire')
      .get();
    
    if (proprietairesSnapshot.empty) {
      console.log('No proprietaires found in the database.');
      return;
    }
    
    console.log('Found', proprietairesSnapshot.size, 'proprietaires:');
    console.log('\n=== Proprietaires ===');
    
    let index = 1;
    proprietairesSnapshot.forEach((doc) => {
      const proprietaire = doc.data();
      console.log(`${index}. ID: ${doc.id}`);
      console.log(`   Name: ${proprietaire.firstName} ${proprietaire.lastName}`);
      console.log(`   Email: ${proprietaire.email}`);
      console.log(`   Apartment ID: ${proprietaire.appartementId}`);
      console.log('---');
      index++;
    });
    
    console.log('\nUse one of these proprietaire IDs in your API requests.');
    
  } catch (error) {
    console.error('Error finding proprietaires:', error);
  }
}

findProprietaires().then(() => {
  console.log('Search complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
