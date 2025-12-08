# AYUSH Startup Registration Portal - Code Structure Analysis

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Backend Structure](#backend-structure)
5. [Frontend Structure](#frontend-structure)
6. [Data Models](#data-models)
7. [API Architecture](#api-architecture)
8. [Key Features & Workflows](#key-features--workflows)
9. [Security & Authentication](#security--authentication)
10. [Document Processing Pipeline](#document-processing-pipeline)
11. [File Organization](#file-organization)

---

## Project Overview

The **AYUSH Startup Registration Portal** is a full-stack web application designed to facilitate the registration and management of startups in the AYUSH (Ayurveda, Yoga, Unani, Siddha, Homoeopathy) sectors. The platform supports multiple application types including startup registration, manufacturing licenses, loan licenses, clinics, and training centers.

### Core Purpose
- Enable startup owners to register and submit applications
- Manage document requirements per sector and application type
- Process and verify uploaded documents using OCR
- Provide role-based access for officials, investors, and administrators
- Track application status and review history

---

## Architecture

### System Architecture Pattern
- **Backend**: RESTful API using Express.js (Node.js)
- **Frontend**: Single Page Application (SPA) using React with Vite
- **Database**: MongoDB (NoSQL) with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local filesystem (with AWS S3 SDK available)

### Architecture Flow
```
Client (React) → API Routes → Controllers → Models → MongoDB
                      ↓
                 Middleware (Auth, Error Handling)
                      ↓
                 Utilities (OCR, Storage, Email)
```

---

## Technology Stack

### Backend Dependencies
- **Core Framework**: Express.js 5.1.0
- **Database**: Mongoose 8.19.1 (MongoDB ODM)
- **Authentication**: jsonwebtoken 9.0.2, bcryptjs 3.0.2
- **File Processing**: 
  - multer 2.0.2 (file uploads)
  - pdf-poppler 0.2.3 (PDF processing)
  - sharp 0.34.5, jimp 1.6.0 (image processing)
- **Document Processing**: 
  - jsqr 1.4.0, qrcode-reader 1.0.4 (QR code scanning)
  - bwip-js 4.7.0 (barcode generation)
- **Utilities**: 
  - nodemailer 7.0.11 (email notifications)
  - axios 1.12.2 (HTTP client)
  - @aws-sdk/client-s3 3.884.0 (cloud storage)
- **Development**: nodemon 3.1.10, eslint 9.35.0

### Frontend Dependencies
- **Core**: React 19.1.0, React DOM 19.1.0
- **Routing**: react-router-dom 6.26.1
- **State Management**: 
  - React Context API (AuthContext)
  - @reduxjs/toolkit 2.2.7, react-redux 9.1.2
- **UI/UX**: 
  - Tailwind CSS 3.4.17
  - lucide-react 0.436.0 (icons)
  - react-toastify 10.0.5 (notifications)
- **Charts**: chart.js 4.4.4, react-chartjs-2 5.2.0
- **Build Tool**: Vite 5.4.20

---

## Backend Structure

### Directory Structure
```
backend/
├── server.js                    # Entry point, DB connection, server startup
├── seedRequirements.js          # Database seeding script
├── package.json
├── public/
│   └── uploads/                 # Document storage (user-organized folders)
├── src/
│   ├── app.js                   # Express app configuration, middleware, routes
│   ├── config/
│   │   └── db.js                # MongoDB connection configuration
│   ├── controllers/             # Business logic handlers
│   │   ├── applicationController.js
│   │   ├── authController.js
│   │   ├── documentController.js
│   │   ├── productController.js
│   │   ├── requirementController.js
│   │   ├── startupController.js
│   │   └── userController.js
│   ├── models/                  # Mongoose schemas
│   │   ├── Application.js
│   │   ├── Document.js
│   │   ├── DocumentRequirement.js
│   │   ├── DocumentTemplate.js
│   │   ├── Startup.js
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Investment.js
│   │   ├── Investor.js
│   │   ├── GovernmentOfficial.js
│   │   ├── Session.js
│   │   ├── VerificationOTP.js
│   │   ├── Barcode.js
│   │   ├── YogaTutorial.js
│   │   └── YogaPoseFeedback.js
│   ├── routes/                  # API route definitions
│   │   ├── applicationRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── productRoutes.js
│   │   ├── requirementRoutes.js
│   │   ├── startupRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/              # Express middleware
│   │   ├── authMiddleware.js    # JWT authentication
│   │   ├── errorHandler.js      # Error handling & custom error classes
│   │   └── requireRole.js       # Role-based access control
│   ├── utils/                   # Utility functions
│   │   ├── ocrProcessor.js      # OCR processing logic
│   │   ├── docVerification.js   # Document verification
│   │   ├── sendEmail.js         # Email service
│   │   └── storage.js           # File storage utilities
│   ├── extractors/              # Document field extractors
│   │   ├── index.js
│   │   ├── aadhaarExtractor.js
│   │   ├── addressProofExtractor.js
│   │   ├── businessPitchExtractor.js
│   │   ├── companyRegistrationExtractor.js
│   │   ├── founderIdExtractor.js
│   │   ├── gstExtractor.js
│   │   └── panExtractor.js
│   └── seeds/                   # Database seed data
│       └── requirements/
│           └── [6 seed files]
```

### Key Backend Components

#### 1. **Server Entry Point** (`server.js`)
- Initializes MongoDB connection
- Sets up global error handlers (unhandled rejections, uncaught exceptions)
- Creates and starts Express app
- Port: 5002 (configurable via env)

#### 2. **App Configuration** (`src/app.js`)
- Configures Express middleware (CORS, body parser, static file serving)
- Dynamically loads all Mongoose models
- Registers API routes:
  - `/api/users` - User management
  - `/api/startups` - Startup operations
  - `/api/documents` - Document upload/management
  - `/api/applications` - Application lifecycle
  - `/api/requirements` - Document requirements
  - `/product` - Product management
- Error handling middleware (404, global error handler)
- Health check endpoint (`/health`)

#### 3. **Authentication System**
- **JWT-based**: Tokens stored in localStorage (frontend)
- **Middleware**: `authMiddleware.js` validates JWT and attaches user to request
- **Role-based**: Supports `startup_owner`, `investor`, `gov_official`, `admin`, `user`
- **Role Verification**: Special handling for `gov_official` role verification

#### 4. **Error Handling**
- Custom error classes: `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`
- Mongoose error transformation
- JWT error handling
- Multer (file upload) error handling
- Development vs production error responses
- Global unhandled rejection/exception handlers

---

## Frontend Structure

### Directory Structure
```
client/
├── index.html                   # Entry HTML
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── package.json
├── public/
│   ├── ayush_banner.jpeg       # Static assets
│   └── vite.svg
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # Main app component, routing
    ├── App.css
    ├── index.css               # Global styles
    ├── api.js                  # API client (axios wrapper)
    ├── context/
    │   └── AuthContext.jsx     # Authentication context provider
    └── components/             # React components
        ├── LandingPage.jsx
        ├── Login.jsx
        ├── Signup.jsx
        ├── PrivateRoute.jsx    # Protected route wrapper
        ├── Dashboard.jsx        # Startup owner dashboard
        ├── CompleteProfile.jsx
        ├── StartupApplication.jsx
        ├── SubmittedApplication.jsx
        ├── ApplicationsList.jsx
        ├── ApplicationView.jsx
        ├── StartupOwnerProfile.jsx
        ├── UserDashboard.jsx
        ├── UserProfile.jsx
        ├── UserProfileEdit.jsx
        ├── UserProfileView.jsx
        └── WebScrapping.jsx
```

### Key Frontend Components

#### 1. **Routing** (`App.jsx`)
- Public routes: `/`, `/login`, `/signup`, `/webscrap`
- Protected routes (wrapped in `PrivateRoute`):
  - Startup Owner: `/StartupOwner/dashboard`, `/StartupOwner/complete-profile`, `/StartupOwner/startup-application`, `/StartupOwner/applications`, `/StartupOwner/profile`
  - User: `/user/dashboard`, `/user/profile`, `/user/profile/view`, `/user/profile/edit`

#### 2. **Authentication Context** (`context/AuthContext.jsx`)
- Manages user state and authentication token
- Provides `login()`, `register()`, `logout()` functions
- Auto-fetches user profile on mount if token exists
- Token stored in localStorage

#### 3. **API Client** (`api.js`)
- Centralized API request handler
- Automatic JWT token injection
- Error handling and response parsing
- API modules:
  - `AuthAPI`: login, register, profile management
  - `StartupAPI`: startup CRUD operations
  - `DocumentAPI`: document upload, list, verify, reassign
  - `RequirementsAPI`: get document requirements
  - `ApplicationAPI`: application creation, submission, listing

#### 4. **Component Architecture**
- Functional components with React Hooks
- Context API for global state (auth)
- Tailwind CSS for styling
- React Router for navigation

---

## Data Models

### Core Models

#### 1. **User Model**
```javascript
{
  name: String (required)
  email: String (required, unique, indexed)
  password: String (hashed)
  phone_number: String
  role: Enum ['startup_owner', 'investor', 'gov_official', 'admin', 'user']
  role_verified: Boolean (default: true, except gov_official)
  verification_docs: [Document IDs]
  organization: String
  investment_sector: String
  designation: String
  department: String
  profile_meta: Mixed
  avatar_url: String
  last_login_at: Date
  is_active: Boolean
  timestamps: true
}
```

#### 2. **Startup Model**
```javascript
{
  user_id: ObjectId (ref: User, required)
  name: String (required)
  founder_name: String (required)
  email: String (required)
  phone_number: String
  startup_type: String
  status: Enum ['pending', 'under_review', 'approved', 'rejected', 'inactive']
  description: String
  website: String
  address: String
  tags: [String]
  products: [Product IDs]
  applications: [Application IDs]
  timestamps: true
}
```

#### 3. **Application Model**
```javascript
{
  startup_id: ObjectId (ref: Startup, required)
  sector: Enum ['ayurveda', 'yoga', 'unani', 'siddha', 'homoeopathy']
  application_type: Enum ['startup_registration', 'manufacturing_own', 'loan_license', 'clinic', 'training_center']
  status: Enum ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn']
  documents: [Document IDs]
  application_data: Mixed
  assigned_official: ObjectId (ref: User)
  reviewer_comment: String
  review_history: [ReviewHistorySchema]
  submitted_at: Date
  decision_at: Date
  decision_by: ObjectId (ref: User)
  required_status: Map<String, String>
  meta: Mixed
  timestamps: true
}
// Methods: checkRequiredDocuments()
```

#### 4. **Document Model**
```javascript
{
  application_id: ObjectId (ref: Application)
  startup_id: ObjectId (ref: Startup)
  uploaded_by: ObjectId (ref: User, required)
  doc_category_declared: String (required)
  doc_category_detected: String
  category_confidence: Number
  document_name: String (required)
  description: String
  fileUrl: String (required)
  filename: String
  file_size: Number
  ocr_status: Enum ['pending', 'processing', 'done', 'failed']
  ocr_text: Object
  ocr_language: String
  extracted_fields: Map<ExtractFieldSchema>
  extraction_version: String
  verified_status: Enum ['pending', 'verified', 'rejected']
  verified_by: ObjectId (ref: User)
  verified_at: Date
  rejection_reason: String
  versions: [DocumentVersionSchema]
  page_count: Number
  page_images: [PageImageSchema]
  checksum: String
  mismatch_flag: Boolean
  meta: Mixed
  timestamps: true
}
```

#### 5. **DocumentRequirement Model**
```javascript
{
  sector: Enum ['ayurveda', 'yoga', 'unani', 'siddha', 'homoeopathy']
  application_type: Enum ['startup_registration', 'manufacturing_own', 'loan_license', 'clinic', 'training_center']
  requirements: [{
    doc_category: String
    required: Boolean
    note: String
    extract_fields: [{name: String, label: String}]
  }]
  timestamps: true
  // Unique index on (sector, application_type)
}
```

### Additional Models
- **Product**: Startup product catalog
- **Investment**: Investment records
- **Investor**: Investor profiles
- **GovernmentOfficial**: Government official profiles
- **DocumentTemplate**: Document templates
- **Session**: User sessions
- **VerificationOTP**: OTP for document verification
- **Barcode**: Barcode generation/management
- **YogaTutorial**: Yoga tutorial content
- **YogaPoseFeedback**: User feedback on yoga poses

---

## API Architecture

### Route Structure
All API routes are prefixed with `/api` (except `/product`)

#### **User Routes** (`/api/users`)
- `POST /register` - User registration
- `POST /login` - User login (returns JWT)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile

#### **Startup Routes** (`/api/startups`)
- `POST /` - Create startup
- `GET /mine` - Get user's startups
- `GET /:id` - Get startup by ID
- `PUT /:id` - Update startup
- `DELETE /:id` - Delete startup

#### **Document Routes** (`/api/documents`)
- `POST /upload` - Upload document (multipart/form-data)
- `GET /list` - List documents (with filters: startup_id, application_id)
- `GET /:id` - Get document details
- `POST /:id/reassign` - Reassign document category
- `POST /:id/verify` - Verify document
- `POST /:id/replace` - Replace document file
- `POST /email-lookup` - Email lookup for OTP verification
- `POST /verify-otp` - Verify OTP for document
- `GET /requirements/list` - Get document requirements

#### **Application Routes** (`/api/applications`)
- `POST /` - Create application (auth required)
- `POST /:id/submit` - Submit application (auth required)
- `GET /:id` - Get application (auth required)
- `GET /my/list` - Get user's applications (startup owner)
- `GET /my/:id` - Get user's specific application
- `GET /` - List all applications (gov_official/admin only)

#### **Requirement Routes** (`/api/requirements`)
- `GET /:sector/:applicationType` - Get requirements for sector/type
- `GET /:sector/:applicationType/common` - Get common requirements

#### **Product Routes** (`/product`)
- Product management endpoints

### Authentication Flow
1. User registers/logs in → receives JWT token
2. Token stored in localStorage (frontend)
3. Token sent in `Authorization: Bearer <token>` header
4. `authMiddleware` validates token and attaches user to `req.user`
5. Role-based access control via `requireRole` middleware

---

## Key Features & Workflows

### 1. **User Registration & Authentication**
- Multi-role support (startup_owner, investor, gov_official, admin, user)
- JWT-based stateless authentication
- Role verification system (especially for gov_official)

### 2. **Startup Profile Management**
- Users can create and manage startup profiles
- Link multiple applications to a startup
- Track startup status (pending, under_review, approved, rejected)

### 3. **Application Submission Workflow**
```
1. User creates startup profile
2. User creates application (draft status)
3. System loads document requirements based on sector + application_type
4. User uploads required documents
5. Documents processed via OCR
6. Field extraction from documents
7. User submits application
8. Application assigned to government official
9. Official reviews and approves/rejects
10. Review history tracked
```

### 4. **Document Processing Pipeline**
- **Upload**: File uploaded via multer
- **Storage**: Files stored in `public/uploads/{user_email}/` or date-organized folders
- **OCR Processing**: 
  - PDF converted to images
  - OCR extracts text
  - Document classification (detected category)
- **Field Extraction**: 
  - Specialized extractors per document type (Aadhaar, PAN, GST, etc.)
  - Confidence scores stored
- **Verification**: 
  - Manual verification by officials
  - OTP-based email verification
  - Status tracking (pending, verified, rejected)

### 5. **Document Requirements System**
- Sector-specific requirements (Ayurveda, Yoga, Unani, Siddha, Homoeopathy)
- Application-type-specific requirements
- Dynamic requirement checking via `Application.checkRequiredDocuments()`
- Supports optional vs required documents

### 6. **Review & Approval System**
- Applications assigned to government officials
- Review history tracking (submitted, assigned, commented, approved, rejected, reopened)
- Comments and rejection reasons
- Decision tracking (decision_by, decision_at)

---

## Security & Authentication

### Authentication
- **JWT Tokens**: Stateless authentication
- **Password Hashing**: bcryptjs (likely used in authController)
- **Token Storage**: localStorage (frontend)
- **Token Validation**: Middleware validates on each protected request

### Authorization
- **Role-Based Access Control (RBAC)**:
  - `startup_owner`: Can create/manage own startups and applications
  - `gov_official`: Can review applications (if verified)
  - `admin`: Full access
  - `investor`: Investment-related access
  - `user`: Basic user access
- **Route Protection**: `PrivateRoute` component (frontend) + `authMiddleware` (backend)
- **Role Verification**: Special handling for `gov_official` role verification

### Error Handling
- Custom error classes for different error types
- Proper HTTP status codes
- Error logging (with stack traces in development)
- User-friendly error messages

### File Upload Security
- File size limits (via multer)
- File type validation (likely in documentController)
- User-specific upload directories
- Checksum verification (stored in Document model)

---

## Document Processing Pipeline

### 1. **Upload Stage**
- File received via `POST /api/documents/upload`
- Multer handles multipart/form-data
- File metadata extracted (size, name, type)

### 2. **Storage Stage**
- Files stored in organized directory structure:
  - `public/uploads/{user_email}/` or
  - `public/uploads/{user_email}-{timestamp}/`
- Original filename preserved with timestamp prefix

### 3. **OCR Processing Stage**
- PDF files converted to images (pdf-poppler)
- OCR service called (external API)
- Text extracted and stored in `ocr_text` field
- Language detection

### 4. **Classification Stage**
- Document category detected based on content
- Confidence score calculated
- Stored in `doc_category_detected` and `category_confidence`

### 5. **Field Extraction Stage**
- Specialized extractors called based on document type:
  - `aadhaarExtractor.js` - Aadhaar card fields
  - `panExtractor.js` - PAN card fields
  - `gstExtractor.js` - GST certificate fields
  - `addressProofExtractor.js` - Address proof fields
  - `founderIdExtractor.js` - Founder ID fields
  - `companyRegistrationExtractor.js` - Company registration fields
  - `businessPitchExtractor.js` - Business pitch fields
- Extracted fields stored in `extracted_fields` Map
- Confidence scores per field

### 6. **Verification Stage**
- Manual verification by officials
- OTP-based email verification
- Status updated (pending → verified/rejected)
- Verification metadata stored (verified_by, verified_at, rejection_reason)

### 7. **Version Management**
- Document versions tracked in `versions` array
- File replacement creates new version
- Previous versions preserved

---

## File Organization

### Backend File Organization
- **Separation of Concerns**: Clear separation between routes, controllers, models, middleware
- **Modular Structure**: Each feature has its own controller and route file
- **Utility Functions**: Reusable utilities in `utils/` directory
- **Extractors**: Document-specific extractors in dedicated `extractors/` directory
- **Error Handling**: Centralized error handling middleware

### Frontend File Organization
- **Component-Based**: Each page/feature is a separate component
- **Context API**: Global state (auth) managed via Context
- **API Client**: Centralized API communication
- **Routing**: All routes defined in `App.jsx`

### Upload Directory Structure
```
public/uploads/
├── {user_email}/
│   ├── {timestamp}-{filename}.pdf
│   └── pages/
│       └── {filename}-{page}.png
├── {user_email}-{timestamp}/
│   └── {timestamp}{filename}.pdf
└── ...
```

---

## Strengths of Current Architecture

1. **Clear Separation of Concerns**: Well-organized MVC-like structure
2. **Modular Design**: Easy to extend with new features
3. **Comprehensive Error Handling**: Custom error classes and centralized handling
4. **Document Processing**: Sophisticated OCR and field extraction pipeline
5. **Role-Based Access**: Multi-role system with proper authorization
6. **Type Safety**: Mongoose schemas provide data validation
7. **Scalable File Storage**: Organized upload structure, AWS S3 ready

## Areas for Potential Improvement

1. **Environment Configuration**: Consider using `config` package for environment management
2. **API Versioning**: Consider versioning API routes (`/api/v1/...`)
3. **Testing**: Add unit and integration tests
4. **API Documentation**: Consider Swagger/OpenAPI documentation
5. **Logging**: Implement structured logging (Winston, Pino)
6. **Caching**: Consider Redis for session/token caching
7. **Rate Limiting**: Add rate limiting middleware
8. **File Validation**: Enhance file type and size validation
9. **Database Indexing**: Review and optimize database indexes
10. **Frontend State Management**: Consider Redux for complex state (currently only Context for auth)

---

## Conclusion

The AYUSH Startup Registration Portal demonstrates a well-structured, full-stack application with:
- **Robust backend** with comprehensive document processing
- **Modern frontend** using React and Tailwind CSS
- **Secure authentication** with JWT and role-based access
- **Sophisticated document management** with OCR and field extraction
- **Scalable architecture** ready for production deployment

The codebase follows best practices for separation of concerns, error handling, and modular design, making it maintainable and extensible for future enhancements.

