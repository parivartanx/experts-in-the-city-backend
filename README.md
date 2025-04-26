# Expert In The City Backend

A Node.js/Express backend with Prisma ORM for the Expert In The City platform.

## Features

- User authentication and authorization
- Mentor profiles and management
- Post creation and management
- Comments and likes system
- Follow system
- Tag management
- Real-time notifications
- File uploads with Cloudinary
- Firebase integration

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Firebase Admin SDK
- Cloudinary
- Multer

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Firebase project
- Cloudinary account

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and update the environment variables:
   ```bash
   cp .env.example .env
   ```

4. Set up your database URL and other environment variables in `.env`

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

## Development

Start the development server:
```bash
npm run dev
```

The server will run on http://localhost:8080 by default.

## Database Management

- Generate Prisma client: `npm run prisma:generate`
- Create and apply migrations: `npm run prisma:migrate`
- View and edit data with Prisma Studio: `npm run prisma:studio`

## API Routes

### Authentication
- POST `/api/users/register` - Register new user
- POST `/api/users/login` - Login user

### Users
- GET `/api/users/me` - Get current user profile
- PATCH `/api/users/me` - Update user profile

### Mentors
- POST `/api/mentors` - Create mentor profile
- GET `/api/mentors` - Get all mentors
- GET `/api/mentors/:id` - Get specific mentor

### Posts
- POST `/api/posts` - Create post
- GET `/api/posts` - Get all posts
- GET `/api/posts/:id` - Get specific post
- PATCH `/api/posts/:id` - Update post
- DELETE `/api/posts/:id` - Delete post

### Comments
- POST `/api/comments` - Create comment
- GET `/api/comments/post/:postId` - Get post comments
- DELETE `/api/comments/:id` - Delete comment

### Likes
- POST `/api/likes/post/:postId` - Like post
- DELETE `/api/likes/post/:postId` - Unlike post

### Follows
- POST `/api/follows/:userId` - Follow user
- DELETE `/api/follows/:userId` - Unfollow user

### Tags
- POST `/api/tags` - Create tag
- GET `/api/tags` - Get all tags
- GET `/api/tags/:id/posts` - Get posts by tag

### Notifications
- GET `/api/notifications` - Get user notifications
- PATCH `/api/notifications/:id` - Mark notification as read
