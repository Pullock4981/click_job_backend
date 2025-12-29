# Click Job Backend

Backend API for Click Job - Microjob & Freelancing Platform

## Features

- ✅ JWT-based authentication
- ✅ Email verification system
- ✅ Password reset functionality
- ✅ Zod validation
- ✅ Mongoose with MongoDB
- ✅ Email unique constraint
- ✅ Password hashing with bcrypt
- ✅ Protected routes middleware
- ✅ Rate limiting for security
- ✅ Error handling
- ✅ Job posting and management
- ✅ Work assignment and tracking
- ✅ Wallet and transaction system
- ✅ Referral program (5% commission)
- ✅ Premium subscriptions
- ✅ Notifications system
- ✅ Advertisement management
- ✅ Support tickets
- ✅ Play & Earn games
- ✅ User profiles
- ✅ Recent Activity Feed
- ✅ Public Statistics API
- ✅ Rating & Review System
- ✅ Withdrawal Approval System (Admin)
- ✅ File Upload with Cloudinary
- ✅ Email Service (Nodemailer)
- ✅ Real-time Chat (Socket.io)
- ✅ Admin Management System
- ✅ Dashboard Analytics

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/click_job
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

4. Make sure MongoDB is running

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user", // optional: "user" or "employer"
    "referralCode": "ABC123" // optional
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Get current user (Protected)
- `GET /api/auth/verify-email/:token` - Verify email address (Public)
- `POST /api/auth/resend-verification` - Resend verification email (Protected)
- `POST /api/auth/forgot-password` - Request password reset (Public)
- `POST /api/auth/reset-password/:token` - Reset password (Public)

### Jobs

- `GET /api/jobs` - Get all jobs (with filters: category, status, minBudget, maxBudget, search, page, limit)
- `GET /api/jobs/:id` - Get single job
- `GET /api/jobs/my-jobs` - Get my posted jobs (Employer, Protected)
- `POST /api/jobs` - Create job (Employer, Protected)
- `PUT /api/jobs/:id` - Update job (Employer, Protected)
- `DELETE /api/jobs/:id` - Delete job (Employer, Protected)
- `POST /api/jobs/:id/apply` - Apply for job (User, Protected)
- `GET /api/jobs/:id/applicants` - Get job applicants (Employer, Protected)
- `POST /api/jobs/:id/assign/:userId` - Assign job to user (Employer, Protected)

### Works

- `GET /api/works/my-work` - Get my assigned works (Protected)
- `GET /api/works/:id` - Get single work (Protected)
- `PUT /api/works/:id/submit` - Submit work proof (Worker, Protected)
- `PUT /api/works/:id/approve` - Approve work (Employer, Protected)
- `PUT /api/works/:id/reject` - Reject work (Employer, Protected)

### Wallet

- `GET /api/wallet` - Get wallet balance (Protected)
- `POST /api/wallet/deposit` - Deposit money (Protected)
- `POST /api/wallet/withdraw` - Withdraw money (Protected)

### Transactions

- `GET /api/transactions` - Get transaction history (Protected, with filters)
- `GET /api/transactions/:id` - Get single transaction (Protected)

### Referrals

- `GET /api/referrals/my-code` - Get my referral code (Protected)
- `GET /api/referrals/my-referrals` - Get my referred users (Protected)
- `GET /api/referrals/earnings` - Get referral earnings (Protected)
- `POST /api/referrals/apply-code` - Apply referral code (Public)

### Subscriptions

- `GET /api/subscriptions/plans` - Get available plans (Public)
- `GET /api/subscriptions/my-plan` - Get my subscription (Protected)
- `POST /api/subscriptions/subscribe` - Subscribe to plan (Protected)
- `PUT /api/subscriptions/cancel` - Cancel subscription (Protected)

### Notifications

- `GET /api/notifications` - Get my notifications (Protected)
- `GET /api/notifications/unread-count` - Get unread count (Protected)
- `PUT /api/notifications/:id/read` - Mark as read (Protected)
- `PUT /api/notifications/read-all` - Mark all as read (Protected)
- `DELETE /api/notifications/:id` - Delete notification (Protected)

### Advertisements

- `GET /api/advertisements` - Get active ads (Public, with position filter)
- `GET /api/advertisements/all` - Get all ads (Admin, Protected)
- `POST /api/advertisements` - Create ad (Admin, Protected)
- `PUT /api/advertisements/:id` - Update ad (Admin, Protected)
- `DELETE /api/advertisements/:id` - Delete ad (Admin, Protected)
- `POST /api/advertisements/:id/click` - Track click (Public)

### Tickets

- `POST /api/tickets` - Create ticket (Protected)
- `GET /api/tickets/my-tickets` - Get my tickets (Protected)
- `GET /api/tickets/all` - Get all tickets (Admin, Protected)
- `GET /api/tickets/:id` - Get single ticket (Protected)
- `POST /api/tickets/:id/message` - Add message to ticket (Protected)
- `PUT /api/tickets/:id/status` - Update ticket status (Admin, Protected)

### Games (Play & Earn)

- `GET /api/games/available` - Get available games (Public)
- `POST /api/games/play` - Submit game result (Protected)
- `GET /api/games/my-scores` - Get my game scores (Protected)
- `GET /api/games/leaderboard` - Get leaderboard (Public, with period filter)

