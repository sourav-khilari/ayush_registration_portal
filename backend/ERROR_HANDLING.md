# Error Handling System

This document describes the comprehensive error handling system implemented in the AYUSH Registration Portal backend.

## Overview

The error handling system provides:
- **Centralized error management** with consistent error responses
- **Custom error classes** for different types of errors
- **Automatic error logging** with detailed context
- **Graceful error handling** for async operations
- **Global error handlers** for unhandled exceptions

## Error Classes

### AppError (Base Error Class)
```javascript
throw new AppError("Custom error message", 400, true);
```

### ValidationError (400)
```javascript
throw new ValidationError("Invalid input data");
```

### AuthenticationError (401)
```javascript
throw new AuthenticationError("Invalid credentials");
```

### AuthorizationError (403)
```javascript
throw new AuthorizationError("Access denied");
```

### NotFoundError (404)
```javascript
throw new NotFoundError("User");
// Results in: "User not found"
```

### ConflictError (409)
```javascript
throw new ConflictError("Email already exists");
```

## Error Response Format

All errors follow a consistent response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": "error",
    "statusCode": 400
  }
}
```

In development mode, additional details are included:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": "error",
    "statusCode": 400,
    "stack": "Error stack trace",
    "details": {
      "url": "/api/users/register",
      "method": "POST",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Usage Examples

### In Controllers

```javascript
import { ValidationError, NotFoundError, asyncHandler } from "../middleware/errorHandler.js";

// Wrap controller functions with asyncHandler
async function createUser(req, res) {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    throw new ValidationError("Name, email, and password are required");
  }
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError("Email already exists");
  }
  
  // ... rest of the logic
  res.json({ success: true, message: "User created", user });
}

// Export with asyncHandler wrapper
export { asyncHandler(createUser) };
```

### In Middleware

```javascript
import { AuthenticationError } from "./errorHandler.js";

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new AuthenticationError("No token provided");
    }
    
    // ... token validation logic
    next();
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};
```

## Automatic Error Handling

### Mongoose Errors
- **ValidationError**: Automatically converted to ValidationError
- **CastError**: Automatically converted to ValidationError
- **Duplicate Key Error (11000)**: Automatically converted to ConflictError

### JWT Errors
- **JsonWebTokenError**: Automatically converted to AuthenticationError
- **TokenExpiredError**: Automatically converted to AuthenticationError

### Multer Errors
- **LIMIT_FILE_SIZE**: Automatically converted to ValidationError
- **LIMIT_FILE_COUNT**: Automatically converted to ValidationError
- **LIMIT_UNEXPECTED_FILE**: Automatically converted to ValidationError

## Global Error Handlers

### Unhandled Rejections
```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

### Uncaught Exceptions
```javascript
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

## Error Logging

All errors are automatically logged with:
- Error message and stack trace
- Request URL and method
- User IP address
- User agent
- Timestamp

## Testing Error Handling

Use the provided test script to verify error handling:

```bash
node test_error_handling.js
```

The test script checks:
- 404 errors for non-existent routes
- 400 errors for validation failures
- 401 errors for authentication failures
- Proper error message formatting

## Best Practices

1. **Use specific error classes** instead of generic AppError when possible
2. **Wrap async controller functions** with asyncHandler
3. **Pass errors to next()** in middleware instead of manually sending responses
4. **Provide meaningful error messages** that help users understand what went wrong
5. **Log errors appropriately** - the system handles this automatically
6. **Test error scenarios** to ensure proper error handling

## File Structure

```
src/
├── middleware/
│   ├── errorHandler.js          # Main error handling system
│   └── authMiddleware.js         # Updated to use new error handling
├── controllers/
│   ├── documentController.js    # Updated with proper error handling
│   ├── authController.js        # Updated with proper error handling
│   └── userController.js        # Updated with proper error handling
└── routes/
    └── documentRoutes.js         # Updated middleware error handling
```

## Environment Variables

- `NODE_ENV`: Set to "development" to include stack traces and additional details in error responses
