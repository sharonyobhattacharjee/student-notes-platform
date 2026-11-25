# Note Sharing Platform API

Industry-oriented implementation aligned to SRS-NSP-001.

## Stack
- Node.js + Express
- PostgreSQL + Prisma
- JWT authentication with 30-minute access-token expiry
- bcrypt password hashing
- Multer upload handling
- `file-type` content validation
- Helmet, CORS and rate limiting

## Run
1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Create the PostgreSQL database.
3. `npm install`
4. `npx prisma generate`
5. `npx prisma migrate dev --name init`
6. `npm run prisma:seed`
7. `npm run dev`

Admin credentials default to `admin@example.com` / `ChangeMe123!`; override with `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding.
