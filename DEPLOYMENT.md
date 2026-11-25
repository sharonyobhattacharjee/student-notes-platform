# Deployment checklist

## Production environment
Set:
- `DATABASE_URL` to managed PostgreSQL
- strong random `JWT_SECRET`
- `FRONTEND_URL` / `APP_BASE_URL` to the deployed frontend
- `STORAGE_DIR` to persistent private storage or migrate the file adapter to object storage
- SMTP settings if verification/password reset email is required

## Database
Run `npx prisma migrate deploy` in production. Do not use `prisma migrate dev` on a production database.

## HTTPS
Terminate TLS at the hosting/load-balancer layer and only expose the API through HTTPS.

## Backups
The SRS requires at least daily database and uploaded-file backups, RPO 24h and RTO 8h. Configure these in the hosting environment and test restores.

## Monitoring
Monitor API health, database connectivity, disk/storage capacity, failed authentication spikes and 5xx responses.

## Security
Do not use the development admin password. Keep `.env` out of source control. Put uploaded files outside the public web root/object-store public bucket.
