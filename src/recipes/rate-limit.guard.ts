import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface RateLimitStore {
  [key: string]: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store: RateLimitStore = {};

  private readonly maxRequests = 10;

  private readonly windowMs = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as Request;
    const ip = (request.ip || request.socket?.remoteAddress || 'unknown') as string;

    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Initialize if not exists
    if (!this.store[ip]) {
      this.store[ip] = [];
    }

    // Remove old requests outside the window
    this.store[ip] = this.store[ip].filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (this.store[ip].length >= this.maxRequests) {
      return false;
    }

    // Add current request
    this.store[ip].push(now);

    // Clean up old IPs to prevent memory leaks
    if (Math.random() < 0.01) {
      // Run cleanup occasionally
      const ips = Object.keys(this.store);
      for (const storeIp of ips) {
        if (this.store[storeIp].length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.store[storeIp];
        }
      }
    }

    return true;
  }
}
