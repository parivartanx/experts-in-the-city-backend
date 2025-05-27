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
- File uploads with AWS S3
- Firebase integration

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Firebase Admin SDK
- AWS S3

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Firebase project
- AWS

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

# Expert In The City API Documentation

## Base URL
```
PRODUCTION URL || http://localhost:8080/api 
```

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## API Endpoints

### Authentication Routes

#### Register User
- **Method**: POST
- **URL**: `/auth/register`
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "USER" // or "EXPERT"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### Login
- **Method**: POST
- **URL**: `/auth/login`
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### Google Sign In
- **Method**: POST
- **URL**: `/auth/google`
- **Body**:
```json
{
  "idToken": "google_oauth_token"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "avatar": "avatar_url"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### Refresh Token
- **Method**: POST
- **URL**: `/auth/refresh-token`
- **Body**:
```json
{
  "refreshToken": "refresh_token"
}
```
- **Response**:
```json
{
  "status": "success",
  "message": "Tokens refreshed successfully",
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

### Admin Routes

#### Get Dashboard Statistics
- **Method**: GET
- **URL**: `/admin/dashboard-stats`
- **Auth Required**: Yes (Admin only)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "totalStats": {
      "totalUsers": 100,
      "totalPosts": 500,
      "totalComments": 1000,
      "totalExperts": 20,
      "totalLikes": 2000,
      "totalFollows": 300
    },
    "recentActivity": {
      "newUsers": 10,
      "newPosts": 50,
      "newComments": 100,
      "newFollows": 30
    }
  }
}
```

#### Get All Users
- **Method**: GET
- **URL**: `/admin/users`
- **Auth Required**: Yes (Admin only)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search in name and email
  - `role`: Filter by user role
  - `sortBy`: Sort field (default: "createdAt")
  - `sortOrder`: Sort order ("asc" or "desc")
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
- **Response**:
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "User Name",
        "bio": "User bio",
        "avatar": "avatar_url",
        "role": "USER",
        "isAdmin": false,
        "expertDetails": {
          "expertise": ["Skill 1", "Skill 2"],
          "experience": 5,
          "hourlyRate": 50.00,
          "about": "Expert description"
        },
        "stats": {
          "posts": 10,
          "followers": 50,
          "following": 30,
          "likes": 100,
          "comments": 25
        },
        "createdAt": "2024-03-21T10:00:00Z",
        "updatedAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "pages": 10
    }
  }
}
```

#### Get User by ID
- **Method**: GET
- **URL**: `/admin/users/:id`
- **Auth Required**: Yes (Admin only)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "bio": "User bio",
      "avatar": "avatar_url",
      "role": "USER",
      "Admin": null,
      "expertDetails": {
        "expertise": ["Skill 1", "Skill 2"],
        "experience": 5,
        "hourlyRate": 50.00,
        "about": "Expert description"
      },
      "posts": [
        {
          "id": "post_uuid",
          "title": "Post Title",
          "content": "Post content",
          "_count": {
            "likes": 10,
            "comments": 5
          }
        }
      ],
      "followers": [
        {
          "follower": {
            "id": "follower_uuid",
            "name": "Follower Name",
            "avatar": "avatar_url"
          }
        }
      ],
      "following": [
        {
          "following": {
            "id": "following_uuid",
            "name": "Following Name",
            "avatar": "avatar_url"
          }
        }
      ],
      "_count": {
        "posts": 10,
        "followers": 50,
        "following": 30,
        "likes": 100,
        "comments": 25
      }
    }
  }
}
```

#### Update User
- **Method**: PATCH
- **URL**: `/admin/users/:id`
- **Auth Required**: Yes (Admin only)
- **Body**:
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "USER",
  "bio": "Updated bio",
  "avatar": "updated_avatar_url",
  "interests": ["Technology", "Science", "Art"],
  "tags": ["Developer", "Designer", "Writer"],
  "location": {
    "pincode": "123456",
    "address": "123 Main St",
    "country": "United States",
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "updated@example.com",
      "name": "Updated Name",
      "bio": "Updated bio",
      "avatar": "updated_avatar_url",
      "role": "USER",
      "interests": ["Technology", "Science", "Art"],
      "tags": ["Developer", "Designer", "Writer"],
      "location": {
        "pincode": "123456",
        "address": "123 Main St",
        "country": "United States",
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "Admin": null,
      "expertDetails": {
        "expertise": ["Skill 1", "Skill 2"],
        "experience": 5,
        "hourlyRate": 50.00,
        "about": "Expert description"
      }
    }
  }
}
```

