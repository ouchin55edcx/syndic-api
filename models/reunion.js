const { db } = require('../config/firebase-config');

class Reunion {
  constructor(id, data) {
    this.id = id;
    this.title = data.title;
    this.description = data.description || '';
    this.date = data.date;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.location = data.location || '';
    this.createdBy = data.createdBy; 
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.status = data.status || 'scheduled';
  }

  static async create(reunionData) {
    try {
      const reunionRef = await db.collection('reunions').add({
        title: reunionData.title,
        description: reunionData.description || '',
        date: reunionData.date,
        startTime: reunionData.startTime,
        endTime: reunionData.endTime,
        location: reunionData.location || '',
        createdBy: reunionData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'scheduled'
      });

      return new Reunion(reunionRef.id, {
        ...reunionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'scheduled'
      });
    } catch (error) {
      console.error('Error creating reunion:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const reunionDoc = await db.collection('reunions').doc(id).get();
      
      if (!reunionDoc.exists) {
        return null;
      }
      
      return new Reunion(reunionDoc.id, reunionDoc.data());
    } catch (error) {
      console.error('Error finding reunion by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const reunionsSnapshot = await db.collection('reunions').get();
      
      const reunions = [];
      
      reunionsSnapshot.forEach(doc => {
        reunions.push(new Reunion(doc.id, doc.data()));
      });
      
      return reunions;
    } catch (error) {
      console.error('Error finding all reunions:', error);
      throw error;
    }
  }

  static async findBySyndicId(syndicId) {
    try {
      const reunionsSnapshot = await db.collection('reunions')
        .where('createdBy', '==', syndicId)
        .get();
      
      const reunions = [];
      
      reunionsSnapshot.forEach(doc => {
        reunions.push(new Reunion(doc.id, doc.data()));
      });
      
      return reunions;
    } catch (error) {
      console.error('Error finding reunions by syndic ID:', error);
      throw error;
    }
  }

  static async findUpcoming() {
    try {
      const now = new Date().toISOString();
      
      const reunionsSnapshot = await db.collection('reunions')
        .where('date', '>=', now)
        .where('status', '==', 'scheduled')
        .orderBy('date', 'asc')
        .get();
      
      const reunions = [];
      
      reunionsSnapshot.forEach(doc => {
        reunions.push(new Reunion(doc.id, doc.data()));
      });
      
      return reunions;
    } catch (error) {
      console.error('Error finding upcoming reunions:', error);
      throw error;
    }
  }

  async update(reunionData) {
    try {
      const updateData = {
        ...reunionData,
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('reunions').doc(this.id).update(updateData);
      
      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });
      
      return this;
    } catch (error) {
      console.error('Error updating reunion:', error);
      throw error;
    }
  }

  async delete() {
    try {
      const invitationsSnapshot = await db.collection('reunionProprietaires')
        .where('reunionId', '==', this.id)
        .get();
      
      const batch = db.batch();
      
      invitationsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batch.delete(db.collection('reunions').doc(this.id));
      
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Error deleting reunion:', error);
      throw error;
    }
  }

  async cancel() {
    try {
      await db.collection('reunions').doc(this.id).update({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      
      this.status = 'cancelled';
      this.updatedAt = new Date().toISOString();
      
      return this;
    } catch (error) {
      console.error('Error cancelling reunion:', error);
      throw error;
    }
  }

  async complete() {
    try {
      await db.collection('reunions').doc(this.id).update({
        status: 'completed',
        updatedAt: new Date().toISOString()
      });
      
      this.status = 'completed';
      this.updatedAt = new Date().toISOString();
      
      return this;
    } catch (error) {
      console.error('Error completing reunion:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      date: this.date,
      startTime: this.startTime,
      endTime: this.endTime,
      location: this.location,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status
    };
  }
}

module.exports = Reunion;
