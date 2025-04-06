# Postman Testing Guide for Payment Endpoints

## Authentication

For all requests, use the following header:
```
Authorization: Bearer odOD7IZcTxBTFm1AXRNM:syndic
```

## 1. Get All Payments (Syndic Only)

**Request:**
- Method: GET
- URL: http://localhost:3000/api/payments

**Expected Response:**
```json
{
  "success": true,
  "count": 2,
  "payments": [
    {
      "id": "I4I8ZfkxSjGbaLPZYpen",
      "montant": 100,
      "datePayment": "2025-04-05T22:59:35.863Z",
      "methodePaiement": "virement",
      "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
      "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "statut": "confirmé",
      "isPartial": false,
      "remainingAmount": 0,
      "notes": "",
      "createdAt": "2025-04-05T22:59:35.863Z",
      "updatedAt": "2025-04-06T14:45:00.000Z"
    },
    {
      "id": "keN8ZFO02rD9gxQ4ggtG",
      "montant": 300,
      "datePayment": "2025-04-05T22:52:49.221Z",
      "methodePaiement": "virement",
      "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
      "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "statut": "confirmé",
      "isPartial": false,
      "remainingAmount": 0,
      "notes": "",
      "createdAt": "2025-04-05T22:52:49.221Z",
      "updatedAt": "2025-04-06T14:45:00.000Z"
    }
  ]
}
```

## 2. Get Payment by ID

