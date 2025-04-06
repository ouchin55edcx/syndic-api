// models/charge.js
const { db } = require('../config/firebase-config');

class Charge {
  constructor(id, data) {
    this.id = id;
    this.titre = data.titre;
    this.description = data.description || '';
    this.montant = data.montant;
    this.dateEcheance = data.dateEcheance;
    this.statut = data.statut || 'non payé'; // non payé, partiellement payé, payé, en retard
    this.montantPaye = data.montantPaye !== undefined && data.montantPaye !== null ? data.montantPaye : 0; // Amount paid so far
    this.montantRestant = data.montantRestant !== undefined && data.montantRestant !== null ? data.montantRestant : data.montant; // Remaining amount to pay
    this.appartementId = data.appartementId; // ID of the appartement this charge belongs to
    this.syndicId = data.syndicId; // ID of the syndic who created this charge
    this.categorie = data.categorie || 'général'; // général, eau, électricité, entretien, etc.
    this.dernierRappel = data.dernierRappel || null; // Date of the last payment reminder
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(chargeData) {
    try {
      const chargeRef = await db.collection('charges').add({
        titre: chargeData.titre,
        description: chargeData.description || '',
        montant: chargeData.montant,
        dateEcheance: chargeData.dateEcheance,
        statut: chargeData.statut || 'non payé',
        montantPaye: chargeData.montantPaye || 0,
        montantRestant: chargeData.montantRestant || chargeData.montant,
        appartementId: chargeData.appartementId,
        syndicId: chargeData.syndicId,
        categorie: chargeData.categorie || 'général',
        dernierRappel: chargeData.dernierRappel || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new Charge(chargeRef.id, {
        ...chargeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating charge:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const chargeDoc = await db.collection('charges').doc(id).get();

      if (!chargeDoc.exists) {
        return null;
      }

      return new Charge(chargeDoc.id, chargeDoc.data());
    } catch (error) {
      console.error('Error finding charge by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const chargesSnapshot = await db.collection('charges').get();

      const charges = [];

      chargesSnapshot.forEach(doc => {
        charges.push(new Charge(doc.id, doc.data()));
      });

      return charges;
    } catch (error) {
      console.error('Error finding all charges:', error);
      throw error;
    }
  }

  static async findByAppartementId(appartementId) {
    try {
      const chargesSnapshot = await db.collection('charges')
        .where('appartementId', '==', appartementId)
        .get();

      const charges = [];

      chargesSnapshot.forEach(doc => {
        charges.push(new Charge(doc.id, doc.data()));
      });

      return charges;
    } catch (error) {
      console.error('Error finding charges by appartement ID:', error);
      throw error;
    }
  }

  static async findByProprietaireId(proprietaireId) {
    try {
      const appartementsSnapshot = await db.collection('appartements')
        .where('proprietaireId', '==', proprietaireId)
        .get();

      if (appartementsSnapshot.empty) {
        return [];
      }

      // Get charges for each appartement
      const charges = [];
      const appartementIds = [];

      appartementsSnapshot.forEach(doc => {
        appartementIds.push(doc.id);
      });

      // For each appartement, get its charges
      for (const appartementId of appartementIds) {
        const appartementCharges = await this.findByAppartementId(appartementId);
        charges.push(...appartementCharges);
      }

      return charges;
    } catch (error) {
      console.error('Error finding charges by proprietaire ID:', error);
      throw error;
    }
  }

  // Static method to find charges by syndic ID
  static async findBySyndicId(syndicId) {
    try {
      const chargesSnapshot = await db.collection('charges')
        .where('syndicId', '==', syndicId)
        .get();

      const charges = [];

      chargesSnapshot.forEach(doc => {
        charges.push(new Charge(doc.id, doc.data()));
      });

      return charges;
    } catch (error) {
      console.error('Error finding charges by syndic ID:', error);
      throw error;
    }
  }

  async update(chargeData) {
    try {
      const updateData = {
        ...chargeData,
        updatedAt: new Date().toISOString()
      };

      await db.collection('charges').doc(this.id).update(updateData);

      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });

      return this;
    } catch (error) {
      console.error('Error updating charge:', error);
      throw error;
    }
  }

  async delete() {
    try {
      await db.collection('charges').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting charge:', error);
      throw error;
    }
  }

  async markAsPaid() {
    try {
      await db.collection('charges').doc(this.id).update({
        statut: 'payé',
        updatedAt: new Date().toISOString()
      });

      this.statut = 'payé';
      this.updatedAt = new Date().toISOString();

      return this;
    } catch (error) {
      console.error('Error marking charge as paid:', error);
      throw error;
    }
  }

  async markAsOverdue() {
    try {
      const now = new Date().toISOString();
      await db.collection('charges').doc(this.id).update({
        statut: 'en retard',
        dernierRappel: now,
        updatedAt: now
      });

      this.statut = 'en retard';
      this.dernierRappel = now;
      this.updatedAt = now;

      return this;
    } catch (error) {
      console.error('Error marking charge as overdue:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      titre: this.titre,
      description: this.description,
      montant: this.montant,
      dateEcheance: this.dateEcheance,
      statut: this.statut,
      montantPaye: this.montantPaye !== undefined && this.montantPaye !== null ? this.montantPaye : 0,
      montantRestant: this.montantRestant !== undefined && this.montantRestant !== null ? this.montantRestant : this.montant,
      appartementId: this.appartementId,
      syndicId: this.syndicId,
      categorie: this.categorie,
      dernierRappel: this.dernierRappel,
      paiements: this.paiements || [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Charge;
