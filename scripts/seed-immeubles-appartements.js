// scripts/seed-immeubles-appartements.js
const Immeuble = require('../models/immeuble');
const Appartement = require('../models/appartement');
const Syndic = require('../models/syndic');
const Proprietaire = require('../models/proprietaire');
const { db } = require('../config/firebase-config');

// Sample data for immeubles
const immeublesSampleData = [
  {
    nom: 'Résidence Les Oliviers',
    adresse: '123 Avenue des Palmiers',
    ville: 'Casablanca',
    codePostal: '20000',
    nombreEtages: 5,
    nombreAppartements: 20,
    dateConstruction: '2010-05-15'
  },
  {
    nom: 'Résidence Les Roses',
    adresse: '45 Rue des Fleurs',
    ville: 'Rabat',
    codePostal: '10000',
    nombreEtages: 4,
    nombreAppartements: 16,
    dateConstruction: '2015-03-20'
  },
  {
    nom: 'Résidence Les Pins',
    adresse: '78 Boulevard de la Corniche',
    ville: 'Casablanca',
    codePostal: '20100',
    nombreEtages: 8,
    nombreAppartements: 32,
    dateConstruction: '2018-11-10'
  }
];

// Function to generate appartements for an immeuble
const generateAppartements = (immeubleId, nombreEtages, nombreAppartements, proprietaireId) => {
  const appartements = [];
  let appartementCount = 0;

  for (let etage = 1; etage <= nombreEtages; etage++) {
    const appartementsPerEtage = Math.ceil(nombreAppartements / nombreEtages);
    
    for (let i = 1; i <= appartementsPerEtage && appartementCount < nombreAppartements; i++) {
      appartementCount++;
      
      const superficie = Math.floor(Math.random() * 50) + 50; // Random between 50 and 100 m²
      const nombrePieces = Math.floor(Math.random() * 3) + 2; // Random between 2 and 4 rooms
      const loyer = Math.floor(Math.random() * 3000) + 3000; // Random between 3000 and 6000
      const charges = Math.floor(Math.random() * 500) + 500; // Random between 500 and 1000
      
      appartements.push({
        numero: `${etage}${i < 10 ? '0' : ''}${i}`,
        etage: etage,
        superficie: superficie,
        nombrePieces: nombrePieces,
        proprietaireId: proprietaireId,
        immeubleId: immeubleId,
        loyer: loyer,
        charges: charges,
        statut: 'occupé'
      });
    }
  }
  
  return appartements;
};

// Main seeding function
const seedImmeublesAppartements = async () => {
  try {
    console.log('Starting to seed immeubles and appartements...');
    
    // Get the default syndic
    const syndicSnapshot = await db.collection('users')
      .where('role', '==', 'syndic')
      .limit(1)
      .get();
    
    if (syndicSnapshot.empty) {
      throw new Error('No syndic found. Please create a syndic first.');
    }
    
    const syndicDoc = syndicSnapshot.docs[0];
    const syndicId = syndicDoc.id;
    
    console.log(`Using syndic with ID: ${syndicId}`);
    
    // Get or create a proprietaire
    let proprietaireId;
    const proprietaireSnapshot = await db.collection('users')
      .where('role', '==', 'proprietaire')
      .limit(1)
      .get();
    
    if (proprietaireSnapshot.empty) {
      console.log('No proprietaire found. Creating a default proprietaire...');
      
      const proprietaireData = {
        email: 'proprietaire@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '0612345678',
        role: 'proprietaire',
        createdBy: syndicId
      };
      
      const proprietaire = await Proprietaire.create(proprietaireData);
      proprietaireId = proprietaire.id;
      
      console.log(`Created default proprietaire with ID: ${proprietaireId}`);
    } else {
      const proprietaireDoc = proprietaireSnapshot.docs[0];
      proprietaireId = proprietaireDoc.id;
      console.log(`Using existing proprietaire with ID: ${proprietaireId}`);
    }
    
    // Check if immeubles already exist
    const immeublesSnapshot = await db.collection('immeubles').get();
    
    if (!immeublesSnapshot.empty) {
      console.log('Immeubles already exist. Skipping seeding...');
      return;
    }
    
    // Create immeubles
    for (const immeubleData of immeublesSampleData) {
      // Add syndic ID to immeuble data
      const immeubleWithSyndic = {
        ...immeubleData,
        syndicId
      };
      
      // Create immeuble
      const immeuble = await Immeuble.create(immeubleWithSyndic);
      console.log(`Created immeuble: ${immeuble.nom} with ID: ${immeuble.id}`);
      
      // Generate and create appartements for this immeuble
      const appartementsData = generateAppartements(
        immeuble.id,
        immeuble.nombreEtages,
        immeuble.nombreAppartements,
        proprietaireId
      );
      
      for (const appartementData of appartementsData) {
        const appartement = await Appartement.create(appartementData);
        console.log(`Created appartement: ${appartement.numero} in immeuble: ${immeuble.nom}`);
      }
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding immeubles and appartements:', error);
    throw error;
  }
};

// Export the seeding function
module.exports = seedImmeublesAppartements;

// If this script is run directly, execute the seeding
if (require.main === module) {
  seedImmeublesAppartements()
    .then(() => {
      console.log('Seeding script completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding script failed:', error);
      process.exit(1);
    });
}
