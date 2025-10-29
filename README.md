# Aucto - Online Auction Platform Backend

A scalable backend for a multi-category online auction platform built with Node.js, Express.js, and MongoDB.

## Features

### Core Functionality
- **User Management**: Registration, authentication, and role-based access (Admin, Seller, Buyer)
- **Auction System**: Create, manage, and participate in auctions across multiple categories
- **Real-time Bidding**: WebSocket-powered live bidding with instant updates
- **Payment Integration**: Secure payments via Stripe
- **Notification System**: Real-time notifications and email alerts
- **Admin Dashboard**: Comprehensive analytics and management tools

### Categories Supported
- Clothing
- Accessories
- Vehicles
- Art
- Collectibles
- Electronics

### User Roles & Permissions

#### Admin
- Manage all auctions and users
- Approve/reject auction listings
- View analytics and reports
- Handle disputes

#### Seller
- Create and manage auction listings
- View bidding activity
- Receive payment notifications

#### Buyer
- Browse and bid on auctions
- View bidding history
- Make secure payments

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Token)
- **Real-time**: Socket.io
- **Payments**: Stripe
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auction-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/aucto
   JWT_SECRET=your_jwt_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   # ... other variables
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` (or the port specified in your `.env`).

## Real-time Features

### WebSocket Events

#### Client to Server
- `joinAuction` - Join auction room for real-time updates
- `leaveAuction` - Leave auction room

#### Server to Client
- `newBid` - New bid placed on auction
- `auctionEnding` - Auction ending soon notification
- `auctionEnded` - Auction has ended

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting
- CORS configuration
- Input validation with Joi
- Helmet for security headers
- Role-based access control

## Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/         # Mongoose models
├── routes/         # API routes
├── utils/          # Utility functions
└── server.js       # Main server file
```

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure production database URL
3. Set up proper CORS origins
4. Configure Stripe for live payments
5. Set up email service for notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support, please contact the development team or create an issue in the repository.
