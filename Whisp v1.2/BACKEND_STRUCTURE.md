# Backend Folder Structure Proposal

The following structure is proposed for the GUPTCHAR Node.js backend to ensure scalability, security, and separation of concerns.

```
backend/
├── src/
│   ├── config/          # Configuration (DB connection, environment variables)
│   ├── controllers/     # Request handlers (logic for routes)
│   ├── middleware/      # Middleware (Authentication, Error handling, Validation)
│   ├── models/          # Database models (User, Chat, Message)
│   ├── routes/          # API route definitions
│   ├── services/        # Complex business logic (WebSocket service, Auth service)
│   ├── utils/           # Utility functions (Logger, detailed validators)
│   ├── app.js           # Express application setup
│   └── server.js        # Server entry point (starts HTTP and WebSocket servers)
├── .env                 # Environment variables (Port, Mongo URI, JWT Secret)
├── .gitignore           # Git ignore file
├── package.json         # Project dependencies and scripts
└── README.md            # Backend specific documentation
```

## Key Decisions
- **Controllers vs Services**: Controllers handle HTTP requests, Services handle the actual business logic (including Socket.io events).
- **Socket.io**: Will be integrated in `server.js` but logic separated into `services/socketService.js`.
- **Security**: 
    - `middleware/auth.js` for JWT verification.
    - `helmet` and `cors` for basic security headers.
