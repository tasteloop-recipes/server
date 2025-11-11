import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { RecipeStatus } from '@prisma/client';

registerEnumType(RecipeStatus, { name: 'RecipeStatus' });

@ObjectType()
export class RecipeWorkerModel {
  @Field(() => ID)
  id!: string;

  @Field(() => RecipeStatus)
  status!: RecipeStatus;

  @Field()
  prompt!: string;
}
