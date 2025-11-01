import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class AppleSignInInput {
  @Field()
  @IsString()
  identityToken: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  authorizationCode?: string;
}