**Request:**
- Method: GET
- URL: http://localhost:3000/api/payments/I4I8ZfkxSjGbaLPZYpen

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "id": "I4I8ZfkxSjGbaLPZYpen",
    "montant": 100,
    "datePayment": "2025-04-05T22:59:35.863Z",
    "methodePaiement": "virement",
    "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
    "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
    "syndicId": "odOD7IZcTxBTFm1AXRNM",
    "statut": "confirmé",
    "isPartial": false,
    "remainingAmount": 0,
    "notes": "",
    "createdAt": "2025-04-05T22:59:35.863Z",
    "updatedAt": "2025-04-06T14:45:00.000Z"
  }
}
```

## 3. Create a New Payment

**Request:**
- Method: POST
- URL: http://localhost:3000/api/payments
- Body (raw JSON):
```json
{
  "montant": 150,
  "methodePaiement": "carte bancaire",
  "reference": "CB-123456",
  "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
  "notes": "Test payment"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Paiement enregistré avec succès",
  "payment": {
    "id": "newPaymentId",
    "montant": 150,
    "datePayment": "2025-04-06T15:00:00.000Z",
    "methodePaiement": "carte bancaire",
    "reference": "CB-123456",
    "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
    "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
    "syndicId": "odOD7IZcTxBTFm1AXRNM",
    "statut": "en attente",
    "isPartial": false,
    "remainingAmount": 0,
    "notes": "Test payment",
    "createdAt": "2025-04-06T15:00:00.000Z",
    "updatedAt": "2025-04-06T15:00:00.000Z"
  }
}
```

## 4. Confirm a Payment

**Request:**
- Method: PUT
- URL: http://localhost:3000/api/payments/newPaymentId/confirm
- Body (raw JSON):
```json
{
  "notes": "Payment verified and confirmed"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Paiement confirmé avec succès",
  "payment": {
    "id": "newPaymentId",
    "montant": 150,
    "datePayment": "2025-04-06T15:00:00.000Z",
    "methodePaiement": "carte bancaire",
    "reference": "CB-123456",
    "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
    "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
    "syndicId": "odOD7IZcTxBTFm1AXRNM",
    "statut": "confirmé",
    "isPartial": false,
    "remainingAmount": 0,
    "notes": "Payment verified and confirmed",
    "createdAt": "2025-04-06T15:00:00.000Z",
    "updatedAt": "2025-04-06T15:05:00.000Z"
  }
}
```

## 5. Reject a Payment

**Request:**
- Method: PUT
- URL: http://localhost:3000/api/payments/anotherPaymentId/reject
- Body (raw JSON):
```json
{
  "notes": "Payment rejected due to incorrect reference"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Paiement rejeté avec succès",
  "payment": {
    "id": "anotherPaymentId",
    "montant": 150,
    "datePayment": "2025-04-06T15:10:00.000Z",
    "methodePaiement": "carte bancaire",
    "reference": "CB-123456",
    "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
    "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
    "syndicId": "odOD7IZcTxBTFm1AXRNM",
    "statut": "rejeté",
    "isPartial": false,
    "remainingAmount": 0,
    "notes": "Payment rejected due to incorrect reference",
    "createdAt": "2025-04-06T15:10:00.000Z",
    "updatedAt": "2025-04-06T15:15:00.000Z"
  }
}
```

## 6. Get Payments for a Proprietaire

**Request:**
- Method: GET
- URL: http://localhost:3000/api/payments/proprietaire/DInteWB2Hx8vt0QmcsnT

**Expected Response:**
```json
{
  "success": true,
  "count": 2,
  "payments": [
    {
      "id": "I4I8ZfkxSjGbaLPZYpen",
      "montant": 100,
      "datePayment": "2025-04-05T22:59:35.863Z",
      "methodePaiement": "virement",
      "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
      "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "statut": "confirmé",
      "isPartial": false,
      "remainingAmount": 0,
      "notes": "",
      "createdAt": "2025-04-05T22:59:35.863Z",
      "updatedAt": "2025-04-06T14:45:00.000Z"
    },
    {
      "id": "keN8ZFO02rD9gxQ4ggtG",
      "montant": 300,
      "datePayment": "2025-04-05T22:52:49.221Z",
      "methodePaiement": "virement",
      "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
      "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "statut": "confirmé",
      "isPartial": false,
      "remainingAmount": 0,
      "notes": "",
      "createdAt": "2025-04-05T22:52:49.221Z",
      "updatedAt": "2025-04-06T14:45:00.000Z"
    }
  ]
}
```

## 7. Get Payment History for a Proprietaire

**Request:**
- Method: GET
- URL: http://localhost:3000/api/payments/history/DInteWB2Hx8vt0QmcsnT

**Expected Response:**
```json
{
  "success": true,
  "proprietaire": {
    "id": "DInteWB2Hx8vt0QmcsnT",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "proprietaire"
  },
  "startDate": "2023-01-01",
  "endDate": "2023-12-31",
  "payments": [
    {
      "id": "I4I8ZfkxSjGbaLPZYpen",
      "montant": 100,
      "datePayment": "2025-04-05T22:59:35.863Z",
      "methodePaiement": "virement",
      "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
      "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "statut": "confirmé",
      "isPartial": false,
      "remainingAmount": 0,
      "notes": "",
      "createdAt": "2025-04-05T22:59:35.863Z",
      "updatedAt": "2025-04-06T14:45:00.000Z"
    },
    {
      "id": "keN8ZFO02rD9gxQ4ggtG",
      "montant": 300,
      "datePayment": "2025-04-05T22:52:49.221Z",
      "methodePaiement": "virement",
      "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
      "proprietaireId": "DInteWB2Hx8vt0QmcsnT",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "statut": "confirmé",
      "isPartial": false,
      "remainingAmount": 0,
      "notes": "",
      "createdAt": "2025-04-05T22:52:49.221Z",
      "updatedAt": "2025-04-06T14:45:00.000Z"
    }
  ],
  "charges": [
    {
      "id": "Xk3jgKqDkL8H5oFd6jcV",
      "titre": "Frais de maintenance",
      "description": "Maintenance annuelle",
      "montant": 400,
      "dateEcheance": "2023-12-31",
      "statut": "payé",
      "montantPaye": 400,
      "montantRestant": 0,
      "appartementId": "BPKrLElwyewz23bofrWO",
      "syndicId": "odOD7IZcTxBTFm1AXRNM",
      "categorie": "maintenance",
      "dernierRappel": null,
      "createdAt": "2025-04-05T22:50:00.000Z",
      "updatedAt": "2025-04-05T23:00:00.000Z"
    }
  ]
}
```

## 8. Generate Payment Reminder (Avis Client)

**Request:**
- Method: POST
- URL: http://localhost:3000/api/payments/reminder/Xk3jgKqDkL8H5oFd6jcV
- Body (raw JSON):
```json
{
  "message": "Nous vous rappelons que votre paiement est en retard. Veuillez régler cette charge dès que possible."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Rappel de paiement généré avec succès",
  "reminder": {
    "chargeId": "Xk3jgKqDkL8H5oFd6jcV",
    "pdfUrl": "/uploads/pdfs/avis_client_Xk3jgKqDkL8H5oFd6jcV_1712425200000.pdf",
    "sentAt": "2025-04-06T15:20:00.000Z"
  },
  "notification": {
    "id": "notif123",
    "userId": "DInteWB2Hx8vt0QmcsnT",
    "title": "Payment Reminder",
    "message": "You have an overdue payment for: Frais de maintenance of 400.00€. Please pay as soon as possible.",
    "type": "warning",
    "relatedTo": "charge",
    "relatedId": "Xk3jgKqDkL8H5oFd6jcV",
    "pdfUrl": "/uploads/pdfs/avis_client_Xk3jgKqDkL8H5oFd6jcV_1712425200000.pdf",
    "read": false,
    "createdAt": "2025-04-06T15:20:00.000Z",
    "updatedAt": "2025-04-06T15:20:00.000Z"
  }
}
```

## Notes

1. Replace IDs in the examples with actual IDs from your database.
2. The server must be running (`npm start`) for these requests to work.
3. All requests require the syndic authentication header.
4. For creating payments as a proprietaire, you would need to use a proprietaire authentication token.
