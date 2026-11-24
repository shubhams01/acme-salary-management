import "dotenv/config";

import app from "./app";
import { prisma } from "./config/database";

const PORT = Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    await prisma.$connect();

    const server = app.listen(PORT, () => {
      console.log(`ACME API running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log("Shutting down API...");

      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start API:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void startServer();