# 🚗 RescueRide Backend

Node.js + Express + MongoDB backend for the RescueRide roadside assistance app.

## Project Structure

```
rescueride-backend/
├── server.js                    # Entry point
├── .env.example                 # Copy to .env and fill in values
├── src/
│   ├── config/
│   │   ├── db.js                # MongoDB connection
│   │   └── socket.js            # Socket.io setup
│   ├── models/
│   │   ├── User.js              # Customer & Rescuer (role-based)
│   │   ├── ServiceRequest.js    # Breakdown requests
│   │   ├── Offer.js             # Rescuer fare offers
│   │   ├── Rating.js            # Post-job ratings
│   │   └── Payment.js           # Payment records
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── service.controller.js
│   │   ├── offer.controller.js
│   │   ├── rating.controller.js
│   │   └── payment.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── service.routes.js
│   │   ├── offer.routes.js
│   │   ├── rating.routes.js
│   │   └── payment.routes.js
│   └── middleware/
│       └── auth.middleware.js   # JWT + role guard
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
```

### 3. Run MongoDB locally
```bash
# Make sure MongoDB is running on localhost:27017
mongod
```

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## API Endpoints

### Auth
| Method | Endpoint              | Description                        | Auth |
|--------|-----------------------|------------------------------------|------|
| POST   | /api/auth/send-otp    | Send OTP to phone                  | No   |
| POST   | /api/auth/verify-otp  | Verify OTP → get JWT + isNewUser   | No   |
| POST   | /api/auth/register    | Complete profile (name, email)     | JWT  |
| GET    | /api/auth/me          | Get my profile                     | JWT  |

### Users
| Method | Endpoint                  | Description                     | Role     |
|--------|---------------------------|---------------------------------|----------|
| PUT    | /api/users/profile        | Update profile                  | Any      |
| PUT    | /api/users/rescuer-setup  | Submit rescuer docs & services  | Rescuer  |
| PATCH  | /api/users/location       | Update GPS location             | Any      |
| PATCH  | /api/users/toggle-online  | Go online/offline               | Rescuer  |
| GET    | /api/users/earnings       | Get earnings summary            | Rescuer  |

### Services
| Method | Endpoint                      | Description                    | Role     |
|--------|-------------------------------|--------------------------------|----------|
| POST   | /api/services/request         | Create breakdown request       | Customer |
| GET    | /api/services/my-requests     | Get request history            | Customer |
| GET    | /api/services/active          | Get current active request     | Customer |
| PATCH  | /api/services/:id/cancel      | Cancel request                 | Customer |
| PATCH  | /api/services/:id/complete    | Mark job complete              | Rescuer  |
| GET    | /api/services/nearby-rescuers | Find rescuers near location    | Customer |

### Offers
| Method | Endpoint                  | Description                    | Role     |
|--------|---------------------------|--------------------------------|----------|
| POST   | /api/offers               | Rescuer sends fare offer       | Rescuer  |
| GET    | /api/offers/:requestId    | Get all offers for a request   | Customer |
| PATCH  | /api/offers/:id/accept    | Customer accepts an offer      | Customer |

### Payments
| Method | Endpoint                       | Description                | Role     |
|--------|--------------------------------|----------------------------|----------|
| POST   | /api/payments/create-intent    | Create Stripe payment      | Customer |
| POST   | /api/payments/cash             | Record cash payment        | Rescuer  |

### Ratings
| Method | Endpoint      | Description            | Role     |
|--------|---------------|------------------------|----------|
| POST   | /api/ratings  | Submit rating 1-5 ⭐   | Customer |

---

## Socket.io Events

### Client → Server
| Event                    | Payload                                        | Description                  |
|--------------------------|------------------------------------------------|------------------------------|
| `register`               | `{ userId }`                                   | Register socket after login  |
| `join:request`           | `{ requestId }`                                | Join a request room          |
| `rescuer:location-update`| `{ rescuerId, requestId, lat, lng }`           | Rescuer live location        |
| `customer:location-update`| `{ customerId, requestId, lat, lng }`         | Customer live location       |
| `rescuer:toggle-online`  | `{ rescuerId, isOnline }`                      | Online/offline toggle        |

### Server → Client
| Event              | Payload                                         | Description                     |
|--------------------|-------------------------------------------------|---------------------------------|
| `new:request`      | `{ requestId, problemType, offeredFare, ... }`  | Sent to nearby rescuers         |
| `new:offer`        | `{ offerId, rescuer, counterFare, ... }`        | Sent to customer                |
| `offer:accepted`   | `{ requestId, customerLocation, finalFare }`    | Sent to accepted rescuer        |
| `offer:rejected`   | `{ requestId }`                                 | Sent to other rescuers          |
| `rescuer:location` | `{ lat, lng }`                                  | Broadcast to customer tracking  |
| `request:completed`| `{ requestId, rescuerId }`                      | Triggers rating screen          |
| `request:cancelled`| `{ requestId }`                                 | Notify rescuer of cancellation  |

---

## Flutter Integration — How to Connect

In your Flutter app, add these to your services:

```dart
// Base URL
const String baseUrl = 'http://localhost:5000/api';  
// Use your machine's IP on real device: 'http://192.168.x.x:5000/api'

// Auth flow:
// 1. POST /api/auth/send-otp  → { phone, role }
// 2. POST /api/auth/verify-otp → { phone, otp } → get token + isNewUser
// 3. If isNewUser: POST /api/auth/register → { name, email }
// 4. Store JWT token in SharedPreferences
// 5. Add to all requests: Authorization: Bearer <token>
```

---

## Development Notes

- **OTP**: In development, OTP is logged to console AND returned in the response. Remove this before production.
- **Twilio**: Uncomment the Twilio block in `auth.controller.js` when ready.
- **Cloudinary**: Add Cloudinary upload middleware to `/api/users/rescuer-setup` for real document uploads.
- **Stripe**: Works with test keys. Set real keys in production.
