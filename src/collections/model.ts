import { APIGatewayProxyResult } from 'aws-lambda';
import {
  badRequestResponse,
  headers,
  internalServerErrorResponse,
  successResponse,
  unAuthorizedRequestResponse
} from '../common';
import { db } from '../databaseConnect';
import { geoJSONToGeom } from '../map/util';
import { limitQuery } from '../utils/queryHelpers';
import { dbgeoparse } from '../utils/dbgeo';

export const create = async (requestBody, isAdmin: boolean) => {
  try {

    let
      paramCounter = 0,
      hasGeoData = false,
      geoData;

    // Grab our geoJSON if we have it
    if (requestBody.geojson) {
      if (Object.keys(requestBody.geojson.features).length) {
        hasGeoData = true;
        geoData = requestBody.geojson;
      } else {
        Object.assign(requestBody, {geom: null});
      }
      // Always delete geojson as we don't have a column for it.
      delete requestBody.geojson;
    }

    const
      params = [],
      sqlFields: string[] = Object.keys(requestBody).filter(e => (e !== 'items') && (e !== 'collections')).map((key) => {
        if (key === 'contributors') {
          return `contributors`;
        }
        return `${key}`;
      }),
      sqlParams: string[] = Object.entries(requestBody).filter(([e, v]) => (e !== 'items') && (e !== 'collections')).map(([key, value]) => {

        // @ts-ignore
        if ((typeof(value) === 'string' || Array.isArray(value)) && value.length === 0) {
          requestBody[key] = null;
        }

        params[paramCounter++] = requestBody[key];
        if (key === 'contributors') {
          return `$${paramCounter}::uuid[]`;
        }
        return `$${paramCounter}`;
      });

    sqlFields.push('created_at', 'updated_at');
    sqlParams.push('now()', 'now()');

    // If we have geoJSON push it into SQL SETS
    if (hasGeoData && Object.keys(geoData).length) {
      sqlFields.push('geom');
      sqlParams.push(`ST_GeomFromText('GeometryCollection(${(await geoJSONToGeom(geoData)).join(',')})', 4326)`);
    }

    const query = `INSERT INTO ${process.env.COLLECTIONS_TABLE} (${sqlFields.join(', ')}) VALUES (${sqlParams.join(', ')}) RETURNING id;`;

    const insertResult = await db.task(async t => {
      const insertedObject = await t.one(query, params);

      // If we have items
      if (requestBody.items && requestBody.items.length > 0) {
        const
          SQL_INSERTS: string[] = requestBody.items.map((item, index) => (`($1, $${index + 2})`)),
          addQuery = `INSERT INTO ${process.env.COLLECTIONS_ITEMS_TABLE} (collection_id, item_s3_key) VALUES ${SQL_INSERTS.join(', ')}`,
          addParams = [insertedObject.id, ...requestBody.items];

        await t.any(addQuery, addParams);
      }
      // If we have collections
      if (requestBody.collections && requestBody.collections.length > 0) {
        const
          SQL_INSERTS: string[] = requestBody.collections.map((item, index) => (`($1, $${index + 2})`)),
          addQuery = `INSERT INTO ${process.env.COLLECTION_COLLECTIONS_TABLE} (id, collection_id) VALUES ${SQL_INSERTS.join(', ')}`,
          addParams = [insertedObject.id, ...requestBody.collections];

        await t.any(addQuery, addParams);
      }

      return insertedObject;
    });

    return {
      body: JSON.stringify({ success: true, id: insertResult.id }),
      headers: headers,
      statusCode: 200
    };

  } catch (e) {
    console.log('src/collections/model/create ERROR - ', e);
    return internalServerErrorResponse();
  }
};

