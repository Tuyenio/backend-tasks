# Tasks App Backend - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Table of Contents
1. [Authentication](#authentication-endpoints)
2. [Users](#users-endpoints)
3. [Roles](#roles-endpoints)
4. [Projects](#projects-endpoints)
5. [Tags](#tags-endpoints)
6. [Tasks](#tasks-endpoints)
7. [Notes](#notes-endpoints)
8. [Chat](#chat-endpoints)
9. [Notifications](#notifications-endpoints)
10. [Admin](#admin-endpoints)
11. [Search](#search-endpoints)
12. [Reports](#reports-endpoints)
13. [Upload](#upload-endpoints)
14. [Settings](#settings-endpoints)
15. [Email](#email-endpoints)

---

## Authentication Endpoints

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "NewPassword123!"
}
```

---

## Users Endpoints

### Get All Users
```http
GET /api/users?page=1&limit=10&search=john
Authorization: Bearer <token>
```

### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

### Create User
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "Password123!",
  "name": "New User"
}
```

### Update User
```http
PATCH /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name"
}
```

### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

---

## Projects Endpoints

### Get All Projects
```http
GET /api/projects?status=active&search=project
Authorization: Bearer <token>
```

### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "color": "#3b82f6",
  "status": "active"
}
```

### Add Project Member
```http
POST /api/projects/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "role": "member"
}
```

---

## Tasks Endpoints

### Get All Tasks
```http
GET /api/tasks?status=todo&priority=high&projectId=uuid
Authorization: Bearer <token>
```

### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "status": "todo",
  "priority": "high",
  "projectId": "project-uuid",
  "dueDate": "2025-12-31"
}
```

### Add Task Assignee
```http
POST /api/tasks/:id/assignees
Authorization: Bearer <token>
Content-Type: application/json

{
  "assigneeId": "user-uuid"
}
```

### Add Comment
```http
POST /api/tasks/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "This is a comment"
}
```

---

## Search Endpoints

### Global Search
```http
GET /api/search?query=project&type=all&limit=20
Authorization: Bearer <token>
```

### Search Suggestions
```http
GET /api/search/suggestions?query=task&type=tasks&limit=5
Authorization: Bearer <token>
```

---

## Reports Endpoints

### Generate Report
```http
POST /api/reports/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "tasks",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "format": "csv"
}
```

### Get Chart Data
```http
GET /api/reports/charts?type=task_status
Authorization: Bearer <token>
```

### Get Statistics
```http
GET /api/reports/statistics
Authorization: Bearer <token>
```

---

## Upload Endpoints

### Upload Avatar
```http
POST /api/upload/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
```

### Upload File
```http
POST /api/upload/file?entityType=task&entityId=uuid
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

### Get Storage Stats
```http
GET /api/upload/storage/stats
Authorization: Bearer <token>
```

---

## Settings Endpoints

### Get User Settings
```http
GET /api/settings/user
Authorization: Bearer <token>
```

### Update User Settings
```http
PATCH /api/settings/user
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "en",
  "timezone": "UTC",
  "emailNotifications": true
}
```

### Create Theme
```http
POST /api/settings/themes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Theme",
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "background": "#ffffff",
    "text": "#000000"
  }
}
```

---

## Response Format

### Success Response
```json
{
  "id": "uuid",
  "name": "Resource Name",
  "createdAt": "2025-11-27T18:00:00Z"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### Paginated Response
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting
- 100 requests per 15 minutes per IP
- 1000 requests per hour for authenticated users

## WebSocket Endpoints
- `/chat` - Real-time chat messaging
- `/notifications` - Real-time notifications

## Pagination
Default: `page=1&limit=10`
Max limit: `100`
