## api.md (API Specification)

### Auth APIs

* POST /auth/register
* POST /auth/login
* POST /auth/verify
* etc GET or POST as needed

### Chat APIs

* GET /chats
* POST /chats/create

### Message APIs

* POST /messages/send
* GET /messages/{chatId}

### WebSocket Events

* message:new
* message:delivered
* message:read
* user:online
* user:offline
* user:dnd
* user:away