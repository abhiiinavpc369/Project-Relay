## architecture.md (System Architecture)

### High‑Level Architecture

Client ↔ Secure API ↔ Messaging Server ↔ Database

### Components

* Client App

  * UI
  * Encryption layer
  * Local storage

* Backend

  * Auth service
  * Message relay
  * Presence service

* Database

  * Users
  * Chats
  * Message metadata (not content)

### Security Model

* Messages encrypted on device
* Server never sees plaintext
* Forward secrecy