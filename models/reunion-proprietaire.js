const { db } = require('../config/firebase-config');
const Reunion = require('./reunion');
const Proprietaire = require('./proprietaire');

class ReunionProprietaire {
  constructor(id, data) {
    this.id = id;
    this.reunionId = data.reunionId;
    this.proprietaireId = data.proprietaireId;
    this.status = data.status || 'invited'; 
    this.attendance = data.attendance || 'pending'; 
    this.notificationSent = data.notificationSent || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(reunionProprietaireData) {
    try {
      const existingSnapshot = await db.collection('reunionProprietaires')
        .where('reunionId', '==', reunionProprietaireData.reunionId)
        .where('proprietaireId', '==', reunionProprietaireData.proprietaireId)
        .limit(1)
        .get();
      
      if (!existingSnapshot.empty) {
        throw new Error('Proprietaire already invited to this reunion');
      }

      const relationshipRef = await db.collection('reunionProprietaires').add({
        reunionId: reunionProprietaireData.reunionId,
        proprietaireId: reunionProprietaireData.proprietaireId,
        status: reunionProprietaireData.status || 'invited',
        attendance: 'pending',
        notificationSent: reunionProprietaireData.notificationSent || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new ReunionProprietaire(relationshipRef.id, {
        ...reunionProprietaireData,
        attendance: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating reunion-proprietaire relationship:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const relationshipDoc = await db.collection('reunionProprietaires').doc(id).get();
      
      if (!relationshipDoc.exists) {
        return null;
      }
      
      return new ReunionProprietaire(relationshipDoc.id, relationshipDoc.data());
    } catch (error) {
      console.error('Error finding reunion-proprietaire relationship by ID:', error);
      throw error;
    }
  }

  static async findByReunionId(reunionId) {
    try {
      const relationshipsSnapshot = await db.collection('reunionProprietaires')
        .where('reunionId', '==', reunionId)
        .get();
      
      const relationships = [];
      
      relationshipsSnapshot.forEach(doc => {
        relationships.push(new ReunionProprietaire(doc.id, doc.data()));
      });
      
      return relationships;
    } catch (error) {
      console.error('Error finding relationships by reunion ID:', error);
      throw error;
    }
  }

  static async findByProprietaireId(proprietaireId) {
    try {
      const relationshipsSnapshot = await db.collection('reunionProprietaires')
        .where('proprietaireId', '==', proprietaireId)
        .get();
      
      const relationships = [];
      
      relationshipsSnapshot.forEach(doc => {
        relationships.push(new ReunionProprietaire(doc.id, doc.data()));
      });
      
      return relationships;
    } catch (error) {
      console.error('Error finding relationships by proprietaire ID:', error);
      throw error;
    }
  }

  static async findByReunionAndProprietaire(reunionId, proprietaireId) {
    try {
      const relationshipsSnapshot = await db.collection('reunionProprietaires')
        .where('reunionId', '==', reunionId)
        .where('proprietaireId', '==', proprietaireId)
        .limit(1)
        .get();
      
      if (relationshipsSnapshot.empty) {
        return null;
      }
      
      const doc = relationshipsSnapshot.docs[0];
      return new ReunionProprietaire(doc.id, doc.data());
    } catch (error) {
      console.error('Error finding relationship by reunion and proprietaire:', error);
      throw error;
    }
  }

  static async getInvitedProprietairesWithDetails(reunionId) {
    try {
      const relationshipsSnapshot = await db.collection('reunionProprietaires')
        .where('reunionId', '==', reunionId)
        .get();
      
      const invitedProprietaires = [];
      
      for (const doc of relationshipsSnapshot.docs) {
        const relationship = new ReunionProprietaire(doc.id, doc.data());
        const proprietaire = await Proprietaire.findById(relationship.proprietaireId);
        
        if (proprietaire) {
          invitedProprietaires.push({
            relationship: relationship.toJSON(),
            proprietaire: proprietaire.toJSON()
          });
        }
      }
      
      return invitedProprietaires;
    } catch (error) {
      console.error('Error getting invited proprietaires with details:', error);
      throw error;
    }
  }

  static async getReunionsForProprietaireWithDetails(proprietaireId) {
    try {
      const relationshipsSnapshot = await db.collection('reunionProprietaires')
        .where('proprietaireId', '==', proprietaireId)
        .get();
      
      const reunions = [];
      
      for (const doc of relationshipsSnapshot.docs) {
        const relationship = new ReunionProprietaire(doc.id, doc.data());
        const reunion = await Reunion.findById(relationship.reunionId);
        
        if (reunion) {
          reunions.push({
            relationship: relationship.toJSON(),
            reunion: reunion.toJSON()
          });
        }
      }
      
      reunions.sort((a, b) => new Date(b.reunion.date) - new Date(a.reunion.date));
      
      return reunions;
    } catch (error) {
      console.error('Error getting reunions for proprietaire with details:', error);
      throw error;
    }
  }

  async update(relationshipData) {
    try {
      const updateData = {
        ...relationshipData,
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('reunionProprietaires').doc(this.id).update(updateData);
      
      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });
      
      return this;
    } catch (error) {
      console.error('Error updating reunion-proprietaire relationship:', error);
      throw error;
    }
  }

  async updateAttendance(attendance) {
    try {
      if (!['pending', 'present', 'absent'].includes(attendance)) {
        throw new Error('Invalid attendance status');
      }
      
      await db.collection('reunionProprietaires').doc(this.id).update({
        attendance,
        updatedAt: new Date().toISOString()
      });
      
      this.attendance = attendance;
      this.updatedAt = new Date().toISOString();
      
      return this;
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  }

  async updateStatus(status) {
    try {
      if (!['invited', 'accepted', 'declined'].includes(status)) {
        throw new Error('Invalid invitation status');
      }
      
      await db.collection('reunionProprietaires').doc(this.id).update({
        status,
        updatedAt: new Date().toISOString()
      });
      
      this.status = status;
      this.updatedAt = new Date().toISOString();
      
      return this;
    } catch (error) {
      console.error('Error updating invitation status:', error);
      throw error;
    }
  }

  async markNotificationSent() {
    try {
      await db.collection('reunionProprietaires').doc(this.id).update({
        notificationSent: true,
        updatedAt: new Date().toISOString()
      });
      
      this.notificationSent = true;
      this.updatedAt = new Date().toISOString();
      
      return this;
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw error;
    }
  }

  async delete() {
    try {
      await db.collection('reunionProprietaires').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting reunion-proprietaire relationship:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      reunionId: this.reunionId,
      proprietaireId: this.proprietaireId,
      status: this.status,
      attendance: this.attendance,
      notificationSent: this.notificationSent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ReunionProprietaire;
