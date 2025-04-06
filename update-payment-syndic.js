// update-payment-syndic.js
const { db } = require('./config/firebase-config');

async function updatePaymentSyndic() {
  try {
    const oldSyndicId = '14m38ihtUAynxcrn1SuU';
    const newSyndicId = 'odOD7IZcTxBTFm1AXRNM';
    
    console.log(`=== Updating Payments from Syndic ${oldSyndicId} to Syndic ${newSyndicId} ===`);
    
    // Get all payments with the old syndic ID
    const paymentsSnapshot = await db.collection('payments')
      .where('syndicId', '==', oldSyndicId)
      .get();
    
    if (paymentsSnapshot.empty) {
      console.log('No payments found with the old syndic ID.');
      return;
    }
    
    console.log(`Found ${paymentsSnapshot.size} payments to update.`);
    
    // Update each payment
    const batch = db.batch();
    
    paymentsSnapshot.forEach(doc => {
      const paymentRef = db.collection('payments').doc(doc.id);
      batch.update(paymentRef, { 
        syndicId: newSyndicId,
        updatedAt: new Date().toISOString()
      });
      console.log(`Queued update for payment ${doc.id}`);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`✅ Successfully updated ${paymentsSnapshot.size} payments to new syndic ID.`);
    
  } catch (error) {
    console.error('Error updating payment syndic IDs:', error);
  }
}

updatePaymentSyndic().then(() => {
  console.log('Update complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
