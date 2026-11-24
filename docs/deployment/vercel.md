# Vercel Services deployment

This repository uses one Vercel project with two services defined in the root [vercel.json](../../vercel.json). Vercel Services is currently in Beta. In the Vercel project settings, select **Services** as the framework so Vercel builds the service configuration.

## Services and public routes

| Service | Root | Framework | Public route |
| --- | --- | --- | --- |
| `api` | `apps/api` | Express | `/api/*` |
| `web` | `apps/web` | Next.js | All remaining paths (`/*`) |

The API receives the original path, so `/api/v1/employees` reaches the existing Express route unchanged. The web browser calls the API at `/api/v1`; this is same-origin traffic routed by Vercel, so the web service does not call the API service directly and no service binding is needed. Both services are public: the API is required at `/api/*` for the browser, and its protected endpoints require HR authentication.

## Configure the project

1. Import this repository into Vercel as one project, with the repository root as the project root.
2. In **Settings → Build and Deployment → Framework Preset**, select **Services**.
3. Add these project environment variables for Preview and Production:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Connection string for the managed PostgreSQL database |
   | `JWT_ACCESS_SECRET` | Random secret with at least 32 characters |
   | `NEXT_PUBLIC_API_URL` | `/api/v1` |

   Keep database and JWT values private. The web app can use the same `/api/v1` URL in every deployment because Vercel serves both services on the same domain. `CORS_ORIGIN` is not needed for this same-origin setup.

4. Keep the detected install and build settings. The API's `postinstall` script generates Prisma Client; Express and Next.js builds are detected per service.
5. Connect a managed PostgreSQL database reachable from Vercel. Do not use the local Docker database or commit credentials.

## Migrate and seed the database

After the project environment is configured, set the database URL in a temporary PowerShell session and run the checked-in migration:

```powershell
$env:DATABASE_URL = "<production connection string>"
npm run db:deploy
```

Seed the synthetic 10,000-employee dataset and create the first HR administrator:

```powershell
$env:DATABASE_URL = "<production connection string>"
$env:BOOTSTRAP_ADMIN_EMAIL = "<administrator email>"
$env:BOOTSTRAP_ADMIN_PASSWORD = "<unique password, at least 12 characters>"
npm run db:seed
npm run db:seed:admin
Remove-Item Env:DATABASE_URL, Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_PASSWORD
```

Use the database provider's dashboard or a secure secret manager to obtain the connection string. These commands keep the values out of the repo and avoid overwriting an existing local `.env` file. Confirm the target database before seeding.

## Test locally and in Vercel

From the repository root, Vercel's local development mode starts both services together:

```powershell
npx vercel dev --local
```

After deployment, verify the shared project domain:

1. `https://<project-domain>/api/v1/health/live` returns HTTP 200.
2. `https://<project-domain>/api/v1/health/ready` returns HTTP 200 after migrations and database connectivity are in place.
3. Open `https://<project-domain>/`, sign in with the seeded administrator, and confirm the employee directory and compensation dashboard load.
4. Check browser and function logs for runtime or database errors.

Do not expose database URLs, JWT secrets, or administrator passwords in commits, deployment logs, or the demo.
