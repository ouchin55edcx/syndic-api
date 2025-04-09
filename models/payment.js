// models/payment.js
const { db } = require('../config/firebase-config');

class Payment {
  constructor(id, data) {
    this.id = id;
    this.montant = data.montant;
    this.datePayment = data.datePayment || new Date().toISOString();
    this.methodePaiement = data.methodePaiement || 'espèces';
    this.reference = data.reference || null;
    this.chargeId = data.chargeId;
    this.proprietaireId = data.proprietaireId;
    this.syndicId = data.syndicId;
    this.statut = data.statut || 'confirmé';
    this.isPartial = data.isPartial || false;
    this.remainingAmount = data.remainingAmount !== undefined && data.remainingAmount !== null ? data.remainingAmount : 0;
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(paymentData) {
    try {
      const chargeRef = db.collection('charges').doc(paymentData.chargeId);
      const chargeDoc = await chargeRef.get();

      if (!chargeDoc.exists) {
        throw new Error('Charge not found');
      }

      const chargeData = chargeDoc.data();
      const chargeMontant = parseFloat(chargeData.montant);
      const paymentMontant = parseFloat(paymentData.montant);

      let isPartial = false;
      let remainingAmount = 0;
      let newChargeStatus = 'payé';

      const previousPaymentsSnapshot = await db.collection('payments')
        .where('chargeId', '==', paymentData.chargeId)
        .where('statut', '==', 'confirmé')
        .get();

      let totalPaidSoFar = 0;
      previousPaymentsSnapshot.forEach(doc => {
        totalPaidSoFar += parseFloat(doc.data().montant);
      });

      const totalAfterThisPayment = totalPaidSoFar + paymentMontant;
      remainingAmount = Math.max(0, chargeMontant - totalAfterThisPayment);

      if (remainingAmount > 0) {
        isPartial = true;
        newChargeStatus = 'partiellement payé';
      } else {
        isPartial = false;
        newChargeStatus = 'payé';
      }

      const paymentRef = await db.collection('payments').add({
        montant: paymentData.montant,
        datePayment: paymentData.datePayment || new Date().toISOString(),
        methodePaiement: paymentData.methodePaiement || 'espèces',
        reference: paymentData.reference || null,
        chargeId: paymentData.chargeId,
        proprietaireId: paymentData.proprietaireId,
        syndicId: paymentData.syndicId,
        statut: paymentData.statut || 'confirmé',
        isPartial: isPartial,
        remainingAmount: remainingAmount,
        notes: paymentData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (paymentData.statut === 'confirmé' || !paymentData.statut) {
        await chargeRef.update({
          statut: newChargeStatus,
          montantPaye: totalAfterThisPayment,
          montantRestant: remainingAmount,
          updatedAt: new Date().toISOString()
        });
      }

      return new Payment(paymentRef.id, {
        ...paymentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const paymentDoc = await db.collection('payments').doc(id).get();

      if (!paymentDoc.exists) {
        return null;
      }

      return new Payment(paymentDoc.id, paymentDoc.data());
    } catch (error) {
      console.error('Error finding payment by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const paymentsSnapshot = await db.collection('payments').get();

      const payments = [];

      paymentsSnapshot.forEach(doc => {
        payments.push(new Payment(doc.id, doc.data()));
      });

      return payments;
    } catch (error) {
      console.error('Error finding all payments:', error);
      throw error;
    }
  }

  static async findByProprietaireId(proprietaireId) {
    try {
      const paymentsSnapshot = await db.collection('payments')
        .where('proprietaireId', '==', proprietaireId)
        .orderBy('datePayment', 'desc')
        .get();

      const payments = [];

      paymentsSnapshot.forEach(doc => {
        payments.push(new Payment(doc.id, doc.data()));
      });

      return payments;
    } catch (error) {
      console.error('Error finding payments by proprietaire ID:', error);
      throw error;
    }
  }

  static async findByChargeId(chargeId) {
    try {
      const paymentsSnapshot = await db.collection('payments')
        .where('chargeId', '==', chargeId)
        .orderBy('datePayment', 'desc')
        .get();

      const payments = [];

      paymentsSnapshot.forEach(doc => {
        payments.push(new Payment(doc.id, doc.data()));
      });

      return payments;
    } catch (error) {
      console.error('Error finding payments by charge ID:', error);
      throw error;
    }
  }

  static async findBySyndicId(syndicId) {
    try {
      const paymentsSnapshot = await db.collection('payments')
        .where('syndicId', '==', syndicId)
        .orderBy('datePayment', 'desc')
        .get();

      const payments = [];

      paymentsSnapshot.forEach(doc => {
        payments.push(new Payment(doc.id, doc.data()));
      });

      return payments;
    } catch (error) {
      console.error('Error finding payments by syndic ID:', error);
      throw error;
    }
  }

  static async countDocuments(query = {}) {
    try {
      let queryRef = db.collection('payments');

      // Apply filters from the query object
      if (query.syndicId) {
        queryRef = queryRef.where('syndicId', '==', query.syndicId);
      }

      if (query.statut) {
        queryRef = queryRef.where('statut', '==', query.statut);
      }

      if (query.proprietaireId) {
        queryRef = queryRef.where('proprietaireId', '==', query.proprietaireId);
      }

      const snapshot = await queryRef.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error counting payments:', error);
      throw error;
    }
  }

  static async getPaymentHistory(proprietaireId, startDate, endDate) {
    try {
      let query = db.collection('payments')
        .where('proprietaireId', '==', proprietaireId)
        .orderBy('datePayment', 'desc');

      if (startDate) {
        query = query.where('datePayment', '>=', startDate);
      }

      if (endDate) {
        query = query.where('datePayment', '<=', endDate);
      }

      const paymentsSnapshot = await query.get();

      const payments = [];

      paymentsSnapshot.forEach(doc => {
        payments.push(new Payment(doc.id, doc.data()));
      });

      return payments;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  async update(paymentData) {
    try {
      const updateData = {
        ...paymentData,
        updatedAt: new Date().toISOString()
      };

      await db.collection('payments').doc(this.id).update(updateData);

      if (paymentData.statut === 'confirmé' && this.statut !== 'confirmé') {
        const chargeRef = db.collection('charges').doc(this.chargeId);
        await chargeRef.update({
          statut: 'payé',
          updatedAt: new Date().toISOString()
        });
      }

      if (this.statut === 'confirmé' && paymentData.statut !== 'confirmé') {
        const chargeRef = db.collection('charges').doc(this.chargeId);
        await chargeRef.update({
          statut: 'non payé',
          updatedAt: new Date().toISOString()
        });
      }

      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });

      return this;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  async delete() {
    try {
      if (this.statut === 'confirmé') {
        const chargeRef = db.collection('charges').doc(this.chargeId);
        await chargeRef.update({
          statut: 'non payé',
          updatedAt: new Date().toISOString()
        });
      }

      await db.collection('payments').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      montant: this.montant,
      datePayment: this.datePayment,
      methodePaiement: this.methodePaiement,
      reference: this.reference,
      chargeId: this.chargeId,
      proprietaireId: this.proprietaireId,
      syndicId: this.syndicId,
      statut: this.statut,
      isPartial: this.isPartial,
      remainingAmount: this.remainingAmount !== null ? this.remainingAmount : 0,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Payment;
