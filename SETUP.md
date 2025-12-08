# AYUSH Registration Portal - Setup Guide

## Prerequisites

- **Node.js** (version 16 or higher)
- **MongoDB** (local or cloud instance like MongoDB Atlas)
- **npm** or **yarn**

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (see Environment Variables section below)
# Copy the example and fill in your values

# Seed the database with document requirements (optional but recommended)
node seedRequirements.js

# Start the development server
npm run dev
```

The backend will run on `http://localhost:5002`

### 2. Frontend Setup

```bash
# Navigate to client directory (in a new terminal)
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## Environment Variables

### Backend (.env file in `backend/` directory)

Create a `.env` file in the `backend/` directory with the following variables:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/ayush_portal
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ayush_portal

# Server Port
PORT=5002

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-here

# OCR API (for document processing)
OCR_API_URL=http://your-ocr-service-url/api/ocr

# Document Verification API (optional)
DOC_VER_API_BASE=https://doc-ver-service.onrender.com/api/v1/verify
DOC_VER_API_KEY=your-api-key-here

# File Upload Directory
UPLOAD_DIR=public/uploads

# Email Configuration (optional, for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Session Secret (generate a random string)
SESSION_SECRET=your-session-secret-here
```

### Frontend (.env file in `client/` directory)

Create a `.env` file in the `client/` directory:

```env
# API Base URL
VITE_API_BASE=http://localhost:5002/api
```

## Database Seeding

To populate the database with document requirements:

```bash
cd backend
node seedRequirements.js
```

This will create document requirements for all sectors (Ayurveda, Yoga, Unani, Siddha, Homoeopathy) and application types.

## Running the Application

### Development Mode

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd client
   npm run dev
   ```

3. **Access the Application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5002/api

### Production Build

**Backend:**
```bash
cd backend
# No build step needed, just run:
node server.js
```

**Frontend:**
```bash
cd client
npm run build
# The built files will be in the `dist/` directory
```

## Project Structure

```
ayush_registration_portal/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, error handling
│   │   ├── utils/           # Utilities (OCR, storage)
│   │   ├── extractors/      # Document field extractors
│   │   └── seeds/           # Database seed data
│   ├── public/uploads/      # Uploaded documents
│   ├── server.js           # Entry point
│   ├── seedRequirements.js # Database seeder
│   └── package.json
│
└── client/
    ├── src/
    │   ├── components/      # React components
    │   ├── context/         # React context (Auth)
    │   └── api.js           # API client
    ├── public/              # Static assets
    └── package.json
```

## Common Issues

### MongoDB Connection Error
- Ensure MongoDB is running locally, or
- Check your `MONGO_URI` in `.env` is correct
- For MongoDB Atlas, ensure your IP is whitelisted

### Port Already in Use
- Change the `PORT` in backend `.env` file
- Update `VITE_API_BASE` in frontend `.env` accordingly

### OCR Service Errors
- The OCR service may be down (503 errors are expected if service is unavailable)
- Documents will still be uploaded, but field extraction may fail
- Check `OCR_API_URL` in backend `.env`

### Missing Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd client
npm install
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/list` - List documents
- `GET /api/documents/:id` - Get document details

### Requirements
- `GET /api/requirements?sector=ayurveda&application_type=startup_registration` - Get document requirements

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - List applications

## Testing

After setup, you can:
1. Register a new user account
2. Create a startup profile
3. Submit a startup registration application
4. Upload required documents (Founder ID, Address Proof, Business Plan, etc.)

## Support

For issues or questions, check:
- Backend logs in the terminal
- Browser console for frontend errors
- MongoDB connection status




