// update-syndic-direct.js
const { db } = require('./config/firebase-config');

async function updateBuildingSyndic() {
  try {
    const buildingId = 'bWKrsgLJxCg95H7WY0qX';
    const syndicId = 'odOD7IZcTxBTFm1AXRNM';
    
    console.log(`=== Updating Building ${buildingId} to Syndic ${syndicId} ===`);
    
    // Update the building's syndic ID
    await db.collection('immeubles').doc(buildingId).update({
      syndicId: syndicId,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Building updated to be managed by syndic ${syndicId}`);
    
  } catch (error) {
    console.error('Error updating building syndic:', error);
  }
}

updateBuildingSyndic().then(() => {
  console.log('Update complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