export const update = async (requestBody, isAdmin: boolean, userId?: string) => {
  try {

    let
      paramCounter = 0,
      hasGeoData = false,
      geoData;

    // Grab our geoJSON if we have it
    if (requestBody.geojson) {
      if (Object.keys(requestBody.geojson.features).length) {
        hasGeoData = true;
        geoData = requestBody.geojson;
      } else {
        Object.assign(requestBody, {geom: null});
      }
      // Always delete geojson as we don't have a column for it.
      delete requestBody.geojson;
    }

    const params = [];
    params[paramCounter++] = requestBody.id;
    // pushed into from SQL SET map
    // An array of strings [`publish='abc'`, `cast_ = 'the rock'`]
    const SQL_SETS: string[] = Object.entries(requestBody)
      .filter(([e, v]) => ((e !== 'id') && (e !== 'items') && (e !== 'collections'))) // remove id and items
      .map(([key, value]) => {
        // @ts-ignore
        if ((typeof(value) === 'string' || Array.isArray(value)) && value.length === 0) {
          requestBody[key] = null;
        }
        params[paramCounter++] = requestBody[key];

        if (key === 'contributors') {
          return `${key}=$${paramCounter}::uuid[]`;
        }

        return `${key}=$${paramCounter}`;
      });

    // If we have geoJSON push it into SQL SETS
    if (hasGeoData && Object.keys(geoData).length) {
      SQL_SETS.push(`geom=ST_GeomFromText('GeometryCollection(${(await geoJSONToGeom(geoData)).join(',')})', 4326)`);
    }

    let query = `
          UPDATE ${process.env.COLLECTIONS_TABLE}
          SET
            updated_at='${new Date().toISOString()}',
            ${SQL_SETS.join(', ')}
          WHERE id = $1 `;

    if (!isAdmin) {
      params[paramCounter++] = userId;
      query += ` and $${paramCounter} = ANY (contributors) `;
    }

    query += ` returning id;`;

    if (!SQL_SETS.length && !requestBody.items) {
      return badRequestResponse('Nothing to update');
    }

    await db.task(async t => {

      // If we have items in SQL_SETS do the query.
      if (SQL_SETS.length) {
        const updateResult = await t.oneOrNone(query, params);
        if (!updateResult) {
          throw new Error('unauthorized');
        }
      }

      // If we have items to assign to the collection
      if (requestBody.items) {
        let currentItems = await t.any(`select item_s3_key from ${process.env.COLLECTIONS_ITEMS_TABLE} where collection_id=$1`, [requestBody.id]);
        currentItems = currentItems.map(e => (e.item_s3_key));

        const
          toBeAdded = requestBody.items.filter((e) => (currentItems.indexOf(e) < 0)),
          toBeRemoved = currentItems.filter((e) => (requestBody.items.indexOf(e) < 0));

        if (toBeAdded.length > 0) {
          const
            SQL_INSERTS: string[] = toBeAdded.map((item, index) => {
              return `($1, $${index + 2})`;
            }),
            addQuery = `INSERT INTO ${process.env.COLLECTIONS_ITEMS_TABLE} (collection_id, item_s3_key) VALUES ${SQL_INSERTS.join(', ')}`,
            addParams = [requestBody.id, ...toBeAdded];

          await t.any(addQuery, addParams);
        }

        if (toBeRemoved.length > 0) {
          const
            SQL_REMOVES: string[] = toBeRemoved.map((item, index) => {
              return `$${index + 2}`;
            }),
            removeQuery = `DELETE from ${process.env.COLLECTIONS_ITEMS_TABLE}  where collection_id =$1 and item_s3_key in (${SQL_REMOVES.join(', ')})`,
            removeParams = [requestBody.id, ...toBeRemoved];

          await t.any(removeQuery, removeParams);
        }
      }
      // If we have collections to assign to the collection
      if (requestBody.collections) {
        let currentCollections = await t.any(`select collection_id from ${process.env.COLLECTION_COLLECTIONS_TABLE} where id = $1`, [requestBody.id]);
        currentCollections = currentCollections.map(e => parseInt(e.collection_id, 0));

        const
          toBeAdded = requestBody.collections.filter(e => (currentCollections.indexOf(e) < 0)),
          toBeRemoved = currentCollections.filter(e => (requestBody.collections.indexOf(e) < 0));

        if (toBeAdded.length > 0) {
          const
            SQL_INSERTS: string[] = toBeAdded.map((item, index) => {
              return `($1, $${index + 2})`;
            }),
            addQuery = `INSERT INTO ${process.env.COLLECTION_COLLECTIONS_TABLE} (id, collection_id) VALUES ${SQL_INSERTS.join(', ')}`,
            addParams = [requestBody.id, ...toBeAdded];

          await t.any(addQuery, addParams);
        }

        if (toBeRemoved.length > 0) {
          const
            SQL_REMOVES: string[] = toBeRemoved.map((v, index) => (`$${index + 2}`)),
            removeQuery = `DELETE from ${process.env.COLLECTION_COLLECTIONS_TABLE} where id = $1 and collection_id in (${SQL_REMOVES.join(', ')})`,
            removeParams = [requestBody.id, ...toBeRemoved];

          await t.any(removeQuery, removeParams);
        }
      }
    });

    return {
      body: JSON.stringify({ success: true }),
      headers: headers,
      statusCode: 200
    };

  } catch (e) {
    if (e.message === 'Nothing to update') {
      return badRequestResponse(e.message);
    } else if (e.message === 'unauthorized') {
      return unAuthorizedRequestResponse('You are not a contributor for this collection');
    } else {
      console.log('src/collections/model/update ERROR - ', !e.isJoi ? e : e.details);
      return badRequestResponse();
    }
  }
};

