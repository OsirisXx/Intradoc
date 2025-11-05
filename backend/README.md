# IntraDoc Backend API

This is the backend API server for the IntraDoc application.

## Prerequisites

- Node.js (v18 or higher)
- MySQL/MariaDB database server
- npm or yarn package manager

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Configuration

You need to create a `.env` file in this directory with the following configuration:

```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=intradoc
DB_PORT=3306
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_intradoc_2024
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
```

**Note:** If you have the `.env copy` file in this directory, you can copy it:
```bash
cp ".env copy" .env
```

Then edit the `.env` file to update your database credentials.

### 3. Create the Database

Make sure you have MySQL/MariaDB installed and running. Then create the database:

```sql
CREATE DATABASE intradoc;
```

Import the database schema from your database administrator or use the provided schema documentation.

### 4. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

### 5. Verify Setup

The server will automatically test the database connection on startup. You should see:
```
✅ Database connected successfully
📊 Connected to database: intradoc
🚀 Server running on http://localhost:3001
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/health` - Health check

For full API documentation, see the controllers in the `src/controllers/` directory.

## Troubleshooting

### Database Connection Failed

- Verify MySQL/MariaDB is running
- Check database credentials in `.env`
- Ensure the `intradoc` database exists
- Check if the port (3306) is correct

### Port Already in Use

The server will automatically detect if port 3001 is in use and try an alternative port. Check the console output for the actual port being used.

### User Registration Fails

- Ensure the backend server is running
- Check that all required database tables exist
- Verify the section mapping in `src/controllers/auth.controller.js`

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js        # Database connection configuration
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Express middleware (auth, etc.)
│   ├── routes/                # API route definitions
│   ├── services/              # Business logic services
│   ├── utils/                 # Utility functions
│   └── server.js              # Main server file
├── uploads/                   # Uploaded files directory
├── .env                       # Environment configuration (create this)
└── package.json               # Dependencies








