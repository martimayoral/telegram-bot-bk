import express, { Request, Response } from "express";
import serverless from "serverless-http";

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello from Express + TypeScript on Vercel 🚀");
});

app.get("/hello", (_req: Request, res: Response) => {
  res.json({ message: "Hello route works!" });
});

// Export as Vercel serverless function
export const handler = serverless(app);