export const deleteCollection = async (id, isAdmin: boolean, userId?: string) => {
  try {

    const params = [id];
    let query = `DELETE FROM ${process.env.COLLECTIONS_TABLE}
          WHERE id = $1 `;
    if (!isAdmin) {
      params.push(userId);
      query += ` and contributors = ARRAY [$2::uuid] `;
    }
    query += ` returning id;`;

    await db.task(async t => {
      const deleteResult = await t.oneOrNone(query, params);
      if (!deleteResult) {
        throw new Error('unauthorized');
      }
      // We run the second delete query if for any reason the initial doesn't cascade.
      let query2 = `DELETE FROM ${process.env.COLLECTIONS_ITEMS_TABLE}
            WHERE collection_id = $1 `;
      await t.any(query2, [id]);

    });

    return {
      body: 'true',
      headers: headers,
      statusCode: 200
    };
  } catch (e) {
    if (e.message === 'unauthorized') {
      return unAuthorizedRequestResponse('You are not a contributor for this collection');
    } else {
      console.log('src/collections/model/deleteCollection ERROR - ', !e.isJoi ? e : e.details);
      return badRequestResponse();
    }
  }
};

export const get = async (requestBody, isAdmin: boolean = false, userId?: string, inputQuery?: string, order?: string, byField?: string): Promise<APIGatewayProxyResult> => {
  try {
    const
      defaultValues = { limit: 15, offset: 0 },
      params = [
        limitQuery(requestBody.limit, defaultValues.limit),
        requestBody.offset || defaultValues.offset
      ];

    if (!isAdmin) {
      params.push(userId);
    }
    if (requestBody.id) {
      params.push(requestBody.id);
    }

    console.log(order);

    let orderBy = 'collection.id';
    if (order === 'asc') {
      if (isAdmin) {
        orderBy = '(case when collection.oa_highlight then 1 else 2 end) asc, collection.created_at ASC NULLS LAST';
      } else {
        orderBy = 'collection.created_at ASC NULLS LAST';
      }
    } else if (order === 'desc') {
      if (isAdmin) {
        orderBy = '(case when collection.oa_highlight then 1 else 2 end) asc, collection.created_at DESC NULLS LAST';
      } else {
        orderBy = 'collection.created_at DESC NULLS LAST';
      }
    }

    let searchQuery = '';
    if (inputQuery && inputQuery.length > 0) {
      params.push(inputQuery);
      const paramCount = requestBody.id ? '$4' : (isAdmin ? '$3' : '$4'); // if we have an ID that means input will be 4
      searchQuery = `
        ${requestBody.id ? 'WHERE collection.id != $3 AND (' : isAdmin ? 'WHERE (' : 'AND ('}
          UNACCENT(title) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(subtitle) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(description) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(institution) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(array_to_string(regions, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(location) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(city_of_publication) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(editor) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          ISBN::text LIKE '%' || (${paramCount}) || '%' OR

          UNACCENT(array_to_string(cast_, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(array_to_string(creators, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(array_to_string(directors, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(array_to_string(writers, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(array_to_string(collaborators, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(array_to_string(publisher, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(array_to_string(participants, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(array_to_string(interviewers, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(array_to_string(interviewees, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(array_to_string(host_organisation, '||')) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR

          UNACCENT(concept_tag.tag_name) ILIKE '%' || UNACCENT(${paramCount}) || '%' OR
          UNACCENT(keyword_tag.tag_name) ILIKE '%' || UNACCENT(${paramCount}) || '%'
        )
      `;
    }

    const
      query = `
        SELECT
          COUNT ( collection.id ) OVER (),
          collection.*,

          COALESCE(json_agg(DISTINCT concept_tag.*) FILTER (WHERE concept_tag IS NOT NULL), '[]') AS aggregated_concept_tags,

          COALESCE(json_agg(DISTINCT keyword_tag.*) FILTER (WHERE keyword_tag IS NOT NULL), '[]') AS aggregated_keyword_tags,

          ST_AsText(collection.geom) as geom
        FROM
          ${process.env.COLLECTIONS_TABLE} AS collection,

          UNNEST(CASE WHEN collection.concept_tags <> '{}' THEN collection.concept_tags ELSE '{null}' END) AS concept_tagid
            LEFT JOIN ${process.env.CONCEPT_TAGS_TABLE} AS concept_tag ON concept_tag.id = concept_tagid,

          UNNEST(CASE WHEN collection.keyword_tags <> '{}' THEN collection.keyword_tags ELSE '{null}' END) AS keyword_tagid
            LEFT JOIN ${process.env.KEYWORD_TAGS_TABLE} AS keyword_tag ON keyword_tag.id = keyword_tagid

        ${!isAdmin ? `WHERE $3::uuid = ANY( contributors )` : ''}

        ${!inputQuery && requestBody.id ? `${!isAdmin ? 'AND' : 'WHERE'} collection.id=${!isAdmin ? '$4' : '$3'}` : ''}

        ${inputQuery ? searchQuery : ''}

        GROUP BY collection.id
        ORDER BY ${orderBy}

        LIMIT $1
        OFFSET $2
      `;

    console.log(inputQuery, searchQuery, query, params);

    return successResponse({ data: await dbgeoparse(await db.any(query, params), null) });
  } catch (e) {
    console.log('/collections/collections.get ERROR - ', !e.isJoi ? e : e.details);
    return badRequestResponse();
  }
};
