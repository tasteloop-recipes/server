import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import appleSignin from 'apple-signin-auth';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async appleSignIn(identityToken: string, authorizationCode?: string) {
    try {
      // Verify the Apple identity token
      const appleIdTokenClaims = await appleSignin.verifyIdToken(
        identityToken,
        {
          audience: this.configService.get<string>('APPLE_CLIENT_ID'),
          nonce: undefined, // Optional: implement nonce for additional security
        },
      );

      const { sub: appleId, email } = appleIdTokenClaims;

      // Upsert user in database
      const user = await this.usersService.upsertByAppleId(appleId, email);

      // Generate JWT
      const accessToken = this.generateJwt(user);

      return {
        accessToken,
        user,
      };
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      throw new UnauthorizedException('Invalid Apple credentials');
    }
  }

  generateJwt(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
