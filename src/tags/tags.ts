import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Joi from '@hapi/joi';

import { badRequestResponse, successResponse, internalServerErrorResponse } from '../common';
import { db } from '../databaseConnect';
import { limitQuery } from '../utils/queryHelpers';

/**
 *
 * Get an array of Tags
 *
 * @param event {APIGatewayEvent}
 *
 * @returns { Promise<APIGatewayProxyResult> } List of tags
 */
export const get = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    await Joi.validate(event.queryStringParameters, Joi.object().keys({
      type: Joi.string().valid('keyword', 'concept').required(),
      limit: Joi.number().integer(),
      query: Joi.string()
    }));

    const
      defaultValues = { limit: 15 },
      queryString = event.queryStringParameters,
      params: (string | number)[] = [limitQuery(queryString.limit, defaultValues.limit)];

    let searchQuery = '';

    if (queryString.hasOwnProperty('query')) {
      searchQuery = `WHERE LOWER(tag_name) LIKE '%' || LOWER($2) || '%'`;
      params.push(queryString.query);
    }

    const
      sqlStatement = `
        SELECT * 
          FROM ${queryString.type === 'concept' ? process.env.CONCEPT_TAGS_TABLE : process.env.KEYWORD_TAGS_TABLE}
          ${searchQuery}
        LIMIT $1
      `;

    const result = await db.manyOrNone(sqlStatement, params);

    return successResponse({ tags: result ? result : [] });
  } catch (e) {
    console.log('/tags/tags.get ERROR - ', !e.isJoi ? e : e.details);
    return badRequestResponse();
  }
};

/**
 *
 * Insert Tags from an array of strings
 *
 * @param event {APIGatewayEvent}
 *
 * @returns { Promise<APIGatewayProxyResult> } an array of tag objects {id: number, tag_name: string}
 */
export const insert = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const data = JSON.parse(event.body);

    await Joi.validate(data, Joi.object().keys({
      tags: Joi.array().items(Joi.string()).required()
    }));

    const
      { tags } = data,
      tableName = process.env.KEYWORD_TAGS_TABLE,
      sqlStatement = `
        WITH tag AS
        (
          SELECT * FROM ${tableName} WHERE tag_name = $1
        ),
        i AS
        (
          INSERT INTO ${tableName}(tag_name)
            VALUES ($1) ON CONFLICT (tag_name) DO NOTHING
          RETURNING id, tag_name
        )

        SELECT * FROM tag UNION ALL SELECT * FROM i;
      `;

    const results = [];
    // Loop through each tag and do a query, returning the tag object and pushing it into a final array
    for (const tag of tags) {
      const result = await db.one(sqlStatement, tag);
      results.push(result);
    }

    return successResponse({ tags: results });
  } catch (e) {
    console.log('/tags/tags.insert ERROR - ', !e.isJoi ? e : e.details);
    return badRequestResponse();
  }
};

/**
 *
 * Update a tag
 *
 * @param event {APIGatewayEvent}
 *
 * @returns { Promise<APIGatewayProxyResult> } the updated tag object {id: number, tag_name: string}
 */
export const update = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const data = JSON.parse(event.body);

    await Joi.validate(data, Joi.object().keys({
      id: Joi.number().integer().required(),
      new_tag_name: Joi.string().required()
    }));

    const
      { id, new_tag_name } = data,
      tableName = process.env.KEYWORD_TAGS_TABLE,
      sqlStatement = `UPDATE  ${tableName}
          set tag_name = $1
          where id=$2
          RETURNING id, tag_name;`,
      sqlParams = [new_tag_name, Number(id)];

    const result = await db.one(sqlStatement, sqlParams);

    return successResponse({ updatedTag: result });
  } catch (e) {
    if (e.isJoi) {
      return badRequestResponse();
    } else {
      console.log('/tags/tags.insert ERROR - ', !e.isJoi ? e : e.details);
      return internalServerErrorResponse();
    }
  }
};