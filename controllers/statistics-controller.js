const Payment = require('../models/payment');
const Charge = require('../models/charge');
const Proprietaire = require('../models/proprietaire');
const Appartement = require('../models/appartement');
const { db } = require('../config/firebase-config');

exports.getDashboardStats = async (req, res) => {
    try {
        const syndicId = req.userId;

        const totalPayments = await Payment.countDocuments({ syndicId });
        const totalCharges = await Charge.countDocuments({ syndicId });
        const totalProprietaires = await Proprietaire.countDocuments({ syndicId });
        const totalAppartements = await Appartement.countDocuments({ syndicId });

        const pendingPayments = await Payment.countDocuments({
            syndicId,
            statut: 'en attente'
        });

        // Get all confirmed payments for this syndic
        const confirmedPayments = await Payment.findBySyndicId(syndicId);
        const confirmedPaymentsFiltered = confirmedPayments.filter(p => p.statut === 'confirmé');
        const totalPaymentsAmount = confirmedPaymentsFiltered.reduce((sum, payment) => sum + parseFloat(payment.montant), 0);

        const unpaidCharges = await Charge.countDocuments({
            syndicId,
            statut: 'non payé'
        });

        res.status(200).json({
            success: true,
            stats: {
                overview: {
                    totalProprietaires,
                    totalAppartements,
                    totalCharges,
                    totalPayments
                },
                financial: {
                    totalPaymentsAmount: totalPaymentsAmount[0]?.total || 0,
                    pendingPayments,
                    unpaidCharges
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getPaymentStats = async (req, res) => {
    try {
        const syndicId = req.userId;
        const { startDate, endDate } = req.query;

        const query = { syndicId };
        if (startDate && endDate) {
            query.datePayment = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get all payments matching the query
        const payments = await Payment.findBySyndicId(syndicId);

        // Filter by date if needed
        let filteredPayments = payments;
        if (startDate && endDate) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            filteredPayments = payments.filter(payment => {
                const paymentDate = new Date(payment.datePayment);
                return paymentDate >= startDateObj && paymentDate <= endDateObj;
            });
        }

        // Group by status
        const statusMap = {};
        filteredPayments.forEach(payment => {
            const status = payment.statut;
            if (!statusMap[status]) {
                statusMap[status] = {
                    _id: status,
                    count: 0,
                    totalAmount: 0
                };
            }
            statusMap[status].count++;
            statusMap[status].totalAmount += parseFloat(payment.montant);
        });
        const paymentsByStatus = Object.values(statusMap);

        // Group by method
        const methodMap = {};
        filteredPayments.forEach(payment => {
            const method = payment.methodePaiement;
            if (!methodMap[method]) {
                methodMap[method] = {
                    _id: method,
                    count: 0,
                    totalAmount: 0
                };
            }
            methodMap[method].count++;
            methodMap[method].totalAmount += parseFloat(payment.montant);
        });
        const paymentsByMethod = Object.values(methodMap);

        res.status(200).json({
            success: true,
            stats: {
                byStatus: paymentsByStatus,
                byMethod: paymentsByMethod
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getChargeStats = async (req, res) => {
    try {
        const syndicId = req.userId;

        // Get all charges for this syndic
        const charges = await Charge.findBySyndicId(syndicId);

        // Group by status
        const statusMap = {};
        charges.forEach(charge => {
            const status = charge.statut;
            if (!statusMap[status]) {
                statusMap[status] = {
                    _id: status,
                    count: 0,
                    totalAmount: 0
                };
            }
            statusMap[status].count++;
            statusMap[status].totalAmount += parseFloat(charge.montant);
        });
        const chargesByStatus = Object.values(statusMap);

        // Group by category
        const categoryMap = {};
        charges.forEach(charge => {
            const category = charge.categorie;
            if (!categoryMap[category]) {
                categoryMap[category] = {
                    _id: category,
                    count: 0,
                    totalAmount: 0
                };
            }
            categoryMap[category].count++;
            categoryMap[category].totalAmount += parseFloat(charge.montant);
        });
        const chargesByCategory = Object.values(categoryMap);

        res.status(200).json({
            success: true,
            stats: {
                byStatus: chargesByStatus,
                byCategory: chargesByCategory
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getProprietaireStats = async (req, res) => {
    try {
        const syndicId = req.userId;

        // Get all payments for this syndic
        const payments = await Payment.findBySyndicId(syndicId);

        // Group by proprietaire ID
        const proprietaireMap = {};
        payments.forEach(payment => {
            const proprietaireId = payment.proprietaireId;
            if (!proprietaireMap[proprietaireId]) {
                proprietaireMap[proprietaireId] = {
                    _id: proprietaireId,
                    totalPayments: 0,
                    totalAmount: 0
                };
            }
            proprietaireMap[proprietaireId].totalPayments++;
            proprietaireMap[proprietaireId].totalAmount += parseFloat(payment.montant);
        });
        const proprietairesByPaymentStatus = Object.values(proprietaireMap);

        res.status(200).json({
            success: true,
            stats: {
                byPaymentStatus: proprietairesByPaymentStatus
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAppartementStats = async (req, res) => {
    try {
        const syndicId = req.userId;

        // Get all apartments in buildings managed by this syndic
        const immeubles = await db.collection('immeubles')
            .where('syndicId', '==', syndicId)
            .get();

        const immeubleIds = [];
        immeubles.forEach(doc => {
            immeubleIds.push(doc.id);
        });

        let allAppartements = [];
        for (const immeubleId of immeubleIds) {
            const appartements = await Appartement.findByImmeubleId(immeubleId);
            allAppartements = [...allAppartements, ...appartements];
        }

        // Group by occupation status
        const occupationMap = {};
        allAppartements.forEach(appartement => {
            const status = appartement.statut;
            if (!occupationMap[status]) {
                occupationMap[status] = {
                    _id: status,
                    count: 0
                };
            }
            occupationMap[status].count++;
        });
        const appartementsByOccupation = Object.values(occupationMap);

        // Get all charges for this syndic
        const charges = await Charge.findBySyndicId(syndicId);

        // Group by apartment ID
        const chargesByAppartementMap = {};
        charges.forEach(charge => {
            const appartementId = charge.appartementId;
            if (!chargesByAppartementMap[appartementId]) {
                chargesByAppartementMap[appartementId] = {
                    _id: appartementId,
                    totalCharges: 0,
                    totalAmount: 0
                };
            }
            chargesByAppartementMap[appartementId].totalCharges++;
            chargesByAppartementMap[appartementId].totalAmount += parseFloat(charge.montant);
        });
        const appartementsByCharges = Object.values(chargesByAppartementMap);

        res.status(200).json({
            success: true,
            stats: {
                byOccupation: appartementsByOccupation,
                byCharges: appartementsByCharges
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};