#### Delete User
- **Method**: DELETE
- **URL**: `/admin/users/:id`
- **Auth Required**: Yes (Admin only)
- **Response**:
```json
{
  "status": "success",
  "message": "User and all related data deleted successfully"
}
```

#### Get All Posts
- **Method**: GET
- **URL**: `/admin/posts`
- **Auth Required**: Yes (Admin only)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search in title and content
  - `authorId`: Filter by author
  - `sortBy`: Sort field (default: "createdAt")
  - `sortOrder`: Sort order ("asc" or "desc")
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
- **Response**:
```json
{
  "status": "success",
  "data": {
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content",
        "image": "image_url",
        "author": {
          "id": "author_uuid",
          "name": "Author Name",
          "avatar": "avatar_url",
          "role": "USER"
        },
        "_count": {
          "likes": 10,
          "comments": 5
        }
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "pages": 10
    }
  }
}
```

#### Get Post by ID
- **Method**: GET
- **URL**: `/admin/posts/:id`
- **Auth Required**: Yes (Admin only)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "uuid",
      "title": "Post Title",
      "content": "Post content",
      "image": "image_url",
      "author": {
        "id": "author_uuid",
        "name": "Author Name",
        "avatar": "avatar_url",
        "role": "USER",
        "email": "author@example.com"
      },
      "comments": [
        {
          "id": "comment_uuid",
          "content": "Comment content",
          "author": {
            "id": "commenter_uuid",
            "name": "Commenter Name",
            "avatar": "avatar_url"
          }
        }
      ],
      "likes": [
        {
          "id": "like_uuid",
          "user": {
            "id": "liker_uuid",
            "name": "Liker Name",
            "avatar": "avatar_url"
          }
        }
      ],
      "tags": [
        {
          "id": "tag_uuid",
          "name": "Tag Name"
        }
      ],
      "_count": {
        "likes": 10,
        "comments": 5
      }
    }
  }
}
```

#### Update Post
- **Method**: PATCH
- **URL**: `/admin/posts/:id`
- **Auth Required**: Yes (Admin only)
- **Body**:
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "imageKey": "new_image_key",
  "tags": ["Tag 1", "Tag 2"]
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "uuid",
      "title": "Updated Title",
      "content": "Updated content",
      "image": "new_image_url",
      "author": {
        "id": "author_uuid",
        "name": "Author Name",
        "avatar": "avatar_url",
        "role": "USER"
      },
      "tags": [
        {
          "id": "tag_uuid",
          "name": "Tag 1"
        },
        {
          "id": "tag_uuid",
          "name": "Tag 2"
        }
      ],
      "_count": {
        "likes": 10,
        "comments": 5
      }
    }
  }
}
```

#### Delete Post
- **Method**: DELETE
- **URL**: `/admin/posts/:id`
- **Auth Required**: Yes (Admin only)
- **Response**:
```json
{
  "status": "success",
  "message": "Post and all related data deleted successfully"
}
```

### User Routes

