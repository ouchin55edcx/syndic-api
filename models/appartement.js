const { db } = require('../config/firebase-config');

class Appartement {
  constructor(id, data) {
    this.id = id;
    this.numero = data.numero;
    this.etage = data.etage;
    this.superficie = data.superficie;
    this.nombrePieces = data.nombrePieces || 0;
    this.proprietaireId = data.proprietaireId;
    this.immeubleId = data.immeubleId;
    // this.loyer = data.loyer || 0;
    // this.charges = data.charges || 0;
    this.statut = data.statut || 'occupé';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(appartementData) {
    try {
      const appartementRef = await db.collection('appartements').add({
        numero: appartementData.numero,
        etage: appartementData.etage,
        superficie: appartementData.superficie,
        nombrePieces: appartementData.nombrePieces || 0,
        proprietaireId: appartementData.proprietaireId,
        immeubleId: appartementData.immeubleId,
        // loyer: appartementData.loyer || 0,
        // charges: appartementData.charges || 0,
        statut: appartementData.statut || 'occupé',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new Appartement(appartementRef.id, {
        ...appartementData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating appartement:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const appartementDoc = await db.collection('appartements').doc(id).get();

      if (!appartementDoc.exists) {
        return null;
      }

      return new Appartement(appartementDoc.id, appartementDoc.data());
    } catch (error) {
      console.error('Error finding appartement by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const appartementsSnapshot = await db.collection('appartements').get();

      const appartements = [];

      appartementsSnapshot.forEach(doc => {
        appartements.push(new Appartement(doc.id, doc.data()));
      });

      return appartements;
    } catch (error) {
      console.error('Error finding all appartements:', error);
      throw error;
    }
  }

  static async findByImmeubleId(immeubleId) {
    try {
      const appartementsSnapshot = await db.collection('appartements')
        .where('immeubleId', '==', immeubleId)
        .get();

      const appartements = [];

      appartementsSnapshot.forEach(doc => {
        appartements.push(new Appartement(doc.id, doc.data()));
      });

      return appartements;
    } catch (error) {
      console.error('Error finding appartements by immeuble ID:', error);
      throw error;
    }
  }

  static async findByProprietaireId(proprietaireId) {
    try {
      const appartementsSnapshot = await db.collection('appartements')
        .where('proprietaireId', '==', proprietaireId)
        .get();

      const appartements = [];

      appartementsSnapshot.forEach(doc => {
        appartements.push(new Appartement(doc.id, doc.data()));
      });

      return appartements;
    } catch (error) {
      console.error('Error finding appartements by proprietaire ID:', error);
      throw error;
    }
  }

  static async countDocuments(query = {}) {
    try {
      let queryRef = db.collection('appartements');

      // Apply filters from the query object
      if (query.syndicId) {
        // For apartments, we need to find the ones in buildings managed by this syndic
        // This requires a more complex query
        const immeubleSnapshot = await db.collection('immeubles')
          .where('syndicId', '==', query.syndicId)
          .get();

        if (immeubleSnapshot.empty) {
          return 0;
        }

        // Get all immeuble IDs managed by this syndic
        const immeubleIds = [];
        immeubleSnapshot.forEach(doc => {
          immeubleIds.push(doc.id);
        });

        // We can't do a direct query with 'in' operator in Firestore for countDocuments
        // So we'll get all apartments in these buildings and count them
        let count = 0;
        for (const immeubleId of immeubleIds) {
          const apartmentsSnapshot = await db.collection('appartements')
            .where('immeubleId', '==', immeubleId)
            .get();
          count += apartmentsSnapshot.size;
        }

        return count;
      }

      if (query.immeubleId) {
        queryRef = queryRef.where('immeubleId', '==', query.immeubleId);
      }

      if (query.proprietaireId) {
        queryRef = queryRef.where('proprietaireId', '==', query.proprietaireId);
      }

      const snapshot = await queryRef.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting appartements:', error);
      throw error;
    }
  }

  async update(appartementData) {
    try {
      const updateData = {
        ...appartementData,
        updatedAt: new Date().toISOString()
      };

      await db.collection('appartements').doc(this.id).update(updateData);

      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });

      return this;
    } catch (error) {
      console.error('Error updating appartement:', error);
      throw error;
    }
  }

  async delete() {
    try {

      const chargesSnapshot = await db.collection('charges')
        .where('appartementId', '==', this.id)
        .get();

      const batch = db.batch();

      chargesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      batch.delete(db.collection('appartements').doc(this.id));

      await batch.commit();

      return true;
    } catch (error) {
      console.error('Error deleting appartement:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      numero: this.numero,
      etage: this.etage,
      superficie: this.superficie,
      nombrePieces: this.nombrePieces,
      proprietaireId: this.proprietaireId,
      immeubleId: this.immeubleId,
      // loyer: this.loyer,
      // charges: this.charges,
      statut: this.statut,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Appartement;
