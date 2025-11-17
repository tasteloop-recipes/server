import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { RecipeLogType } from '@prisma/client';

registerEnumType(RecipeLogType, { name: 'RecipeLogType' });

@ObjectType()
export class RecipeLogModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  recipeId!: string;

  @Field(() => ID, { nullable: true })
  userId!: string | null;

  @Field(() => RecipeLogType)
  type!: RecipeLogType;

  @Field()
  message!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