#### Get All Users
- **Method**: GET
- **URL**: `/users`
- **Response**:
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "User Name",
        "email": "user@example.com",
        "avatar": "avatar_url",
        "bio": "User bio",
        "role": "USER",
        "createdAt": "2024-03-21T10:00:00Z"
      }
    ]
  }
}
```

#### Get User by ID
- **Method**: GET
- **URL**: `/users/:id`
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "avatar": "avatar_url",
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Get Current User Profile
- **Method**: GET
- **URL**: `/users/profile`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER",
      "bio": "User bio",
      "avatar": "avatar_url",
      "interests": ["Technology", "Science", "Art"],
      "tags": ["Developer", "Designer", "Writer"],
      "location": {
        "pincode": "123456",
        "address": "123 Main St",
        "country": "United States",
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "expertDetails": {
        "expertise": ["Skill 1", "Skill 2"],
        "experience": 5,
        "hourlyRate": 50.00,
        "about": "Expert description"
      },
      "createdAt": "2024-03-21T10:00:00Z",
      "updatedAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Update Profile
- **Method**: PATCH
- **URL**: `/users/profile`
- **Auth Required**: Yes
- **Body**:
```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "avatar": "new_avatar_url",
  "interests": ["Technology", "Science", "Art"],
  "tags": ["Developer", "Designer", "Writer"],
  "location": {
    "pincode": "123456",
    "address": "123 Main St",
    "country": "United States",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  // Expert-specific fields (only for users with EXPERT role)
  "expertise": ["New Skill 1", "New Skill 2"],
  "experience": 6,
  "hourlyRate": 60.00,
  "about": "Updated description"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Updated Name",
      "bio": "Updated bio",
      "avatar": "new_avatar_url",
      "role": "USER",
      "interests": ["Technology", "Science", "Art"],
      "tags": ["Developer", "Designer", "Writer"],
      "location": {
        "pincode": "123456",
        "address": "123 Main St",
        "country": "United States",
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "expertDetails": {
        "expertise": ["New Skill 1", "New Skill 2"],
        "experience": 6,
        "hourlyRate": 60.00,
        "about": "Updated description"
      },
      "createdAt": "2024-03-21T10:00:00Z",
      "updatedAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Change Password
- **Method**: PATCH
- **URL**: `/users/change-password`
- **Auth Required**: Yes
- **Body**:
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```
- **Response**:
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

#### Delete Account
- **Method**: DELETE
- **URL**: `/users/profile`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "message": "Account deleted successfully"
}
```

### Expert Routes

#### Create/Update Expert Profile
- **Method**: POST
- **URL**: `/experts/profile`
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "headline": "Professional Headline",
    "summary": "Professional Summary",
    "expertise": ["Skill 1", "Skill 2"],
    "experience": 5,
    "hourlyRate": 50,
    "about": "About section",
    "availability": "Mon-Fri, 9-5",
    "languages": ["English", "Spanish"],
    "sectionOperation": "update", // 'add', 'update', or 'delete'
    "certifications": [
      {
        "name": "Certification Name",
        "issuingOrganization": "Organization",
        "issueDate": "2023-01-01",
        "expiryDate": "2024-01-01",
        "credentialId": "ID123",
        "credentialUrl": "https://example.com/cert"
      }
    ],
    "experiences": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "Location",
        "startDate": "2020-01-01",
        "endDate": "2023-01-01",
        "isCurrent": false,
        "description": "Job Description",
        "skills": ["Skill 1", "Skill 2"]
      }
    ],
    "awards": [
      {
        "title": "Award Title",
        "issuer": "Issuing Organization",
        "date": "2023-01-01",
        "description": "Award Description"
      }
    ],
    "education": [
      {
        "school": "School Name",
        "degree": "Degree Name",
        "fieldOfStudy": "Field of Study",
        "startDate": "2015-01-01",
        "endDate": "2019-01-01",
        "isCurrent": false,
        "description": "Education Description",
        "grade": "A",
        "activities": ["Activity 1", "Activity 2"]
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "expert": {
        "id": "expert_id",
        "headline": "Professional Headline",
        "summary": "Professional Summary",
        "expertise": ["Skill 1", "Skill 2"],
        "experience": 5,
        "hourlyRate": 50,
        "about": "About section",
        "availability": "Mon-Fri, 9-5",
        "languages": ["English", "Spanish"],
        "certifications": [...],
        "experiences": [...],
        "awards": [...],
        "education": [...],
        "user": {
          "role": "EXPERT"
        }
      }
    }
  }
  ```

#### Get Expert Profile
- **Method**: GET
- **URL**: `/experts/:id`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "expert": {
        "id": "expert_id",
        "headline": "Professional Headline",
        "summary": "Professional Summary",
        "expertise": ["Skill 1", "Skill 2"],
        "experience": 5,
        "hourlyRate": 50,
        "about": "About section",
        "availability": "Mon-Fri, 9-5",
        "languages": ["English", "Spanish"],
        "certifications": [...],
        "experiences": [...],
        "awards": [...],
        "education": [...],
        "user": {
          "id": "user_id",
          "name": "User Name",
          "email": "user@example.com",
          "avatar": "avatar_url",
          "role": "EXPERT",
          "interests": [...],
          "tags": [...],
          "location": {...}
        },
        "followersCount": 10,
        "followingCount": 5
      }
    }
  }
  ```

