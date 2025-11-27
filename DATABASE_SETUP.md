# Hướng dẫn Setup Database

## 1. Cài đặt PostgreSQL

Tải và cài đặt PostgreSQL từ: https://www.postgresql.org/download/

## 2. Tạo Database và User

### Cách 1: Sử dụng SQL Script
Mở PostgreSQL command line (psql) với user postgres:
```bash
psql -U postgres
```

Sau đó chạy file SQL script:
```sql
\i database-setup.sql
```

### Cách 2: Chạy từng lệnh
Mở PostgreSQL command line (psql) hoặc pgAdmin và chạy các lệnh sau:

```sql
-- Tạo user với quyền LOGIN
CREATE USER tasks_user WITH 
  LOGIN 
  PASSWORD '123456'
  CREATEDB;

-- Tạo database
CREATE DATABASE tasks
  WITH 
  OWNER = tasks_user
  ENCODING = 'UTF8';

-- Connect to database
\c tasks

-- Tạo extension uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions
GRANT ALL ON SCHEMA public TO tasks_user;
GRANT ALL PRIVILEGES ON DATABASE tasks TO tasks_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tasks_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tasks_user;
```

## 3. Cấu hình Environment Variables

File `.env` đã được tạo với cấu hình sau:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasks
DB_USER=tasks_user
DB_PASSWORD=123456
DB_SCHEMA=public
```

## 4. Chạy Backend

```bash
# Install dependencies (nếu chưa)
pnpm install

# Chạy backend - Migrations sẽ tự động chạy
pnpm run start:dev
```

Backend sẽ:
- ✅ Kết nối với database
- ✅ Tự động chạy migrations
- ✅ Tạo bảng `users` với các cột: id, email, password, firstName, lastName, avatar, mobile, isActive, role, createdAt, updatedAt
- ✅ Khởi động server tại http://localhost:3001

## 5. Test API

```bash
# Get all users
curl http://localhost:3001/api/users

# Create user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

## 6. Kiểm tra Database

Vào PostgreSQL và kiểm tra:

```sql
-- Xem các bảng đã tạo
\dt

-- Xem cấu trúc bảng users
\d users

-- Xem migrations đã chạy
SELECT * FROM migrations;
```

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra thông tin trong file `.env`
- Kiểm tra firewall không block port 5432

### Lỗi migrations
```bash
# Xem trạng thái migrations
pnpm run migration:show

# Revert migration nếu cần
pnpm run migration:revert
```
