const User = require('./user');
const { db } = require('../config/firebase-config');

class Syndic extends User {
  constructor(id, data) {
    super(id, data);
    
    this.role = 'syndic';
    
    this.company = data.company || null;
    this.licenseNumber = data.licenseNumber || null;
  }

  static async create(syndicData) {
    try {
      syndicData.role = 'syndic';
      
      const syndicSnapshot = await db.collection('users')
        .where('email', '==', syndicData.email)
        .where('role', '==', 'syndic')
        .get();

      if (!syndicSnapshot.empty) {
        throw new Error('Syndic with this email already exists');
      }

      const syndicRef = await db.collection('users').add({
        email: syndicData.email,
        password: syndicData.password, 
        firstName: syndicData.firstName,
        lastName: syndicData.lastName,
        phoneNumber: syndicData.phoneNumber,
        role: 'syndic',
        company: syndicData.company || null,
        licenseNumber: syndicData.licenseNumber || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new Syndic(syndicRef.id, syndicData);
    } catch (error) {
      console.error('Error creating syndic:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const syndicDoc = await db.collection('users').doc(id).get();
      
      if (!syndicDoc.exists || syndicDoc.data().role !== 'syndic') {
        return null;
      }
      
      return new Syndic(syndicDoc.id, syndicDoc.data());
    } catch (error) {
      console.error('Error finding syndic by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const syndicSnapshot = await db.collection('users')
        .where('email', '==', email)
        .where('role', '==', 'syndic')
        .limit(1)
        .get();
      
      if (syndicSnapshot.empty) {
        return null;
      }
      
      const syndicDoc = syndicSnapshot.docs[0];
      return new Syndic(syndicDoc.id, syndicDoc.data());
    } catch (error) {
      console.error('Error finding syndic by email:', error);
      throw error;
    }
  }

  static async getDefaultSyndic() {
    try {
      const syndicSnapshot = await db.collection('users')
        .where('role', '==', 'syndic')
        .limit(1)
        .get();
      
      if (syndicSnapshot.empty) {
        return null;
      }
      
      const syndicDoc = syndicSnapshot.docs[0];
      return new Syndic(syndicDoc.id, syndicDoc.data());
    } catch (error) {
      console.error('Error getting default syndic:', error);
      throw error;
    }
  }

  async update(syndicData) {
    try {
      syndicData.role = 'syndic';
      
      return await super.update(syndicData);
    } catch (error) {
      console.error('Error updating syndic:', error);
      throw error;
    }
  }
}

module.exports = Syndic;
