// test-create-charge.js
const axios = require('axios');

// Get syndic ID and apartment ID from command line arguments
const args = process.argv.slice(2);
const syndicId = args[0];
const appartementId = args[1];

if (!syndicId || !appartementId) {
  console.log('Usage: node test-create-charge.js <syndic_id> <apartment_id>');
  console.log('To find your syndic ID, run: node find-syndics.js');
  console.log('To find valid apartment IDs, run: node debug-syndic-charge.js <syndic_id>');
  process.exit(1);
}

async function testCreateCharge() {
  try {
    const response = await axios.post('http://localhost:3000/api/charges', {
      titre: 'Test Charge',
      description: 'This is a test charge',
      montant: 100.00,
      dateEcheance: '2023-12-31',
      appartementId: appartementId,
      categorie: 'test'
    }, {
      headers: {
        'Authorization': `Bearer ${syndicId}:syndic`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Charge created successfully:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error creating charge:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testCreateCharge().then(() => {
  console.log('Test complete');
}).catch(error => {
  console.error('Fatal error:', error);
});
