import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { crawlHandler } from "./crawl";

const app = express();
app.use(express.json());
app.get("/crawl", (req, res) => res.send("POST로 요청하세요."));
app.post("/crawl", crawlHandler);

export const api = onRequest(
  { memory: "1GiB", timeoutSeconds: 60 },
  app
);