#### List Experts
- **Method**: GET
- **URL**: `/experts`
- **Query Parameters**:
  - `expertise`: Filter by expertise
  - `availability`: Filter by availability
  - `languages`: Filter by languages
  - `search`: Search in name, headline, summary
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "experts": [
        {
          "id": "expert_id",
          "headline": "Professional Headline",
          "summary": "Professional Summary",
          "expertise": ["Skill 1", "Skill 2"],
          "experience": 5,
          "hourlyRate": 50,
          "about": "About section",
          "availability": "Mon-Fri, 9-5",
          "languages": ["English", "Spanish"],
          "user": {
            "id": "user_id",
            "name": "User Name",
            "avatar": "avatar_url"
          }
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100,
        "pages": 10
      }
    }
  }
  ```

### Post Routes

#### Get Upload URL
- **Method**: GET
- **URL**: `/posts/upload-url`
- **Query Parameters**:
  - `contentType`: File content type (e.g., "image/jpeg")
  - `fileName`: Original file name
- **Response**:
```json
{
  "status": "success",
  "data": {
    "uploadUrl": "presigned_s3_url",
    "key": "file_key",
    "expiresIn": 3600
  }
}
```

#### Create Post
- **Method**: POST
- **URL**: `/posts`
- **Body**:
```json
{
  "title": "Post Title",
  "content": "Post content",
  "imageKey": "s3_file_key" // Optional
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "uuid",
      "title": "Post Title",
      "content": "Post content",
      "image": "image_url",
      "authorId": "uuid",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "avatar": "avatar_url"
      },
      "tags": []
    }
  }
}
```

#### Get Posts
- **Method**: GET
- **URL**: `/posts`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `tag`: Filter by tag
  - `userId`: Filter by author
  - `search`: Search in title and content
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content",
        "image": "image_url",
        "author": {
          "id": "uuid",
          "name": "Author Name",
          "avatar": "avatar_url"
        },
        "analytics": {
          "likes": 10,
          "comments": 5
        },
        "createdAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "pages": 10
    }
  }
}
```

#### Get Single Post
- **Method**: GET
- **URL**: `/posts/:id`
- **Response**:
```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "uuid",
      "title": "Post Title",
      "content": "Post content",
      "image": "image_url",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "avatar": "avatar_url"
      },
      "_count": {
        "comments": 5,
        "likes": 10
      }
    }
  }
}
```

