# Express Firebase API

A RESTful API built with Express.js and Firebase for managing property syndication, including users, syndics, and proprietaires.

## Technologies Used

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework for Node.js
- **Firebase/Firestore**: NoSQL cloud database for data storage
- **Firebase Admin SDK**: Server-side Firebase authentication and management
- **JSON Web Tokens (JWT)**: For secure authentication (simplified in development)
- **Cors**: Cross-Origin Resource Sharing middleware
- **Dotenv**: Environment variable management

## Project Structure

```
express-firebase-api/
├── config/
│   └── firebase-config.js     # Firebase configuration
├── controllers/
│   ├── auth-controller.js     # Authentication logic
│   ├── proprietaire-controller.js # Proprietaire management
│   └── test-controller.js     # Test endpoints
├── middleware/
│   └── auth-middleware.js     # Authentication middleware
├── models/
│   ├── user.js               # Base User model
│   ├── syndic.js             # Syndic model (inherits from User)
│   └── proprietaire.js       # Proprietaire model (inherits from User)
├── routes/
│   ├── auth-routes.js        # Authentication routes
│   ├── proprietaire-routes.js # Proprietaire management routes
│   └── test-routes.js        # Test routes
├── scripts/
│   └── init-default-syndic.js # Script to initialize default syndic
├── .env                      # Environment variables
├── .gitignore                # Git ignore file
├── package.json              # Project dependencies
├── server.js                 # Main application entry point
└── README.md                 # Project documentation
```

## Class Hierarchy

The project implements a class hierarchy based on the class diagram:

- **User**: Base class with common user properties and methods
- **Syndic**: Inherits from User, represents property managers
- **Proprietaire**: Inherits from User, represents property owners

## Features

- User authentication (login/logout)
- Role-based access control
- Default Syndic creation on server startup
- Proprietaire management (CRUD operations)
- Syndic-only access to Proprietaire management

## Setup and Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd express-firebase-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Generate a service account key (Project Settings > Service Accounts > Generate New Private Key)
   - Save the key file in the project root as `pfe-project-97821-firebase-adminsdk-fbsvc-ac37cf24d0.json`
   - Create a Firestore database in your Firebase project

4. **Configure environment variables**
   - Create a `.env` file in the project root
   - Add the following variables:
     ```
     GOOGLE_APPLICATION_CREDENTIALS=./pfe-project-97821-firebase-adminsdk-fbsvc-ac37cf24d0.json
     FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com/
     PORT=3000
     ```

5. **Start the server**
   ```bash
   node server.js
   ```

## API Endpoints

### Authentication

- **POST /api/auth/login**: User login
- **POST /api/auth/syndic/login**: Syndic login
- **GET /api/auth/profile**: Get user profile (protected)

### Proprietaire Management (Syndic only)

- **GET /api/proprietaires**: Get all proprietaires
- **GET /api/proprietaires/my-proprietaires**: Get proprietaires created by current syndic
- **GET /api/proprietaires/:id**: Get a specific proprietaire
- **POST /api/proprietaires**: Create a new proprietaire
- **PUT /api/proprietaires/:id**: Update a proprietaire
- **DELETE /api/proprietaires/:id**: Delete a proprietaire

### Test Endpoints

- **GET /api/items**: Get all items
- **POST /api/items**: Create a new item

## Authentication

The API uses a simplified token-based authentication system for development:

1. Login to get a token
2. Include the token in the Authorization header for protected routes:
   ```
   Authorization: Bearer <token>
   ```










1-remove all crud operation related w # syndic-app
# syndic-api
