import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByAppleId(appleId: string) {
    return this.prisma.user.findUnique({
      where: { appleId },
    });
  }

  async upsertByAppleId(appleId: string, email?: string) {
    return this.prisma.user.upsert({
      where: { appleId },
      update: {
        email: email || undefined,
      },
      create: {
        appleId,
        email,
        role: 'user',
      },
    });
  }
}
