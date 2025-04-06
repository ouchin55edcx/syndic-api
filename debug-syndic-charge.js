// debug-syndic-charge.js
const { db } = require('./config/firebase-config');
const Immeuble = require('./models/immeuble');
const Appartement = require('./models/appartement');

// Get syndic ID from command line arguments
const args = process.argv.slice(2);
const syndicId = args[0];
const appartementId = args[1]; // Optional: apartment ID to check

if (!syndicId) {
  console.log('Usage: node debug-syndic-charge.js <syndic_id> [apartment_id]');
  console.log('To find your syndic ID, run: node find-syndics.js');
  process.exit(1);
}

async function debugSyndicCharge() {
  try {
    console.log('=== Debugging Syndic Charge Creation ===');

    // 1. Check if the syndic exists
    const syndicDoc = await db.collection('users')
      .doc(syndicId)
      .get();

    if (!syndicDoc.exists) {
      console.log('❌ Syndic not found with ID:', syndicId);
      return;
    }

    const syndic = syndicDoc.data();
    console.log('✅ Syndic found:', syndic.firstName, syndic.lastName);

    // 2. Check if the apartment exists
    const appartement = await Appartement.findById(appartementId);
    if (!appartement) {
      console.log('❌ Apartment not found with ID:', appartementId);
      return;
    }
    console.log('✅ Apartment found:', appartement.numero, 'on floor', appartement.etage);

    // 3. Check if the apartment has an immeubleId
    if (!appartement.immeubleId) {
      console.log('❌ Apartment does not have an immeubleId');
      return;
    }
    console.log('✅ Apartment belongs to building with ID:', appartement.immeubleId);

    // 4. Check if the building exists
    const immeuble = await Immeuble.findById(appartement.immeubleId);
    if (!immeuble) {
      console.log('❌ Building not found with ID:', appartement.immeubleId);
      return;
    }
    console.log('✅ Building found:', immeuble.nom);

    // 5. Check if the building is managed by the syndic
    if (immeuble.syndicId !== syndicId) {
      console.log('❌ Building is not managed by this syndic');
      console.log('   Building syndicId:', immeuble.syndicId);
      console.log('   Your syndicId:', syndicId);
      return;
    }
    console.log('✅ Building is managed by this syndic');

    // 6. List all buildings managed by this syndic
    const immeubles = await Immeuble.findBySyndicId(syndicId);
    console.log('\n=== Buildings managed by this syndic ===');
    immeubles.forEach((imm, index) => {
      console.log(`${index + 1}. ${imm.nom} (ID: ${imm.id})`);
    });

    // 7. List all apartments in those buildings
    console.log('\n=== Apartments in buildings managed by this syndic ===');
    for (const imm of immeubles) {
      const apartments = await Appartement.findByImmeubleId(imm.id);
      console.log(`\nBuilding: ${imm.nom} (ID: ${imm.id})`);
      apartments.forEach((apt, index) => {
        console.log(`${index + 1}. Apartment ${apt.numero} on floor ${apt.etage} (ID: ${apt.id})`);
      });
    }

    console.log('\n=== Conclusion ===');
    if (immeuble.syndicId === syndicId) {
      console.log('✅ You should be able to create charges for this apartment.');
      console.log('If you\'re still having issues, check your token format and make sure it\'s correctly formatted as "syndicId:syndic"');
    } else {
      console.log('❌ You cannot create charges for this apartment because it belongs to a building not managed by you.');
      console.log('Please use one of the apartments listed above.');
    }

  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugSyndicCharge().then(() => {
  console.log('Debugging complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
