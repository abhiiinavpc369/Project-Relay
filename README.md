# Project Relay

A private, real-time chat application for friends only with hardcoded users, MongoDB storage, and responsive UI.

## Features

- Hardcoded authentication for 3 users (AbhinavJi, ShuklaJi, UnknownMake) with password 1234
- Real-time messaging using Socket.io
- One-to-one chat between users
- File and image sharing
- Profile management (bio, status, picture)
- Responsive design for desktop, tablet, mobile
- MongoDB persistence

## Tech Stack

- Backend: Node.js, Express, Socket.io, MongoDB (Mongoose)
- Frontend: React, Axios, Socket.io client
- Authentication: JWT
- File Storage: Local (uploads folder)

## Setup Instructions

1. **Install Dependencies**

   - Ensure Node.js and npm are installed.
   - Install MongoDB and start the service.

2. **Backend Setup**

   - Navigate to `backend/` directory.
   - Update `.env` file with your MongoDB URI (default is localhost).
   - Install dependencies: `npm install`
   - Seed users: `node seedUsers.js`
   - Start server: `npm run dev` (runs on port 3001)

3. **Frontend Setup**

   - Navigate to `frontend/` directory.
   - Install dependencies: `npm install`
   - Start app: `npm start` (runs on port 3002)

4. **Usage**

   - Open http://localhost:3002 in browser.
   - Login with one of the users: abhinavji, shuklaji, or unknownmake (password: 1234).
   - Select a user from the list to start chatting.
   - Send text messages or upload files.
   - Messages are real-time.

## Project Structure

- `backend/`: Server-side code
  - `models/`: MongoDB schemas
  - `routes/`: API endpoints
  - `middleware/`: Auth middleware
  - `uploads/`: File storage
- `frontend/`: Client-side code
  - `src/components/`: React components
- `shared/`: Shared utilities (if needed)

## Environment Variables

- `PORT`: Server port (default 3001)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT tokens
- `SESSION_SECRET`: For sessions (not used)
- `FILE_UPLOAD_PATH`: Path for uploads (./uploads)

## Security Notes

- Passwords are hashed using bcrypt.
- JWT tokens for authentication.
- CORS enabled for cross-origin requests.
- Input validation on API endpoints.

## Future Enhancements

- Replace hardcoded auth with OAuth.
- Add group chats.
- Voice messages.
- Message reactions and replies.
- Message search.
- Cloud file storage.

## License

MIT
