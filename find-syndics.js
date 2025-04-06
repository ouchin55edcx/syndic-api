// find-syndics.js
const { db } = require('./config/firebase-config');

async function findSyndics() {
  try {
    console.log('=== Finding All Syndics ===');
    
    // Get all users with role 'syndic'
    const syndicsSnapshot = await db.collection('users')
      .where('role', '==', 'syndic')
      .get();
    
    if (syndicsSnapshot.empty) {
      console.log('No syndics found in the database.');
      return;
    }
    
    console.log('Found', syndicsSnapshot.size, 'syndics:');
    console.log('\n=== Syndics ===');
    
    syndicsSnapshot.forEach((doc, index) => {
      const syndic = doc.data();
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Name: ${syndic.firstName} ${syndic.lastName}`);
      console.log(`   Email: ${syndic.email}`);
      console.log('---');
    });
    
    console.log('\nUse one of these syndic IDs in your debug-syndic-charge.js script.');
    
  } catch (error) {
    console.error('Error finding syndics:', error);
  }
}

findSyndics().then(() => {
  console.log('Search complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
