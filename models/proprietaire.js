const User = require('./user');
const { db } = require('../config/firebase-config');

class Proprietaire extends User {
  constructor(id, data) {
    super(id, data);

    this.role = 'proprietaire';
    this.appartementId = data.appartementId || null;
    this.apartmentNumber = null; // We'll populate this from the apartment data
    this.buildingId = data.buildingId || null;
    this.ownershipDate = data.ownershipDate || new Date().toISOString();
    this.createdBy = data.createdBy || null;

    // If we have apartment data, use it to populate apartmentNumber
    if (data.apartmentNumber) {
      this.apartmentNumber = data.apartmentNumber;
    }
  }

  static async create(proprietaireData) {
    try {
      proprietaireData.role = 'proprietaire';

      // Get apartment details to set the apartment number
      if (proprietaireData.appartementId) {
        const appartementRef = db.collection('appartements').doc(proprietaireData.appartementId);
        const appartementDoc = await appartementRef.get();
        
        if (appartementDoc.exists) {
          proprietaireData.apartmentNumber = appartementDoc.data().numero;
        }
      }

      const proprietaireRef = await db.collection('users').add({
        email: proprietaireData.email,
        password: proprietaireData.password,
        firstName: proprietaireData.firstName,
        lastName: proprietaireData.lastName,
        phoneNumber: proprietaireData.phoneNumber,
        role: 'proprietaire',
        appartementId: proprietaireData.appartementId,
        apartmentNumber: proprietaireData.apartmentNumber,
        buildingId: proprietaireData.buildingId || null,
        ownershipDate: proprietaireData.ownershipDate || new Date().toISOString(),
        createdBy: proprietaireData.createdBy || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new Proprietaire(proprietaireRef.id, proprietaireData);
    } catch (error) {
      console.error('Error creating proprietaire:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const proprietaireDoc = await db.collection('users').doc(id).get();

      if (!proprietaireDoc.exists || proprietaireDoc.data().role !== 'proprietaire') {
        return null;
      }

      return new Proprietaire(proprietaireDoc.id, proprietaireDoc.data());
    } catch (error) {
      console.error('Error finding proprietaire by ID:', error);
      throw error;
    }
  }

  static async findBySyndicId(syndicId) {
    try {
      const proprietairesSnapshot = await db.collection('users')
        .where('role', '==', 'proprietaire')
        .where('createdBy', '==', syndicId)
        .get();

      const proprietaires = [];

      proprietairesSnapshot.forEach(doc => {
        proprietaires.push(new Proprietaire(doc.id, doc.data()));
      });

      return proprietaires;
    } catch (error) {
      console.error('Error finding proprietaires by syndic ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const proprietairesSnapshot = await db.collection('users')
        .where('role', '==', 'proprietaire')
        .get();

      const proprietaires = [];

      for (const doc of proprietairesSnapshot.docs) {
        const data = doc.data();
        
        // Get apartment details if appartementId exists
        if (data.appartementId) {
          const appartementRef = db.collection('appartements').doc(data.appartementId);
          const appartementDoc = await appartementRef.get();
          
          if (appartementDoc.exists) {
            data.apartmentNumber = appartementDoc.data().numero;
          }
        }

        proprietaires.push(new Proprietaire(doc.id, data));
      }

      return proprietaires;
    } catch (error) {
      console.error('Error finding all proprietaires:', error);
      throw error;
    }
  }

  static async countDocuments(query = {}) {
    try {
      let queryRef = db.collection('users').where('role', '==', 'proprietaire');

      // Apply filters from the query object
      if (query.syndicId) {
        queryRef = queryRef.where('createdBy', '==', query.syndicId);
      }

      if (query.appartementId) {
        queryRef = queryRef.where('appartementId', '==', query.appartementId);
      }

      const snapshot = await queryRef.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting proprietaires:', error);
      throw error;
    }
  }

  async update(proprietaireData) {
    try {
      proprietaireData.role = 'proprietaire';
      proprietaireData.updatedAt = new Date().toISOString();

      if (proprietaireData.appartementId && proprietaireData.appartementId !== this.appartementId) {
        const newAppartementRef = db.collection('appartements').doc(proprietaireData.appartementId);
        const newAppartementDoc = await newAppartementRef.get();

        if (!newAppartementDoc.exists) {
          throw new Error('New appartement not found');
        }

        const existingProprietaireSnapshot = await db.collection('users')
          .where('role', '==', 'proprietaire')
          .where('appartementId', '==', proprietaireData.appartementId)
          .get();

        if (!existingProprietaireSnapshot.empty) {
          throw new Error('This appartement is already assigned to another proprietaire');
        }

        if (this.appartementId) {
          const oldAppartementRef = db.collection('appartements').doc(this.appartementId);
          const oldAppartementDoc = await oldAppartementRef.get();

          if (oldAppartementDoc.exists) {
            await oldAppartementRef.update({
              proprietaireId: null,
              updatedAt: new Date().toISOString()
            });
          }
        }

        await newAppartementRef.update({
          proprietaireId: this.id,
          updatedAt: new Date().toISOString()
        });
      }

      return await super.update(proprietaireData);
    } catch (error) {
      console.error('Error updating proprietaire:', error);
      throw error;
    }
  }

  toJSON() {
    const json = super.toJSON();
    return {
      ...json,
      appartementId: this.appartementId,
      apartmentNumber: this.apartmentNumber,
      buildingId: this.buildingId,
      ownershipDate: this.ownershipDate,
      createdBy: this.createdBy
    };
  }
}

module.exports = Proprietaire;
