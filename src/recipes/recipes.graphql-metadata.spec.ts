import 'reflect-metadata';

import { GraphQLISODateTime } from '@nestjs/graphql';
import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage';
import { Diet, MealType, ProteinType, RecipeDifficulty } from '@prisma/client';
import { GraphQLScalarType } from 'graphql';
import { RecipesInput } from './dto/recipes.input';
import { RecipeModel } from './models/recipe.model';
import { RecipeImageModel } from './models/recipe-image.model';
import { RecipeIngredientModel } from './models/recipe-ingredient.model';
import { MiscNutritionFactModel } from './models/misc-nutrition-fact.model';
import { RecipeNutritionFactModel } from './models/recipe-nutrition-fact.model';
import { RecipesPage, RecipesPageMeta } from './models/recipes-page.model';

const hasTypeFn = (property: {
  name: string;
  typeFn?: () => unknown;
}): property is { name: string; typeFn: () => unknown } =>
  typeof property.typeFn === 'function';

const resolveAllTypeFns = (
  properties: { name: string; typeFn?: () => unknown }[],
): Map<string, unknown> => {
  const entries: [string, unknown][] = [];

  for (const property of properties) {
    expect(hasTypeFn(property)).toBe(true);
    if (!hasTypeFn(property)) {
      continue;
    }

    const resolvedType = property.typeFn();
    entries.push([property.name, resolvedType]);
    expect(resolvedType).toBeDefined();
  }

  return new Map(entries);
};

const isGraphQLScalarType = (
  value: unknown,
): value is GraphQLScalarType<unknown, unknown> =>
  value instanceof GraphQLScalarType;

describe('GraphQL metadata resolution', () => {
  beforeAll(() => {
    LazyMetadataStorage.load();
    TypeMetadataStorage.compile();
  });

  it('resolves RecipeModel field GraphQL types', () => {
    const metadata =
      TypeMetadataStorage.getObjectTypeMetadataByTarget(RecipeModel);
    expect(metadata).toBeDefined();

    const typeMap = resolveAllTypeFns(metadata?.properties ?? []);

    const idType = typeMap.get('id');
    expect(isGraphQLScalarType(idType)).toBe(true);
    if (isGraphQLScalarType(idType)) {
      expect(idType.name).toBe('ID');
    }
    expect(typeMap.get('difficulty')).toBe(RecipeDifficulty);
    expect(typeMap.get('mealTypes')).toBe(MealType);
    expect(typeMap.get('diets')).toBe(Diet);
    expect(typeMap.get('proteinType')).toBe(ProteinType);
    expect(typeMap.get('prepTimeMinutes')).toBe(Number);
    expect(typeMap.get('cookTimeMinutes')).toBe(Number);
    expect(typeMap.get('ingredients')).toBe(RecipeIngredientModel);
    expect(typeMap.get('nutritionFacts')).toBe(RecipeNutritionFactModel);
    expect(typeMap.get('miscNutritionFacts')).toBe(MiscNutritionFactModel);
    expect(typeMap.get('image')).toBe(RecipeImageModel);
    const createdAtType = typeMap.get('createdAt');
    expect(isGraphQLScalarType(createdAtType)).toBe(true);
    if (isGraphQLScalarType(createdAtType)) {
      expect(createdAtType.name).toBe(GraphQLISODateTime.name);
    }
    const updatedAtType = typeMap.get('updatedAt');
    expect(isGraphQLScalarType(updatedAtType)).toBe(true);
    if (isGraphQLScalarType(updatedAtType)) {
      expect(updatedAtType.name).toBe(GraphQLISODateTime.name);
    }
  });

  it('resolves RecipesPage and RecipesPageMeta structures', () => {
    const pageMetaMetadata =
      TypeMetadataStorage.getObjectTypeMetadataByTarget(RecipesPageMeta);
    const pageMetadata =
      TypeMetadataStorage.getObjectTypeMetadataByTarget(RecipesPage);

    expect(pageMetaMetadata).toBeDefined();
    expect(pageMetadata).toBeDefined();

    const metaTypeMap = resolveAllTypeFns(pageMetaMetadata?.properties ?? []);
    const pageTypeMap = resolveAllTypeFns(pageMetadata?.properties ?? []);

    for (const type of metaTypeMap.values()) {
      expect(isGraphQLScalarType(type)).toBe(true);
      if (isGraphQLScalarType(type)) {
        expect(type.name).toBe('Int');
      }
    }

    expect(pageTypeMap.get('data')).toBe(RecipeModel);
    expect(pageTypeMap.get('meta')).toBe(RecipesPageMeta);
  });

  it('resolves RecipesInput GraphQL field types', () => {
    const metadata =
      TypeMetadataStorage.getInputTypeMetadataByTarget(RecipesInput);
    expect(metadata).toBeDefined();

    const typeMap = resolveAllTypeFns(metadata?.properties ?? []);

    for (const type of typeMap.values()) {
      expect(isGraphQLScalarType(type)).toBe(true);
      if (isGraphQLScalarType(type)) {
        expect(type.name).toBe('Int');
      }
    }
  });
});
