// check-payments.js
const { db } = require('./config/firebase-config');

async function checkPayments() {
  try {
    console.log('=== Checking All Payments in Database ===');
    
    // Get all payments
    const paymentsSnapshot = await db.collection('payments').get();
    
    if (paymentsSnapshot.empty) {
      console.log('No payments found in the database.');
      return;
    }
    
    console.log('Found', paymentsSnapshot.size, 'payments:');
    
    paymentsSnapshot.forEach((doc, index) => {
      const payment = doc.data();
      console.log(`\n--- Payment ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Amount: ${payment.montant}`);
      console.log(`Date: ${payment.datePayment}`);
      console.log(`Method: ${payment.methodePaiement}`);
      console.log(`Charge ID: ${payment.chargeId}`);
      console.log(`Proprietaire ID: ${payment.proprietaireId}`);
      console.log(`Syndic ID: ${payment.syndicId}`);
      console.log(`Status: ${payment.statut}`);
    });
    
  } catch (error) {
    console.error('Error checking payments:', error);
  }
}

checkPayments().then(() => {
  console.log('\nCheck complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
