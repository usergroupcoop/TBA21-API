import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { badRequestResponse, headers, internalServerErrorResponse, successResponse } from '../../common';
import { db } from '../../databaseConnect';
import Joi from '@hapi/joi';

export const get = async(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    await Joi.validate(event.queryStringParameters, Joi.object().keys({
      table: Joi.any().valid('Profile', 'Collection', 'Item'),
      short_path: Joi.string().required()
    }));
    const queryString = event.queryStringParameters;
    let table = process.env.ITEMS_TABLE;

    switch (queryString.table) {
      case 'Profiles':
        table =  process.env.PROFILES_TABLE;
        break;
      case 'Collections':
        table =  process.env.COLLECTIONS_TABLE;
        break;
      default:
        break;
    }

    const
      params = [queryString.table, queryString.short_path],
      sqlStatement = `
        SELECT *
        FROM (
          SELECT * 
          FROM ${process.env.SHORT_PATHS}
          WHERE ${process.env.SHORT_PATHS}.short_path = $2
        ) AS short_paths
          JOIN ${table}
          AS id_ on short_paths.id = id_.id
      `;
    return successResponse({short_path: await db.any(sqlStatement, params)});
  } catch (e) {
    console.log('/profiles/shortPaths.get ERROR - ', e);
    return badRequestResponse();
  }
};

export const insert = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const data = JSON.parse(event.body);

    await Joi.validate(data, Joi.object().keys(
      {
        short_path: Joi.string().required(),
        id: Joi.number().required(),
        object_type: Joi.string()
      }));

    let paramCounter = 0;

    const
      params = [],
      sqlFields: string[] = Object.keys(data).map((key) => {
        return `${key}`;
      }),
      sqlParams: string[] = Object.keys(data).map((key) => {
        params[paramCounter++] = data[key];
        return `$${paramCounter}`;
      });

    const query = `
      INSERT INTO ${process.env.SHORT_PATHS} (${[...sqlFields]})
      VALUES (${[...sqlParams]})
      RETURNING ${process.env.SHORT_PATHS}.short_path;
    `;

    const insertResult = await db.task(async t => {
      return await t.one(query, params);
    });
    console.log(query);
    return {
      body: JSON.stringify({ success: true, short_path: insertResult }),
      headers: headers,
      statusCode: 200
    };
    } catch (e) {
    if ((e.message === 'Nothing to update') || (e.isJoi)) {
      return badRequestResponse(e.message);
    } else {
      console.log('/admin/collections/update ERROR - ', e);
      return internalServerErrorResponse();
    }
  }
};