#### Update Post
- **Method**: PATCH
- **URL**: `/posts/:id`
- **Body**:
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "imageKey": "new_s3_file_key" // Optional
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "post": {
      "id": "uuid",
      "title": "Updated Title",
      "content": "Updated content",
      "image": "new_image_url",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "avatar": "avatar_url"
      },
      "tags": []
    }
  }
}
```

#### Delete Post
- **Method**: DELETE
- **URL**: `/posts/:id`
- **Response**:
```json
{
  "status": "success",
  "message": "Post deleted successfully"
}
```

### Comment Routes

#### Create Comment
- **Method**: POST
- **URL**: `/comments/post/:postId`
- **Auth Required**: Yes
- **Body**:
```json
{
  "content": "Comment content"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "comment": {
      "id": "uuid",
      "content": "Comment content",
      "postId": "post_uuid",
      "authorId": "uuid",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "avatar": "avatar_url"
      },
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Get Post Comments
- **Method**: GET
- **URL**: `/comments/post/:postId`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "comments": [
      {
        "id": "uuid",
        "content": "Comment content",
        "postId": "post_uuid",
        "authorId": "uuid",
        "author": {
          "id": "uuid",
          "name": "Author Name",
          "avatar": "avatar_url"
        },
        "replies": [
          {
            "id": "reply_uuid",
            "content": "Reply content",
            "author": {
              "id": "uuid",
              "name": "Reply Author",
              "avatar": "avatar_url"
            },
            "createdAt": "2024-03-21T10:00:00Z"
          }
        ],
        "replyCount": 1,
        "createdAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

#### Reply to Comment
- **Method**: POST
- **URL**: `/comments/:commentId/reply`
- **Auth Required**: Yes
- **Body**:
```json
{
  "content": "Reply content"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "reply": {
      "id": "uuid",
      "content": "Reply content",
      "postId": "post_uuid",
      "authorId": "uuid",
      "parentId": "parent_comment_uuid",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "avatar": "avatar_url"
      },
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Update Comment
- **Method**: PATCH
- **URL**: `/comments/:id`
- **Auth Required**: Yes
- **Body**:
```json
{
  "content": "Updated comment content"
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "comment": {
      "id": "uuid",
      "content": "Updated comment content",
      "postId": "post_uuid",
      "authorId": "uuid",
      "author": {
        "id": "uuid",
        "name": "Author Name",
        "avatar": "avatar_url"
      },
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Delete Comment
- **Method**: DELETE
- **URL**: `/comments/:id`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "message": "Comment deleted successfully"
}
```

### Like Routes

#### Like Post
- **Method**: POST
- **URL**: `/likes/post/:postId`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "data": {
    "like": {
      "id": "uuid",
      "postId": "post_uuid",
      "userId": "uuid",
      "user": {
        "id": "uuid",
        "name": "User Name",
        "avatar": "avatar_url"
      },
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Unlike Post
- **Method**: DELETE
- **URL**: `/likes/post/:postId`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "message": "Post unliked successfully"
}
```

#### Get Post Likes
- **Method**: GET
- **URL**: `/likes/post/:postId`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "likes": [
      {
        "id": "uuid",
        "postId": "post_uuid",
        "userId": "uuid",
        "user": {
          "id": "uuid",
          "name": "User Name",
          "avatar": "avatar_url"
        },
        "createdAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

#### Get User Likes
- **Method**: GET
- **URL**: `/likes/user`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "likes": [
      {
        "id": "uuid",
        "postId": "post_uuid",
        "userId": "uuid",
        "post": {
          "id": "post_uuid",
          "title": "Post Title",
          "content": "Post content",
          "image": "image_url",
          "author": {
            "id": "uuid",
            "name": "Author Name",
            "avatar": "avatar_url"
          },
          "tags": ["tag1", "tag2"],
          "analytics": {
            "comments": 5,
            "likes": 10
          }
        },
        "createdAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

### Follow Routes

#### Follow Expert
- **Method**: POST
- **URL**: `/follows/:id`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "data": {
    "follow": {
      "id": "uuid",
      "followerId": "uuid",
      "followingId": "uuid",
      "following": {
        "id": "uuid",
        "name": "Expert Name",
        "avatar": "avatar_url"
      },
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Unfollow Expert
- **Method**: DELETE
- **URL**: `/follows/:id`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "message": "Successfully unfollowed expert"
}
```

#### Get Followers
- **Method**: GET
- **URL**: `/follows/followers`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "followers": [
      {
        "id": "uuid",
        "name": "Follower Name",
        "avatar": "avatar_url",
        "followedAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

#### Get Following
- **Method**: GET
- **URL**: `/follows/following`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "following": [
      {
        "id": "uuid",
        "name": "Following Name",
        "avatar": "avatar_url",
        "followedAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

### Notification Routes

#### Get Notifications
- **Method**: GET
- **URL**: `/notifications`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., "createdAt")
  - `order`: Sort order ("asc" or "desc")
- **Response**:
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "FOLLOW",
        "content": "User started following you",
        "isRead": false,
        "recipientId": "uuid",
        "senderId": "uuid",
        "sender": {
          "id": "uuid",
          "name": "Sender Name",
          "avatar": "avatar_url"
        },
        "post": {
          "id": "post_uuid",
          "title": "Post Title",
          "content": "Post content"
        },
        "createdAt": "2024-03-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

#### Mark Notification as Read
- **Method**: PATCH
- **URL**: `/notifications/:id/read`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "data": {
    "notification": {
      "id": "uuid",
      "type": "FOLLOW",
      "content": "User started following you",
      "isRead": true,
      "recipientId": "uuid",
      "senderId": "uuid",
      "createdAt": "2024-03-21T10:00:00Z"
    }
  }
}
```

#### Mark All Notifications as Read
- **Method**: PATCH
- **URL**: `/notifications/read-all`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "message": "All notifications marked as read"
}
```

#### Delete Notification
- **Method**: DELETE
- **URL**: `/notifications/:id`
- **Auth Required**: Yes
- **Response**:
```json
{
  "status": "success",
  "message": "Notification deleted successfully"
}
```

### File Upload Routes

#### Get Presigned URL(s)
- **Method**: POST
- **URL**: `/upload/presigned-url`
- **Auth Required**: Yes

**Option 1: Single File Upload**
- **Query Parameters**:
  - `fileName`: Original file name (required)
  - `contentType`: File content type (required)
- **Response**:
```json
{
  "status": "success",
  "data": {
    "uploadUrl": "presigned_s3_url",
    "key": "file_key",
    "expiresIn": 3600,
    "maxSize": 5242880 // 5MB for images
  }
}
```

**Option 2: Bulk File Upload**
- **Request Body**:
```json
{
  "files": [
    {
      "fileName": "document.pdf",
      "contentType": "application/pdf"
    },
    {
      "fileName": "image.jpg",
      "contentType": "image/jpeg"
    }
  ]
}
```
- **Response**:
```json
{
  "status": "success",
  "data": {
    "uploadUrls": [
      {
        "fileName": "document.pdf",
        "contentType": "application/pdf",
        "uploadUrl": "presigned_s3_url_1",
        "key": "file_key_1",
        "maxSize": 10485760 // 10MB for documents
      },
      {
        "fileName": "image.jpg",
        "contentType": "image/jpeg",
        "uploadUrl": "presigned_s3_url_2",
        "key": "file_key_2",
        "maxSize": 5242880 // 5MB for images
      }
    ],
    "expiresIn": 3600
  }
}
```

#### Supported File Types and Size Limits

1. **Images** (5MB max)
   - JPEG (`image/jpeg`)
   - PNG (`image/png`)
   - GIF (`image/gif`)
   - WebP (`image/webp`)

2. **Documents** (10MB max)
   - PDF (`application/pdf`)
   - Word Documents
     - DOC (`application/msword`)
     - DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
   - Excel Files
     - XLS (`application/vnd.ms-excel`)
     - XLSX (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

3. **Videos** (50MB max)
   - MP4 (`video/mp4`)
   - QuickTime (`video/quicktime`)
   - AVI (`video/x-msvideo`)

#### File Upload Process

1. Get presigned URL(s):
   ```javascript
   // Single file upload
   POST /api/upload/presigned-url?fileName=document.pdf&contentType=application/pdf

   // Bulk file upload
   POST /api/upload/presigned-url
   {
     "files": [
       { "fileName": "doc1.pdf", "contentType": "application/pdf" },
       { "fileName": "doc2.pdf", "contentType": "application/pdf" }
     ]
   }
   ```

2. Upload file(s) to S3:
   ```javascript
   // Example using fetch
   const response = await fetch(presignedUrl, {
     method: 'PUT',
     body: file,
     headers: {
       'Content-Type': contentType
     }
   });
   ```

3. Use the returned `key` to store the file reference in your application

**Notes**: 
- Presigned URLs expire after 1 hour
- Maximum 10 files can be processed in bulk upload
- Files are organized in type-specific folders in S3 (images/, documents/, videos/)
- Each file type has its own size limit
- Files are stored in user-specific subfolders