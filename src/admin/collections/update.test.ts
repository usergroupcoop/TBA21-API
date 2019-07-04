require('dotenv').config(
  {
    DEBUG: true
  }
);

import { APIGatewayProxyEvent } from 'aws-lambda';
import { db } from '../../databaseConnect';
import { QueryStringParameters } from '../../types/_test_';
import { updateById } from './update';

afterAll( () => {
  // Close the database connection.
  db.$pool.end();
});

describe('/admin/collections/update/updateByID', () => {
  test('Update ID 1', async () => {
    const
      requestBody = {
        "id": "1",
        "cast_": 'test'
      },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody).toBe(true);
  });

  test('Check that supplying just the id returns a 400', async () => {
    const
      requestBody = { "id": "1" },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.message).toEqual('Nothing to update');
  });

  test('Get a bad response when no id is given', async () => {
    const
      queryStringParameters: QueryStringParameters = {id: ''},
      response = await updateById({queryStringParameters } as APIGatewayProxyEvent);

    expect(response.statusCode).toEqual(400);
  });
});