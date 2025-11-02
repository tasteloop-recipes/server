const connectMock = jest.fn();
const disconnectMock = jest.fn();

jest.mock('@prisma/client', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PrismaClient: class {
    $connect = connectMock;
    $disconnect = disconnectMock;
  },
}));

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  beforeEach(() => {
    connectMock.mockClear();
    disconnectMock.mockClear();
  });

  it('connects on module init', async () => {
    const service = new PrismaService();

    await service.onModuleInit();

    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destroy', async () => {
    const service = new PrismaService();

    await service.onModuleDestroy();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
