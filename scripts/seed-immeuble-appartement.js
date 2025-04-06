// scripts/seed-immeuble-appartement.js
const { db } = require('../config/firebase-config');
const Immeuble = require('../models/immeuble');
const Appartement = require('../models/appartement');

// Function to seed one immeuble with three appartements
const seedImmeubleWithAppartements = async (syndicId) => {
  try {
    console.log('Starting to seed immeuble and appartements...');
    
    // Check if syndic exists
    if (!syndicId) {
      const syndicSnapshot = await db.collection('users')
        .where('role', '==', 'syndic')
        .limit(1)
        .get();
      
      if (syndicSnapshot.empty) {
        throw new Error('No syndic found. Please create a syndic first.');
      }
      
      syndicId = syndicSnapshot.docs[0].id;
    }
    
    console.log(`Using syndic with ID: ${syndicId}`);
    
    // Check if immeubles already exist
    const immeublesSnapshot = await db.collection('immeubles').get();
    
    if (!immeublesSnapshot.empty) {
      console.log('Immeubles already exist. Skipping seeding...');
      
      // Return the first immeuble and its appartements
      const immeubleDoc = immeublesSnapshot.docs[0];
      const immeuble = new Immeuble(immeubleDoc.id, immeubleDoc.data());
      
      const appartementsSnapshot = await db.collection('appartements')
        .where('immeubleId', '==', immeuble.id)
        .get();
      
      const appartements = [];
      appartementsSnapshot.forEach(doc => {
        appartements.push(new Appartement(doc.id, doc.data()));
      });
      
      return {
        immeuble,
        appartements
      };
    }
    
    // Create a new immeuble
    const immeubleData = {
      nom: 'Résidence Les Oliviers',
      adresse: '123 Avenue des Palmiers',
      ville: 'Casablanca',
      codePostal: '20000',
      nombreEtages: 5,
      nombreAppartements: 3,
      dateConstruction: '2010-05-15',
      syndicId
    };
    
    const immeuble = await Immeuble.create(immeubleData);
    console.log(`Created immeuble: ${immeuble.nom} with ID: ${immeuble.id}`);
    
    // Create three appartements for this immeuble
    const appartementsData = [
      {
        numero: '101',
        etage: 1,
        superficie: 75,
        nombrePieces: 2,
        immeubleId: immeuble.id,
        loyer: 4500,
        charges: 500,
        statut: 'occupé'
      },
      {
        numero: '201',
        etage: 2,
        superficie: 90,
        nombrePieces: 3,
        immeubleId: immeuble.id,
        loyer: 5500,
        charges: 600,
        statut: 'occupé'
      },
      {
        numero: '301',
        etage: 3,
        superficie: 120,
        nombrePieces: 4,
        immeubleId: immeuble.id,
        loyer: 7000,
        charges: 800,
        statut: 'occupé'
      }
    ];
    
    const appartements = [];
    
    for (const appartementData of appartementsData) {
      const appartement = await Appartement.create(appartementData);
      console.log(`Created appartement: ${appartement.numero} in immeuble: ${immeuble.nom}`);
      appartements.push(appartement);
    }
    
    console.log('Seeding completed successfully!');
    
    return {
      immeuble,
      appartements
    };
  } catch (error) {
    console.error('Error seeding immeuble and appartements:', error);
    throw error;
  }
};

// Export the seeding function
module.exports = seedImmeubleWithAppartements;

// If this script is run directly, execute the seeding
if (require.main === module) {
  seedImmeubleWithAppartements()
    .then(result => {
      console.log('Seeding script completed.');
      console.log(`Immeuble ID: ${result.immeuble.id}`);
      console.log('Appartement IDs:');
      result.appartements.forEach(app => {
        console.log(`- ${app.numero}: ${app.id}`);
      });
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding script failed:', error);
      process.exit(1);
    });
}
