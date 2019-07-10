require('dotenv').config(
  {
    DEBUG: true
  });

import { APIGatewayProxyEvent } from 'aws-lambda';
import { db } from '../databaseConnect';
import { QueryStringParameters } from '../types/_test_';
import { reSeedDatabase } from '../utils/testHelper';
import {
  get,
  search,
  insert
} from './tags';

afterAll( async () => {
  await reSeedDatabase();
  // Close the database connection.
  db.$pool.end();
});

describe('Tag get tests', () => {
  test('Check that we have 3 keyword tags with the name of keyword.', async () => {
    const
      queryStringParameters: QueryStringParameters = {type: 'keyword'},
      response = await get({ queryStringParameters } as APIGatewayProxyEvent),
      results = JSON.parse(response.body);

    expect(results.tags.length).toEqual(3);
  });

  test('Check that we have 1 keyword tag using limit with the name of keyword.', async () => {
    const
      queryStringParameters: QueryStringParameters = {type: 'keyword', limit: '1'},
      response = await get({ queryStringParameters } as APIGatewayProxyEvent),
      results = JSON.parse(response.body);

    expect(results.tags.length).toEqual(1);
  });

});

describe('Tag search tests', () => {
  test('Check that we have 3 keyword tags with the name of keyword.', async () => {
    const
      queryStringParameters: QueryStringParameters = {type: 'keyword', query: 'keyword'},
      response = await search({ queryStringParameters } as APIGatewayProxyEvent),
      results = JSON.parse(response.body);

    expect(results.tags.length).toEqual(3);
  });

  test('Check that we have 0 keyword tags by the name of QQQ', async () => {
    const
      queryStringParameters: QueryStringParameters = {type: 'keyword', query: 'QQQ'},
      response = await search({ queryStringParameters } as APIGatewayProxyEvent),
      results = JSON.parse(response.body);

    expect(results.tags.length).toEqual(0);
  });

  test('Check that we have 3 concept tags with the name of concept.', async () => {
    const
      queryStringParameters: QueryStringParameters = {type: 'concept', query: 'concept'},
      response = await search({ queryStringParameters } as APIGatewayProxyEvent),
      results = JSON.parse(response.body);

    expect(results.tags.length).toEqual(3);
  });
  test('Check that we have 0 concept tags by the name of QQQ', async () => {
    const
      queryStringParameters: QueryStringParameters = {type: 'concept', query: 'QQQ'},
      response = await search({ queryStringParameters } as APIGatewayProxyEvent),
      results = JSON.parse(response.body);

    expect(results.tags.length).toEqual(0);
  });

  test('400 when no queryStrings passed', async () => {
    const { statusCode } = await search({ } as APIGatewayProxyEvent);
    expect(statusCode).toEqual(400);
  });
});

describe('Tag insert tests', () => {
  test('Insert 1 keyword tag and check the result', async () => {
    const
      requestBody = {
        'type': 'keyword',
        'tags': ['Whale']
      },
      body: string = JSON.stringify(requestBody),
      response = await insert({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.tags.length).toEqual(1);
    expect(responseBody.tags[0]).toMatchObject({ "id": "4", "tag_name": 'Whale' });
  });

  test('Insert 1 keyword that doesn\'t exist tag and check the results', async () => {
    const
      requestBody = {
        'type': 'keyword',
        'tags': ['Whale', 'dolphin']
      },
      body: string = JSON.stringify(requestBody),
      response = await insert({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.tags.length).toEqual(2);
    expect(responseBody.tags).toEqual(expect.arrayContaining([{ "id": "4", "tag_name": 'Whale' }, { "id": "6", "tag_name": 'dolphin' }]));
  });
});


