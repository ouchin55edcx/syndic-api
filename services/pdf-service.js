// services/pdf-service.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a payment reminder PDF (Avis Client)
 * @param {Object} data - Data for the PDF
 * @param {Object} data.charge - Charge object
 * @param {Object} data.proprietaire - Proprietaire object
 * @param {Object} data.appartement - Appartement object
 * @param {Object} data.immeuble - Immeuble object
 * @param {Array} data.payments - Previous payments for this charge
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
const generatePaymentReminderPDF = async (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const { charge, proprietaire, appartement, immeuble, payments } = data;

      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Pipe the PDF to a file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add content to the PDF

      // Header with logo placeholder
      doc.fontSize(22).text('SYNDIC DE COPROPRIÉTÉ', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).text('AVIS CLIENT', { align: 'center' });
      doc.moveDown(0.5);

      // Reference number and date
      const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(10).text(`Référence: AVC-${charge.id.substring(0, 8)}`, { align: 'right' });
      doc.text(`Date d'émission: ${currentDate}`, { align: 'right' });
      doc.moveDown(1);

      // Draw a horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown(1);

      // Proprietaire and Syndic information in two columns
      const startY = doc.y;

      // Left column - Proprietaire
      doc.fontSize(12).text('DESTINATAIRE:', 50, startY, { bold: true });
      doc.fontSize(10).text(`${proprietaire.firstName} ${proprietaire.lastName}`, 50, doc.y + 5);
      doc.text(`Appartement: ${appartement.numero}`);
      doc.text(`Étage: ${appartement.etage}`);
      doc.text(`${immeuble.nom}`);
      doc.text(`${immeuble.adresse}`);
      doc.text(`${immeuble.codePostal} ${immeuble.ville}`);

      // Right column - Syndic
      const rightColumnX = 350;
      doc.fontSize(12).text('ÉMETTEUR:', rightColumnX, startY, { bold: true });
      doc.fontSize(10).text('Syndic de Copropriété', rightColumnX, doc.y - 10);
      doc.text('123 Avenue des Syndics');
      doc.text('75000 Paris');
      doc.text('Tél: 01 23 45 67 89');
      doc.text('Email: contact@syndic.com');
      doc.text('SIRET: 123 456 789 00010');

      // Move down to align with the taller column
      doc.moveDown(3);

      // Draw another horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown(1);

      // Charge information
      doc.fontSize(14).text('AVIS DE PAIEMENT', { align: 'center' });
      doc.moveDown(1);

      // Charge details
      doc.fontSize(12).text('Détails de la charge:');
      doc.moveDown(0.5);

      // Create a table for charge details
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidth = (doc.page.width - 100) / 2;

      // Table headers
      doc.fontSize(10).fillColor('black').rect(tableLeft, tableTop, colWidth * 2, 20).fill('lightgray');
      doc.fillColor('black').text('Description', tableLeft + 10, tableTop + 5, { width: colWidth - 10 });
      doc.text('Montant', tableLeft + colWidth + 10, tableTop + 5, { width: colWidth - 10 });

      // Table row
      const rowY = tableTop + 20;
      doc.rect(tableLeft, rowY, colWidth * 2, 25).stroke();
      doc.text(charge.titre, tableLeft + 10, rowY + 5, { width: colWidth - 10 });
      doc.text(`${charge.montant} €`, tableLeft + colWidth + 10, rowY + 5, { width: colWidth - 10 });

      doc.moveDown(3);

      // Payment status
      doc.fontSize(12).text('État des paiements:');
      doc.moveDown(0.5);

      // Create a table for payment status
      const paymentTableTop = doc.y;

      // Table headers
      doc.fontSize(10).fillColor('black').rect(tableLeft, paymentTableTop, colWidth * 2, 20).fill('lightgray');
      doc.fillColor('black').text('Montant total', tableLeft + 10, paymentTableTop + 5, { width: colWidth - 10 });
      doc.text('Montant payé', tableLeft + colWidth / 2 + 10, paymentTableTop + 5, { width: colWidth / 2 - 10 });
      doc.text('Reste à payer', tableLeft + colWidth + 10, paymentTableTop + 5, { width: colWidth - 10 });

      // Table row
      const paymentRowY = paymentTableTop + 20;
      doc.rect(tableLeft, paymentRowY, colWidth * 2, 25).stroke();
      doc.text(`${charge.montant} €`, tableLeft + 10, paymentRowY + 5, { width: colWidth / 2 - 10 });
      doc.text(`${charge.montantPaye} €`, tableLeft + colWidth / 2 + 10, paymentRowY + 5, { width: colWidth / 2 - 10 });
      doc.text(`${charge.montantRestant} €`, tableLeft + colWidth + 10, paymentRowY + 5, { width: colWidth - 10 });

      doc.moveDown(3);

      // Previous payments if any
      if (payments && payments.length > 0) {
        doc.fontSize(12).text('Historique des paiements:');
        doc.moveDown(0.5);

        // Create a table for payment history
        const historyTableTop = doc.y;
        const historyColWidth = (doc.page.width - 100) / 3;

        // Table headers
        doc.fontSize(10).fillColor('black').rect(tableLeft, historyTableTop, historyColWidth * 3, 20).fill('lightgray');
        doc.fillColor('black').text('Date', tableLeft + 10, historyTableTop + 5, { width: historyColWidth - 10 });
        doc.text('Montant', tableLeft + historyColWidth + 10, historyTableTop + 5, { width: historyColWidth - 10 });
        doc.text('Méthode', tableLeft + historyColWidth * 2 + 10, historyTableTop + 5, { width: historyColWidth - 10 });

        // Table rows
        let currentY = historyTableTop + 20;
        payments.forEach((payment, index) => {
          const paymentDate = new Date(payment.datePayment).toLocaleDateString('fr-FR');

          doc.rect(tableLeft, currentY, historyColWidth * 3, 25).stroke();
          doc.text(paymentDate, tableLeft + 10, currentY + 5, { width: historyColWidth - 10 });
          doc.text(`${payment.montant} €`, tableLeft + historyColWidth + 10, currentY + 5, { width: historyColWidth - 10 });
          doc.text(payment.methodePaiement, tableLeft + historyColWidth * 2 + 10, currentY + 5, { width: historyColWidth - 10 });

          currentY += 25;
        });

        doc.moveDown(3);
      }

      // Calculate days overdue
      const dueDate = new Date(charge.dateEcheance);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      // Warning message
      doc.rect(50, doc.y, doc.page.width - 100, 80).fill('#ffeeee');
      doc.fillColor('red').fontSize(14).text('AVIS IMPORTANT', 50, doc.y - 70, { align: 'center', width: doc.page.width - 100 });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Ce paiement est en retard de ${daysOverdue} jours.`, { align: 'center', width: doc.page.width - 100 });
      doc.moveDown(0.5);
      doc.text('Nous vous prions de bien vouloir régler le montant restant dans les plus brefs délais pour éviter des frais supplémentaires et des poursuites judiciaires.', { align: 'center', width: doc.page.width - 100 });
      doc.fillColor('black');
      doc.moveDown(3);

      // Payment instructions
      doc.fontSize(12).text('Instructions de paiement:');
      doc.moveDown(0.5);
      doc.fontSize(10).text('1. Par virement bancaire:');
      doc.text('   IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX');
      doc.text('   BIC: XXXXXXXX');
      doc.text('   Référence: AVC-' + charge.id.substring(0, 8));
      doc.moveDown(0.5);
      doc.text('2. Par chèque:');
      doc.text('   À l\'ordre de: Syndic de copropriété');
      doc.text('   Adresse: 123 Avenue des Syndics, 75000 Paris');
      doc.moveDown(0.5);
      doc.text('3. En espèces:');
      doc.text('   Directement au bureau du syndic sur rendez-vous');
      doc.moveDown(2);

      // Footer
      doc.fontSize(8).text('Ce document est un avis de paiement officiel émis par le syndic de copropriété.', { align: 'center' });
      doc.text('Pour toute question, veuillez contacter le service de gestion des paiements au 01 23 45 67 89.', { align: 'center' });

      // Finalize the PDF
      doc.end();

      // When the stream is finished, resolve the promise with the file path
      stream.on('finish', () => {
        resolve(outputPath);
      });

      // If there's an error, reject the promise
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a payment receipt PDF
 * @param {Object} data - Data for the PDF
 * @param {Object} data.payment - Payment object
 * @param {Object} data.charge - Charge object
 * @param {Object} data.proprietaire - Proprietaire object
 * @param {Object} data.appartement - Appartement object
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
const generatePaymentReceiptPDF = async (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const { payment, charge, proprietaire, appartement } = data;

      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Pipe the PDF to a file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add content to the PDF

      // Header
      doc.fontSize(20).text('REÇU DE PAIEMENT', { align: 'center' });
      doc.moveDown(2);

      // Receipt number and date
      doc.fontSize(12).text(`Reçu N°: ${payment.id}`);
      doc.text(`Date de paiement: ${new Date(payment.datePayment).toLocaleDateString('fr-FR')}`);
      doc.moveDown(2);

      // Proprietaire information
      doc.fontSize(14).text('Payé par:');
      doc.fontSize(12).text(`${proprietaire.firstName} ${proprietaire.lastName}`);
      doc.text(`Email: ${proprietaire.email}`);
      doc.text(`Téléphone: ${proprietaire.phoneNumber || 'Non spécifié'}`);
      doc.moveDown();

      // Appartement information
      doc.fontSize(14).text('Pour l\'appartement:');
      doc.fontSize(12).text(`Numéro: ${appartement.numero}`);
      doc.text(`Étage: ${appartement.etage}`);
      doc.moveDown(2);

      // Payment information
      doc.fontSize(16).text('Détails du paiement:', { underline: true });
      doc.moveDown();

      doc.fontSize(12).text(`Montant payé: ${payment.montant} €`);
      doc.text(`Méthode de paiement: ${payment.methodePaiement}`);
      if (payment.reference) {
        doc.text(`Référence: ${payment.reference}`);
      }
      doc.text(`Statut: ${payment.statut}`);
      doc.moveDown();

      // Charge information
      doc.fontSize(14).text('Pour la charge:');
      doc.fontSize(12).text(`Titre: ${charge.titre}`);
      doc.text(`Montant de la charge: ${charge.montant} €`);
      doc.text(`Date d'échéance: ${new Date(charge.dateEcheance).toLocaleDateString('fr-FR')}`);
      doc.moveDown(2);

      // Thank you message
      doc.fontSize(14).text('Nous vous remercions pour votre paiement.', { align: 'center' });
      doc.moveDown(2);

      // Notes
      if (payment.notes) {
        doc.fontSize(12).text('Notes:');
        doc.text(payment.notes);
        doc.moveDown(2);
      }

      // Footer
      doc.fontSize(10).text('Ce document est généré automatiquement et ne nécessite pas de signature.', { align: 'center' });
      doc.text('Veuillez conserver ce reçu comme preuve de paiement.', { align: 'center' });

      // Finalize the PDF
      doc.end();

      // When the stream is finished, resolve the promise with the file path
      stream.on('finish', () => {
        resolve(outputPath);
      });

      // If there's an error, reject the promise
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a payment history PDF
 * @param {Object} data - Data for the PDF
 * @param {Object} data.proprietaire - Proprietaire object
 * @param {Array} data.payments - Array of payment objects
 * @param {Array} data.charges - Array of charge objects
 * @param {string} startDate - Start date for the history
 * @param {string} endDate - End date for the history
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
const generatePaymentHistoryPDF = async (data, startDate, endDate, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const { proprietaire, payments, charges } = data;

      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Pipe the PDF to a file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add content to the PDF

      // Header
      doc.fontSize(20).text('HISTORIQUE DES PAIEMENTS', { align: 'center' });
      doc.moveDown();

      // Date range
      const formattedStartDate = new Date(startDate).toLocaleDateString('fr-FR');
      const formattedEndDate = new Date(endDate).toLocaleDateString('fr-FR');
      doc.fontSize(12).text(`Période: du ${formattedStartDate} au ${formattedEndDate}`, { align: 'center' });
      doc.moveDown(2);

      // Proprietaire information
      doc.fontSize(14).text('Propriétaire:');
      doc.fontSize(12).text(`${proprietaire.firstName} ${proprietaire.lastName}`);
      doc.text(`Email: ${proprietaire.email}`);
      doc.text(`Téléphone: ${proprietaire.phoneNumber || 'Non spécifié'}`);
      doc.moveDown(2);

      // Summary
      const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.montant), 0);
      const totalCharges = charges.reduce((sum, charge) => sum + parseFloat(charge.montant), 0);
      const totalUnpaid = totalCharges - totalPaid;

      doc.fontSize(14).text('Résumé:', { underline: true });
      doc.fontSize(12).text(`Total des charges: ${totalCharges.toFixed(2)} €`);
      doc.text(`Total payé: ${totalPaid.toFixed(2)} €`);
      doc.text(`Reste à payer: ${totalUnpaid.toFixed(2)} €`);
      doc.moveDown(2);

      // Payments table
      doc.fontSize(14).text('Détail des paiements:', { underline: true });
      doc.moveDown();

      // Table headers
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidth = (doc.page.width - 100) / 4;

      doc.fontSize(10).text('Date', tableLeft, tableTop);
      doc.text('Montant', tableLeft + colWidth, tableTop);
      doc.text('Méthode', tableLeft + colWidth * 2, tableTop);
      doc.text('Statut', tableLeft + colWidth * 3, tableTop);

      doc.moveDown();
      let tableY = doc.y;

      // Draw a line
      doc.moveTo(tableLeft, tableY).lineTo(tableLeft + colWidth * 4, tableY).stroke();
      doc.moveDown(0.5);
      tableY = doc.y;

      // Table rows
      payments.forEach((payment, index) => {
        const rowY = tableY + index * 20;

        // Check if we need a new page
        if (rowY > doc.page.height - 100) {
          doc.addPage();
          tableY = 50;
        }

        const paymentDate = new Date(payment.datePayment).toLocaleDateString('fr-FR');

        doc.fontSize(10).text(paymentDate, tableLeft, tableY + index * 20);
        doc.text(`${payment.montant} €`, tableLeft + colWidth, tableY + index * 20);
        doc.text(payment.methodePaiement, tableLeft + colWidth * 2, tableY + index * 20);
        doc.text(payment.statut, tableLeft + colWidth * 3, tableY + index * 20);
      });

      doc.moveDown(payments.length + 2);

      // Unpaid charges
      const unpaidCharges = charges.filter(charge => charge.statut !== 'payé');

      if (unpaidCharges.length > 0) {
        doc.fontSize(14).text('Charges impayées:', { underline: true });
        doc.moveDown();

        // Table headers
        const unpaidTableTop = doc.y;

        doc.fontSize(10).text('Titre', tableLeft, unpaidTableTop);
        doc.text('Montant', tableLeft + colWidth, unpaidTableTop);
        doc.text('Échéance', tableLeft + colWidth * 2, unpaidTableTop);
        doc.text('Statut', tableLeft + colWidth * 3, unpaidTableTop);

        doc.moveDown();
        let unpaidTableY = doc.y;

        // Draw a line
        doc.moveTo(tableLeft, unpaidTableY).lineTo(tableLeft + colWidth * 4, unpaidTableY).stroke();
        doc.moveDown(0.5);
        unpaidTableY = doc.y;

        // Table rows
        unpaidCharges.forEach((charge, index) => {
          const rowY = unpaidTableY + index * 20;

          // Check if we need a new page
          if (rowY > doc.page.height - 100) {
            doc.addPage();
            unpaidTableY = 50;
          }

          const dueDate = new Date(charge.dateEcheance).toLocaleDateString('fr-FR');

          doc.fontSize(10).text(charge.titre, tableLeft, unpaidTableY + index * 20);
          doc.text(`${charge.montant} €`, tableLeft + colWidth, unpaidTableY + index * 20);
          doc.text(dueDate, tableLeft + colWidth * 2, unpaidTableY + index * 20);
          doc.text(charge.statut, tableLeft + colWidth * 3, unpaidTableY + index * 20);
        });
      }

      doc.moveDown(4);

      // Footer
      doc.fontSize(10).text('Ce document est généré automatiquement et ne nécessite pas de signature.', { align: 'center' });
      doc.text('Pour toute question concernant vos paiements, veuillez contacter votre syndic.', { align: 'center' });

      // Finalize the PDF
      doc.end();

      // When the stream is finished, resolve the promise with the file path
      stream.on('finish', () => {
        resolve(outputPath);
      });

      // If there's an error, reject the promise
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Ensure the uploads directory exists
const ensureUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const pdfsDir = path.join(uploadsDir, 'pdfs');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir);
  }

  return pdfsDir;
};

module.exports = {
  generatePaymentReminderPDF,
  generatePaymentReceiptPDF,
  generatePaymentHistoryPDF,
  ensureUploadsDirectory
};
