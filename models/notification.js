const { db } = require('../config/firebase-config');

class Notification {
  constructor(id, data) {
    this.id = id;
    this.userId = data.userId;
    this.title = data.title;
    this.message = data.message;
    this.type = data.type || 'info';
    this.relatedTo = data.relatedTo || null;
    this.relatedId = data.relatedId || null;
    this.pdfUrl = data.pdfUrl || null;
    this.read = data.read || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async create(notificationData) {
    try {

      const notificationRef = await db.collection('notifications').add({
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        relatedTo: notificationData.relatedTo || null,
        relatedId: notificationData.relatedId || null,
        pdfUrl: notificationData.pdfUrl || null,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return new Notification(notificationRef.id, {
        ...notificationData,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }


  static async findById(id) {
    try {
      const notificationDoc = await db.collection('notifications').doc(id).get();

      if (!notificationDoc.exists) {
        return null;
      }

      return new Notification(notificationDoc.id, notificationDoc.data());
    } catch (error) {
      console.error('Error finding notification by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 20) {
    try {
      const notificationsSnapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const notifications = [];

      notificationsSnapshot.forEach(doc => {
        notifications.push(new Notification(doc.id, doc.data()));
      });

      return notifications;
    } catch (error) {
      console.error('Error finding notifications by user ID:', error);
      throw error;
    }
  }


  static async findUnreadByUserId(userId) {
    try {
      const notificationsSnapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .orderBy('createdAt', 'desc')
        .get();

      const notifications = [];

      notificationsSnapshot.forEach(doc => {
        notifications.push(new Notification(doc.id, doc.data()));
      });

      return notifications;
    } catch (error) {
      console.error('Error finding unread notifications by user ID:', error);
      throw error;
    }
  }


  static async createReunionInvitation(proprietaireId, reunion) {
    try {
      const notificationData = {
        userId: proprietaireId,
        title: 'New Meeting Invitation',
        message: `You have been invited to a meeting: ${reunion.title} on ${reunion.date} at ${reunion.startTime}`,
        type: 'info',
        relatedTo: 'reunion',
        relatedId: reunion.id
      };

      return await Notification.create(notificationData);
    } catch (error) {
      console.error('Error creating reunion invitation notification:', error);
      throw error;
    }
  }

  static async createPaymentReminder(proprietaireId, charge, pdfUrl) {
    try {
      const notificationData = {
        userId: proprietaireId,
        title: 'Payment Reminder',
        message: `You have an overdue payment for: ${charge.titre} of ${charge.montant}€. Please pay as soon as possible.`,
        type: 'warning',
        relatedTo: 'charge',
        relatedId: charge.id
      };

      // If a PDF URL is provided, add it to the notification
      if (pdfUrl) {
        notificationData.pdfUrl = pdfUrl;
      }

      return await Notification.create(notificationData);
    } catch (error) {
      console.error('Error creating payment reminder notification:', error);
      throw error;
    }
  }

  static async createPaymentConfirmation(proprietaireId, payment, charge) {
    try {
      const notificationData = {
        userId: proprietaireId,
        title: 'Payment Confirmed',
        message: `Your payment of ${payment.montant}€ for ${charge.titre} has been confirmed.`,
        type: 'success',
        relatedTo: 'payment',
        relatedId: payment.id
      };

      return await Notification.create(notificationData);
    } catch (error) {
      console.error('Error creating payment confirmation notification:', error);
      throw error;
    }
  }


  async markAsRead() {
    try {
      await db.collection('notifications').doc(this.id).update({
        read: true,
        updatedAt: new Date().toISOString()
      });

      this.read = true;
      this.updatedAt = new Date().toISOString();

      return this;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }


  async delete() {
    try {
      await db.collection('notifications').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }


  static async deleteAllForUser(userId) {
    try {
      const notificationsSnapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .get();

      const batch = db.batch();

      notificationsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return true;
    } catch (error) {
      console.error('Error deleting all notifications for user:', error);
      throw error;
    }
  }


  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      message: this.message,
      type: this.type,
      relatedTo: this.relatedTo,
      relatedId: this.relatedId,
      pdfUrl: this.pdfUrl || null,
      read: this.read,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Notification;
