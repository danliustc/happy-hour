/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        DB: D1Database;
        IMAGES: R2Bucket;
        AI: Ai;
        R2_PUBLIC_URL: string;
        GITHUB_CLIENT_ID: string;
        GITHUB_CLIENT_SECRET: string;
        AUTH_SECRET: string;
      };
      ctx: {
        waitUntil(promise: Promise<unknown>): void;
        passThroughOnException(): void;
      };
    };
    user: {
      id: number;
      username: string;
      display_name: string;
      avatar_url: string;
    } | null;
  }
}
