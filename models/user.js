const { db } = require('../config/firebase-config');

class User {
  constructor(id, data) {
    this.id = id;
    this.email = data.email;
    this.password = data.password; 
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phoneNumber = data.phoneNumber;
    this.role = data.role || 'user';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(userData) {
    try {
      const userSnapshot = await db.collection('users')
        .where('email', '==', userData.email)
        .get();

      if (!userSnapshot.empty) {
        throw new Error('User with this email already exists');
      }

      const userRef = await db.collection('users').add({
        email: userData.email,
        password: userData.password, 
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: userData.role || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new User(userRef.id, userData);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const userDoc = await db.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      return new User(userDoc.id, userDoc.data());
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const userSnapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (userSnapshot.empty) {
        return null;
      }
      
      const userDoc = userSnapshot.docs[0];
      return new User(userDoc.id, userDoc.data());
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async update(userData) {
    try {
      const updateData = {
        ...userData,
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('users').doc(this.id).update(updateData);
      
      Object.keys(updateData).forEach(key => {
        this[key] = updateData[key];
      });
      
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async delete() {
    try {
      await db.collection('users').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async authenticate(email, password) {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.password !== password) {
        throw new Error('Invalid password');
      }
      
      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
