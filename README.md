# 📚 NoteShare — Student Notes Sharing Platform

> A full-stack academic resource sharing platform that enables students to securely upload, discover, read, share, rate, and manage study notes in one place.

### 🌐 Live Application

**[Open NoteShare](https://student-notes-platform-phi.vercel.app/login)**

### 💻 GitHub Repository

**[View Source Code](https://github.com/sharonyobhattacharjee/student-notes-platform)**

---

## 🚀 Overview

**NoteShare** is a full-stack student notes management and sharing platform designed to make academic resources easier to upload, organize, discover, and access.

The application provides a complete workflow for students:

**Register → Login → Upload Notes → Browse → Search → Read → Download → Share → Rate → Manage**

The platform is built with a modern React frontend, a Node.js/Express backend, PostgreSQL database access through Prisma, JWT-based authentication, role-based authorization, and Vercel deployment.

---

## ✨ Key Features

### 👤 Authentication & User Management

- Student registration and login
- Secure password handling
- JWT-based authentication
- Protected API routes
- Persistent authentication state
- User profile management
- Session tracking
- Logout functionality

### 📚 Notes Management

- Upload academic notes
- Add note metadata such as title, subject and semester
- Browse available notes
- View individual note details
- Read notes directly through the platform
- Download notes
- Edit uploaded notes
- Delete owned notes
- Manage personal uploads through **My Notes**

### 🔎 Search & Discovery

- Browse the available academic resources
- Search notes
- Filter notes using academic metadata
- Open detailed note pages
- Access shared notes through dedicated sharing routes

### ⭐ Rating & Review System

- Users can review notes
- Rating management
- Review-related backend models and APIs
- Average-rating support for notes

### 🔗 Note Sharing

- Generate/access shareable note resources
- Dedicated shared-note page
- Share notes without exposing private application internals

### 🛡️ Admin & Security

- Dedicated admin dashboard
- Role-based authorization
- Authentication middleware
- Role middleware
- Request validation
- Error-handling middleware
- Upload validation
- Audit functionality
- Session tracking
- Protected administrative routes

### 📁 File Handling

The backend contains dedicated file-management functionality including:

- Upload middleware
- File validation
- Note storage handling
- Object-storage integration
- Protected note resources

Uploaded/generated local files and environment secrets are excluded from the Git repository.

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────────┐
                         │       Student/User      │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      React + Vite       │
                         │       Frontend          │
                         └────────────┬────────────┘
                                      │
                             HTTP / REST API
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    Node.js + Express    │
                         │        Backend          │
                         └────────────┬────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
      Authentication            Note Management          Admin / Audit
       JWT + bcrypt              Upload / Read             Controls
             │                        │                        │
             └────────────────────────┼────────────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      Prisma ORM         │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    PostgreSQL / Neon    │
                         │       Database          │
                         └─────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | User interface |
| Vite | Frontend development/build tooling |
| React Router | Client-side routing |
| JavaScript | Application logic |
| HTML | Application structure |
| CSS | Styling |
| ESLint | Code-quality tooling |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Server-side runtime |
| Express.js | REST API framework |
| Prisma | Database ORM |
| PostgreSQL | Relational database |
| JWT | Authentication |
| bcrypt | Password security |
| Multer / upload middleware | File uploads |
| Validation middleware | Request validation |
| Error middleware | Centralized error handling |

## Infrastructure / Deployment

| Technology | Purpose |
|---|---|
| Vercel | Application deployment |
| Neon PostgreSQL | PostgreSQL infrastructure |
| Git | Version control |
| GitHub | Source-code hosting |

---

# 📂 Project Structure

```text
student-notes-platform/
│
├── .agents/
│   └── skills/
│       └── neon/
│
├── .vscode/
│   ├── mcp.json
│   └── settings.json
│
├── backend/
│   │
│   ├── api/
│   │   └── [...path].js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── validationMiddleware.js
│   │
│   ├── models/
│   │   ├── auditModel.js
│   │   ├── catalogModel.js
│   │   ├── downloadModel.js
│   │   ├── noteModel.js
│   │   ├── reportModel.js
│   │   ├── reviewModel.js
│   │   ├── sessionModel.js
│   │   ├── shareModel.js
│   │   └── userModel.js
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── metaRoutes.js
│   │   └── noteRoutes.js
│   │
│   ├── src/
│   │   ├── audit.js
│   │   ├── auth.js
│   │   ├── config.js
│   │   ├── email.js
│   │   ├── fileValidation.js
│   │   ├── objectStorage.js
│   │   ├── prisma.js
│   │   ├── security.js
│   │   └── server.js
│   │
│   ├── storage/
│   │   └── notes/
│   │
│   ├── tests/
│   │   └── core.test.js
│   │
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
│
├── frontend/
│   │
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Field.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── NoteCard.jsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── auth.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── EditNote.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MyNotes.jsx
│   │   │   ├── NoteDetails.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── ReadNotes.jsx
│   │   │   ├── SharedNote.jsx
│   │   │   ├── SignUp.jsx
│   │   │   └── UploadNotes.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json
│
├── .gitignore
├── DEPLOYMENT.md
├── README.md
├── package.json
├── package-lock.json
├── neon.ts
└── skills-lock.json
```

---

# 🔐 Authentication Flow

NoteShare uses token-based authentication.

```text
User
 │
 │ Register / Login
 ▼
React Frontend
 │
 │ HTTP Request
 ▼
Express Authentication Route
 │
 ├── Validate input
 ├── Find/create user
 ├── Hash/verify password
 └── Generate JWT
 │
 ▼
JWT returned to frontend
 │
 ▼
Protected API Request
 │
 │ Authorization: Bearer <token>
 ▼
Authentication Middleware
 │
 ├── Verify token
 ├── Identify user
 └── Authorize request
 │
 ▼
Protected Resource
```

The backend contains dedicated authentication and authorization middleware rather than relying solely on frontend restrictions.

---

# 🗄️ Database Architecture

The application uses **PostgreSQL** with **Prisma** as the database access layer.

The backend includes Prisma migrations and a Prisma schema defining the application's relational data model.

The project contains database models covering areas such as:

- Users
- Notes
- Reviews
- Downloads
- Shares
- Reports
- Sessions
- Audit records
- Catalog/academic metadata

This relational approach allows application entities and their relationships to be managed consistently through Prisma.

---

# 🔌 Backend API

The backend follows a REST-oriented architecture.

Major API areas include:

### Authentication

```text
/api/auth/*
```

Handles operations related to:

- Registration
- Login
- Authentication
- User/session information

### Notes

```text
/api/notes/*
```

Handles:

- Note creation
- Note retrieval
- Note details
- Note updates
- Note deletion
- Note sharing
- Ratings/reviews
- Downloads

### Administration

```text
/api/admin/*
```

Provides protected administrative functionality.

### Metadata

```text
/api/meta/*
```

Provides application metadata required by the frontend.

---

# 🧩 Frontend Pages

The React application is organized into reusable components and page-level modules.

### Main user pages

- Home
- Login
- Sign Up
- Profile
- Read Notes
- Note Details
- Upload Notes
- My Notes
- Edit Note
- Shared Note

### Administrative page

- Admin Dashboard

Reusable UI components include:

- Navbar
- Field
- Note Card

The application uses React Router to handle client-side navigation.

---

# 🔒 Security

Security is treated as a backend responsibility as well as a frontend concern.

The project includes:

- JWT authentication
- Password hashing
- Authentication middleware
- Role-based middleware
- Input validation
- Upload validation
- Centralized error handling
- Protected routes
- Session tracking
- Audit functionality
- Environment-variable based secrets
- Git exclusions for `.env` files
- Git exclusions for generated/local deployment files

### ⚠️ Environment Variables

Never commit production secrets to GitHub.

The repository provides example environment files:

```text
backend/.env.example
frontend/.env.example
```

Create local `.env` files based on these examples and provide your own environment-specific values.

---

# 💻 Local Development

## Prerequisites

Install:

- Node.js
- npm
- PostgreSQL / Neon PostgreSQL
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/sharonyobhattacharjee/student-notes-platform.git
cd student-notes-platform
```

---

## 2. Install Root Dependencies

```bash
npm install
```

---

## 3. Configure Backend

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Add the required backend environment variables.

---

## 4. Configure Database

The backend uses Prisma.

After configuring the database connection:

```bash
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate dev
```

If the project seed configuration is required:

```bash
npm run prisma:seed
```

---

## 5. Start the Backend

From the backend directory:

```bash
npm run dev
```

---

## 6. Configure Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create the frontend environment file:

```bash
cp .env.example .env
```

Configure the frontend API URL according to your environment.

Start the frontend:

```bash
npm run dev
```

The Vite development server will provide the local frontend URL.

---

# 🚀 Deployment

The application is deployed using **Vercel**.

### Production Application

🔗 **[Launch NoteShare](https://student-notes-platform-phi.vercel.app/login)**

The production deployment contains the frontend application and the backend is configured for Vercel deployment through the project's Vercel configuration.

### Deployment Configuration

The repository contains Vercel configuration files for the application:

```text
frontend/vercel.json
backend/vercel.json
```

Production environment variables should be configured through the deployment platform rather than committed to source control.

---

# 📦 Production Architecture

```text
                         Internet
                            │
                            ▼
                  ┌───────────────────┐
                  │      Vercel       │
                  │    Deployment     │
                  └─────────┬─────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       React/Vite Frontend          Express Backend
              │                           │
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                     Prisma ORM
                            │
                            ▼
                    PostgreSQL / Neon
```

---

# 🧪 Testing

The backend contains a test suite under:

```text
backend/tests/
```

Core application tests are maintained in:

```text
backend/tests/core.test.js
```

Run the project's configured test command from the backend package configuration.

---

# 🛠️ Engineering Practices

The project follows a modular structure rather than placing the entire application inside a single source file.

### Frontend separation

```text
Pages
  ↓
Reusable Components
  ↓
API / Authentication Layer
```

### Backend separation

```text
Routes
  ↓
Middleware
  ↓
Business / Service Logic
  ↓
Prisma
  ↓
PostgreSQL
```

This separation makes the project easier to maintain, test, debug, and extend.

---

# 📈 Future Improvements

Potential extensions include:

- Advanced full-text search
- Pagination and infinite scrolling
- Bookmark/favorite functionality
- Note recommendations
- Improved academic categorization
- Notifications
- Email verification
- Password reset
- More detailed analytics
- Content moderation improvements
- AI-powered note summarization
- AI-based semantic search
- Question generation from uploaded notes
- Personalized study recommendations

---

# 🎓 Learning Outcomes

This project demonstrates practical experience with:

- Full-stack web development
- React application architecture
- REST API development
- Express.js middleware
- JWT authentication
- Role-based authorization
- Password hashing
- PostgreSQL
- Prisma ORM
- Database migrations
- File upload handling
- Validation
- API security
- Session tracking
- Audit logging
- Vercel deployment
- Git and GitHub
- Production environment configuration

---

# 🤝 Contributing

Contributions and improvements are welcome.

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 👨‍💻 Author

**Sharonyo Bhattacharjee**

Computer Science & Engineering Undergraduate

### Links

- 🌐 **[Live Application](https://student-notes-platform-phi.vercel.app/login)**
- 💻 **[GitHub Repository](https://github.com/sharonyobhattacharjee/student-notes-platform)**

---

## ⭐ Project

If you find the project useful, consider giving the repository a ⭐ on GitHub.
