import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, number[]>();

  private readonly maxRequests = 10;

  private readonly windowMs = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const socketAddress = request.socket.remoteAddress ?? undefined;
    const ip = request.ip ?? socketAddress ?? 'unknown';

    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.store.get(ip) ?? [];

    // Remove old requests outside the window
    const recentRequests = timestamps.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      this.store.set(ip, recentRequests);
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.store.set(ip, recentRequests);

    // Clean up old IPs to prevent memory leaks
    if (Math.random() < 0.01) {
      // Run cleanup occasionally
      for (const [storeIp, storeTimestamps] of this.store.entries()) {
        if (storeTimestamps.length === 0) {
          this.store.delete(storeIp);
        }
      }
    }

    return true;
  }
}
