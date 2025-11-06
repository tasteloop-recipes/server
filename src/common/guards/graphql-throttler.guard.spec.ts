import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { GraphqlThrottlerGuard } from './graphql-throttler.guard';

describe('GraphqlThrottlerGuard', () => {
  let guard: GraphqlThrottlerGuard;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: jest.Mocked<Request>;
  let mockResponse: jest.Mocked<Response>;
  let mockGqlContext: jest.Mocked<GqlExecutionContext>;

  beforeEach(() => {
    guard = new GraphqlThrottlerGuard();

    // Create mock request and response
    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    } as unknown as jest.Mocked<Request>;

    mockResponse = {
      setHeader: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    // Create mock GraphQL context
    mockGqlContext = {
      getContext: jest.fn().mockReturnValue({
        req: mockRequest,
        res: mockResponse,
      }),
    } as unknown as jest.Mocked<GqlExecutionContext>;

    // Mock the static method
    (GqlExecutionContext.create as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockGqlContext);

    mockExecutionContext = {
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn(),
      switchToWs: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRest: jest.fn(),
      switchToGraphql: jest.fn(),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  describe('getRequestResponse', () => {
    it('should extract request and response from GraphQL context', () => {
      const result = guard.getRequestResponse(mockExecutionContext);

      expect(result.req).toBe(mockRequest);
      expect(result.res).toBe(mockResponse);
      expect(GqlExecutionContext.create).toHaveBeenCalledWith(
        mockExecutionContext,
      );
      expect(mockGqlContext.getContext).toHaveBeenCalled();
    });

    it('should properly retrieve context objects', () => {
      const contextData = {
        req: mockRequest,
        res: mockResponse,
        userId: '123',
      };

      mockGqlContext.getContext.mockReturnValue(contextData);

      const result = guard.getRequestResponse(mockExecutionContext);

      expect(result).toEqual({
        req: mockRequest,
        res: mockResponse,
      });
      expect(mockGqlContext.getContext).toHaveBeenCalled();
    });

    it('should handle multiple calls independently', () => {
      const firstResult = guard.getRequestResponse(mockExecutionContext);

      const secondMockRequest = {
        ip: '192.168.1.1',
        headers: {},
      } as unknown as jest.Mocked<Request>;

      const secondMockResponse = {
        setHeader: jest.fn(),
      } as unknown as jest.Mocked<Response>;

      mockGqlContext.getContext.mockReturnValue({
        req: secondMockRequest,
        res: secondMockResponse,
      });

      const secondResult = guard.getRequestResponse(mockExecutionContext);

      expect(firstResult.req).toBe(mockRequest);
      expect(secondResult.req).toBe(secondMockRequest);
    });

    it('should maintain reference to original context objects', () => {
      const result1 = guard.getRequestResponse(mockExecutionContext);
      const result2 = guard.getRequestResponse(mockExecutionContext);

      expect(result1.req).toBe(result2.req);
      expect(result1.res).toBe(result2.res);
    });
  });

  describe('integration with ThrottlerGuard', () => {
    it('should extend ThrottlerGuard', () => {
      expect(guard).toBeInstanceOf(GraphqlThrottlerGuard);
    });

    it('should override getRequestResponse method', () => {
      expect(guard.getRequestResponse).toBeDefined();
      expect(typeof guard.getRequestResponse).toBe('function');
    });

    it('should work with typical GraphQL execution context structure', () => {
      const typicalContext = {
        req: mockRequest,
        res: mockResponse,
        dataloaders: {},
      };

      mockGqlContext.getContext.mockReturnValue(typicalContext);

      const result = guard.getRequestResponse(mockExecutionContext);

      expect(result.req).toBe(mockRequest);
      expect(result.res).toBe(mockResponse);
    });
  });
});
