import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.output';
import { AppleSignInInput } from './dto/apple-signin.input';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async appleSignIn(
    @Args('input') input: AppleSignInInput,
  ): Promise<AuthPayload> {
    return this.authService.appleSignIn(
      input.identityToken,
      input.authorizationCode,
    );
  }
}
