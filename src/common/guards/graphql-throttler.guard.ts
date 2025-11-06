import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';

interface Context {
  req: Request;
  res: Response;
}

@Injectable()
export class GraphqlThrottlerGuard extends ThrottlerGuard {
  override getRequestResponse(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext<Context>();
    return { req: ctx.req, res: ctx.res };
  }
}
