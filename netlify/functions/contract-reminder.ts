import type { Config } from "@netlify/functions";

export default async () => {
  const siteUrl = process.env.URL;

  const res = await fetch(`${siteUrl}/api/contract-reminder`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const text = await res.text();
  console.log("contract-reminder result:", res.status, text);

  return new Response(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  schedule: "50 4 * * *",
};