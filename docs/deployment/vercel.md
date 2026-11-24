# Vercel deployment

The repository is an npm workspace monorepo. Deploy the web app and API as two Vercel projects that point to the same Git repository. Provision a managed PostgreSQL database through a provider supported by Vercel and attach it to the API project.

## 1. Provision PostgreSQL

Create a production PostgreSQL database and keep its connection string private. Configure network access for Vercel if the provider requires it. Do not use the local Docker database or commit any credentials.

## 2. Create the API project

Import the Git repository into Vercel and set the project root directory to `apps/api`. Enable access to source files outside the project root so the build can use the root npm workspace and lockfile. Vercel detects the Express app at `src/app.ts` and serves it as a function.

Set these Production and Preview environment variables on the API project:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The managed PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | A randomly generated secret of at least 32 characters |
| `CORS_ORIGIN` | The exact deployed web origin, including `https://` |
| `NODE_ENV` | `production` |

The API project should use the default install and build commands. `postinstall` runs `prisma generate`; the detected Express entry is `src/app.ts`. Do not run migrations as part of every build. Once the API project is linked and its environment variables are configured, apply the checked-in migrations from the repository root:

```powershell
$env:DATABASE_URL = "<production connection string>"
npm run db:deploy
```

Use the database provider's dashboard or a secure secret manager to obtain the connection string. Setting it in the current PowerShell session avoids overwriting any existing local `.env` file. Do not save the value in the repository.

## 3. Seed production data and administrator

After migrations succeed, seed the synthetic 10,000-employee dataset and create the first administrator using the API project's database connection:

```powershell
$env:DATABASE_URL = "<production connection string>"
$env:BOOTSTRAP_ADMIN_EMAIL = "<administrator email>"
$env:BOOTSTRAP_ADMIN_PASSWORD = "<unique password of at least 12 characters>"
npm run db:seed
npm run db:seed:admin
Remove-Item Env:DATABASE_URL, Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_PASSWORD
```

Use a unique password and keep it private. Seeding must target the intended production database; verify the connection before running these commands.

## 4. Create the web project

Import the same Git repository as a second Vercel project and set its root directory to `apps/web`. Set this environment variable for both Preview and Production deployments:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<api-project-domain>/api/v1` |

Vercel detects Next.js and runs its normal production build. Since this variable is embedded at build time, redeploy the web project after changing it.

Set `CORS_ORIGIN` on the API project to the web project's exact domain (and to the intended Preview domain if Preview deployments need to access the API). Redeploy the API after changing environment variables.

## 5. Verify the deployment

After both projects finish deploying:

1. Open `https://<api-project-domain>/api/v1/health/live`; expect HTTP 200.
2. Open `https://<api-project-domain>/api/v1/health/ready`; expect HTTP 200 after migrations and database connectivity are in place.
3. Open the web project URL, sign in with the seeded HR administrator, and verify the employee directory and compensation dashboard load.
4. Check the browser console and API function logs for CORS, database, or runtime errors.

Do not expose database URLs, JWT secrets, or administrator passwords in commits, deployment logs, or the demo.
