import "dotenv/config";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL ?? "http://localhost:4000",
  jwtSecret: required("JWT_SECRET"),

  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  elasticUrl: process.env.ELASTICSEARCH_URL ?? "",
  elasticApiKey: process.env.ELASTICSEARCH_API_KEY ?? "",

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID ?? "",
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
  },

  etherealSenderCount: Number(process.env.ETHEREAL_SENDER_COUNT ?? 3),
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
  minDelayMs: Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS ?? 2000),
  maxPerHourPerSender: Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 200),
  jobAttempts: Number(process.env.JOB_ATTEMPTS ?? 3),
  runWorker: process.env.RUN_WORKER === "true",

  adminUser: process.env.ADMIN_USER ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
