require('dotenv').config(
  {
    DEBUG: true
  }
);

import { APIGatewayProxyEvent } from 'aws-lambda';
import { db } from '../../databaseConnect';
import { reSeedDatabase } from '../../utils/testHelper';
import { updateById } from './update';

describe('/admin/collections/update/updateByID', () => {

  // AfterAll tests reseed the DB
  afterAll( async () => {
    await reSeedDatabase();
    // Close the database connection.
    db.$pool.end();
  });

  test('Update everything with an ID 1', async () => {
    const
      requestBody = {
        'id': '1',
        'status': 'true' ,
        'concept_tags': ['1'] ,
        'keyword_tags': ['2', '3'],
        'country_or_ocean': 'Atlantic' ,
        'creators': ['Zara'] ,
        'directors': ['Zara'],
        'writers': ['Zara'],
        'editor': 'Zara',
        'collaborators': ['collaborators'] ,
        'exhibited_at': ['exhibited at'],
        'series': 'series',
        'isbn': [978316184100],
        'edition': '1',
        'publisher': ['publisher'],
        'interviewers': ['interviewer'],
        'interviewees': ['interviewee'],
        'cast_': '{test}',
        'title': 'title',
        'subtitle': 'subtitle',
        'description': 'descritption',
        'copyright_holder': 'Zara',
        'copyright_country': 'Australia',
        'disciplinary_field': 'Cats',
        'specialisation': 'Cat',
        'department': 'Cat',
        'expedition_leader': 'Zara' ,
        'institution': 'uow',
        'expedition_vessel': 'Boat',
        'expedition_route': 'route',
        'expedition_blog_link': 'www.blog.com',
        'participants': ['Zara'],
        'venues': ['venue'],
        'curator': 'curator',
        'host': ['host'],
        'event_type': 'event type',
        'host_organisation': ['host org'],
        'focus_arts': '1',
        'focus_action': '2',
        'focus_scitech': '3',
        'url': 'www.google.com',
        'related_material': [1, 2],
        'license': 'CC BY-ND',
        'location': 'wollongong',
        'year_produced': '1992',
        'media_type': 'photograph',
        'city_of_publication': 'wollongong',
        'digital_only': 'true',
        'related_event': 'related',
        'volume': '1',
        'number': '2',
        'items': ['private/eu-central-1:80f1e349-677b-4aed-8b26-896570a8073c/ad742900-a6a0-11e9-b5d9-1726307e8330-kitten-pet-animal-domestic-104827.jpeg', 'private/eu-central-1:80f1e349-677b-4aed-8b26-896570a8073c/ad742900-a6a0-11e9-b5d9-1726307e8330-dog-pet-animal-domestic-104827.jpeg', 'private/eu-central-1:80f1e349-677b-4aed-8b26-896570a8073c/862f0b10-a6a7-11e9-9669-7fbab4073699-Humpback_Whales_-_South_Bank.jpg'],
      },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.success).toBe(true);
  });
  test('Update one item in the collection with an ID 1', async () => {
    const
      requestBody = {
        'id': '1',
        'items': ['private/eu-central-1:80f1e349-677b-4aed-8b26-896570a8073c/ad742900-a6a0-11e9-b5d9-1726307e8330-kitten-pet-animal-domestic-104827.jpeg'],
      },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.success).toBe(true);
  });
  test('Remove all items from collection ID 1', async () => {
    const
      requestBody = {
        'id': '1',
        'items': [],
      },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.success).toBe(true);
  });
  test('Update collection ID 1 with two items', async () => {
    const
      requestBody = {
        'id': '1',
        'items': ['private/eu-central-1:80f1e349-677b-4aed-8b26-896570a8073c/ad742900-a6a0-11e9-b5d9-1726307e8330-kitten-pet-animal-domestic-104827.jpeg',   'private/eu-central-1:80f1e349-677b-4aed-8b26-896570a8073c/ad742900-a6a0-11e9-b5d9-1726307e8330-dog-pet-animal-domestic-104827.jpeg'],
      },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.success).toBe(true);
  });
  test('Check that supplying just the id returns a 400', async () => {
    const
      requestBody = { 'id': '1' },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent),
      responseBody = JSON.parse(response.body);

    expect(responseBody.message).toEqual('Nothing to update');
  });

  test('Get a bad response when no id is given', async () => {
    const
      requestBody = { 'id': '' },
      body: string = JSON.stringify(requestBody),
      response = await updateById({ body } as APIGatewayProxyEvent);

    expect(response.statusCode).toEqual(400);
  });
});