### Users

- `GET /api/users/profile` - Get my profile (Protected)
- `PUT /api/users/profile` - Update profile (Protected)
- `PUT /api/users/change-password` - Change password (Protected)
- `GET /api/users/:id/public` - Get public profile (Public)

### Activity Feed

- `GET /api/activity/recent` - Get recent activity feed (Public, with limit query param)

### Statistics

- `GET /api/stats/public` - Get public statistics (Public)

### Reviews

- `GET /api/reviews/user/:userId` - Get reviews for a user (Public)
- `POST /api/reviews` - Create review (Protected)
- `PUT /api/reviews/:id` - Update review (Protected)
- `DELETE /api/reviews/:id` - Delete review (Protected)

### File Upload

- `POST /api/upload/single` - Upload single file (Protected, multipart/form-data)
- `POST /api/upload/multiple` - Upload multiple files (Protected, multipart/form-data)

### Admin

- `GET /api/admin/users` - Get all users (Admin)
- `GET /api/admin/users/:id` - Get user details (Admin)
- `PUT /api/admin/users/:id` - Update user (Admin)
- `DELETE /api/admin/users/:id` - Delete user (Admin)
- `POST /api/admin/users/:id/warning` - Issue warning to user (Admin)
- `GET /api/admin/jobs` - Get all jobs (Admin)
- `PUT /api/admin/jobs/:id` - Update any job (Admin)
- `DELETE /api/admin/jobs/:id` - Delete any job (Admin)
- `GET /api/admin/withdrawals` - Get all withdrawal requests (Admin)
- `PUT /api/admin/withdrawals/:id/approve` - Approve withdrawal (Admin)
- `PUT /api/admin/withdrawals/:id/reject` - Reject withdrawal (Admin)
- `GET /api/admin/stats` - Get system statistics (Admin)

### Health Check

- `GET /api/health` - Server health check

## Project Structure

```
Click_Job_Backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   ├── workController.js
│   │   ├── walletController.js
│   │   ├── transactionController.js
│   │   ├── referralController.js
│   │   ├── subscriptionController.js
│   │   ├── notificationController.js
│   │   ├── advertisementController.js
│   │   ├── ticketController.js
│   │   ├── gameController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Work.js
│   │   ├── Transaction.js
│   │   ├── Referral.js
│   │   ├── Subscription.js
│   │   ├── Notification.js
│   │   ├── Advertisement.js
│   │   ├── Ticket.js
│   │   └── Game.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── jobRoutes.js
│   │   ├── workRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── referralRoutes.js
│   │   ├── subscriptionRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── advertisementRoutes.js
│   │   ├── ticketRoutes.js
│   │   ├── gameRoutes.js
│   │   └── userRoutes.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   └── sendNotification.js
│   ├── validations/
│   │   └── authValidation.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Models Overview

### User
- Authentication fields (name, email, password)
- Profile (bio, skills, profilePicture)
- Wallet (walletBalance, totalEarnings)
- Referral (referralCode, referredBy)
- Stats (rating, completedJobs, activeJobs)
- Premium status

### Job
- Job details (title, description, category, budget)
- Employer reference
- Status (open, in-progress, completed, cancelled)
- Applicants array
- Assigned worker

### Work
- Job and worker references
- Status (pending, in-progress, submitted, approved, rejected)
- Submission proof and files
- Payment status and amount
- Rating and feedback

### Transaction
- User reference
- Type (deposit, withdrawal, payment, earning, referral, refund, bonus)
- Amount and status
- Related job/work references

### Referral
- Referrer and referred user references
- Earnings tracking (deposit, task, total)
- Status

### Subscription
- User reference
- Plan (basic, premium, pro)
- Status and dates
- Features array

### Notification
- User reference
- Type and content
- Read status
- Related job/work references

### Advertisement
- Content (title, description, image, link)
- Position (sidebar, banner, popup, inline)
- Status and dates
- Click/impression tracking

### Ticket
- User reference
- Subject, description, category
- Status and priority
- Messages array

### Game
- User reference
- Game type and score
- Earnings
- Level and duration

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (jsonwebtoken)
- bcryptjs
- Zod
- dotenv
- cors
- Socket.io (Real-time communication)
- Cloudinary (File/Image upload)
- Multer (File upload handling)
- Nodemailer (Email service)
- express-rate-limit (Rate limiting)

## Features Details

### Referral System
- 5% commission on referred user's deposits
- 5% commission on referred user's completed tasks
- Automatic earnings distribution

### Subscription Plans
- **Basic**: Free, limited features
- **Premium**: $9.99/month, advanced features
- **Pro**: $19.99/month, all features + API access

### Payment Flow
1. Employer posts job with budget
2. User applies for job
3. Employer assigns job to user
4. User submits work
5. Employer approves work
6. Payment automatically added to worker's wallet
7. Referral earnings processed automatically

## Notes

- All protected routes require `Authorization: Bearer <token>` header
- Admin routes require user role to be 'admin'
- Employer routes require user role to be 'employer' or 'admin'
- Pagination is available on most list endpoints (page, limit query params)
- Filtering and sorting available on relevant endpoints
