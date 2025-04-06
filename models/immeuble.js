const { db } = require('../config/firebase-config');

class Immeuble {
  constructor(id, data) {
    this.id = id;
    this.nom = data.nom;
    this.adresse = data.adresse;
    this.ville = data.ville;
    this.codePostal = data.codePostal;
    this.nombreEtages = data.nombreEtages || 0;
    this.nombreAppartements = data.nombreAppartements || 0;
    this.dateConstruction = data.dateConstruction;
    this.syndicId = data.syndicId; 
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(immeubleData) {
    try {
      const immeubleRef = await db.collection('immeubles').add({
        nom: immeubleData.nom,
        adresse: immeubleData.adresse,
        ville: immeubleData.ville,
        codePostal: immeubleData.codePostal,
        nombreEtages: immeubleData.nombreEtages || 0,
        nombreAppartements: immeubleData.nombreAppartements || 0,
        dateConstruction: immeubleData.dateConstruction,
        syndicId: immeubleData.syndicId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new Immeuble(immeubleRef.id, {
        ...immeubleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating immeuble:', error);
      throw error;
    }
  }

 
  static async findById(id) {
    try {
      const immeubleDoc = await db.collection('immeubles').doc(id).get();
      
      if (!immeubleDoc.exists) {
        return null;
      }
      
      return new Immeuble(immeubleDoc.id, immeubleDoc.data());
    } catch (error) {
      console.error('Error finding immeuble by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const immeublesSnapshot = await db.collection('immeubles').get();
      
      const immeubles = [];
      
      immeublesSnapshot.forEach(doc => {
        immeubles.push(new Immeuble(doc.id, doc.data()));
      });
      
      return immeubles;
    } catch (error) {
      console.error('Error finding all immeubles:', error);
      throw error;
    }
  }

 
  static async findBySyndicId(syndicId) {
    try {
      const immeublesSnapshot = await db.collection('immeubles')
        .where('syndicId', '==', syndicId)
        .get();
      
      const immeubles = [];
      
      immeublesSnapshot.forEach(doc => {
        immeubles.push(new Immeuble(doc.id, doc.data()));
      });
      
      return immeubles;
    } catch (error) {
      console.error('Error finding immeubles by syndic ID:', error);
      throw error;
    }
  }


  async update(immeubleData) {
    try {
      const updateData = {
        ...immeubleData,
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('immeubles').doc(this.id).update(updateData);
      

      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });
      
      return this;
    } catch (error) {
      console.error('Error updating immeuble:', error);
      throw error;
    }
  }


  async delete() {
    try {

      const appartementsSnapshot = await db.collection('appartements')
        .where('immeubleId', '==', this.id)
        .get();
      

      const batch = db.batch();

      appartementsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      

      batch.delete(db.collection('immeubles').doc(this.id));
      

      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Error deleting immeuble:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      nom: this.nom,
      adresse: this.adresse,
      ville: this.ville,
      codePostal: this.codePostal,
      nombreEtages: this.nombreEtages,
      nombreAppartements: this.nombreAppartements,
      dateConstruction: this.dateConstruction,
      syndicId: this.syndicId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Immeuble;
