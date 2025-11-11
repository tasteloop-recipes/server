import 'reflect-metadata';

import { GraphQLScalarType } from 'graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage';
import { RecipeStatus } from '@prisma/client';
import { RecipeWorkerModel } from './models/recipe-worker.model';
import { CreateRecipeWorkerInput } from './dto/create-recipe-worker.input';

const isGraphQLScalarType = (
  value: unknown,
): value is GraphQLScalarType<unknown, unknown> =>
  value instanceof GraphQLScalarType;

describe('RecipeWorker GraphQL metadata', () => {
  beforeAll(() => {
    LazyMetadataStorage.load();
    TypeMetadataStorage.compile();
  });

  it('registers RecipeWorkerModel fields', () => {
    const metadata =
      TypeMetadataStorage.getObjectTypeMetadataByTarget(RecipeWorkerModel);
    expect(metadata).toBeDefined();

    const properties = metadata?.properties ?? [];
    const typeMapEntries: [string, unknown][] = [];

    for (const property of properties) {
      if (typeof property.typeFn !== 'function') {
        continue;
      }
      typeMapEntries.push([property.name, property.typeFn()]);
    }

    const typeMap = new Map(typeMapEntries);

    const idType = typeMap.get('id');
    expect(isGraphQLScalarType(idType)).toBe(true);
    if (isGraphQLScalarType(idType)) {
      expect(idType.name).toBe('ID');
    }

    expect(typeMap.get('status')).toBe(RecipeStatus);

    const promptField = properties.find(
      (property) => property.name === 'prompt',
    );
    expect(promptField).toBeDefined();
  });

  it('registers CreateRecipeWorkerInput fields', () => {
    const metadata = TypeMetadataStorage.getInputTypeMetadataByTarget(
      CreateRecipeWorkerInput,
    );
    expect(metadata).toBeDefined();

    const promptField = metadata?.properties?.find(
      (property) => property.name === 'prompt',
    );
    expect(promptField).toBeDefined();
  });
});
