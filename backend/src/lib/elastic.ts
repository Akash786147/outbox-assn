import { Client } from "@elastic/elasticsearch";
import { config } from "../config";

export const elastic = config.elasticUrl
  ? new Client({
      node: config.elasticUrl,
      ...(config.elasticApiKey && { auth: { apiKey: config.elasticApiKey } }),
    })
  : null;

export const EMAIL_INDEX = "emails";
