const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const docClient = new AWS.DynamoDB.DocumentClient();
const Joi = require('joi');
const uuid = require('uuid/v1');

const ocean = ['Pacific','Atlantic','Indian','Southern','Arctic'];

const headers = {
    "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
    "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
};

const addArtistNames = async function(data) {
  try {
    data.Items = await Promise.all(data.Items.map(async (item) => {
      let params = {
        TableName: "tba21-artists",
        KeyConditionExpression: "artistId = :artistId",
        ExpressionAttributeValues: {
          ":artistId": item.artistId
        }
      };
      let result = await docClient.query(params).promise();
      item['artistName']=result.Items[0].name;
      return item;
    }));
    return data;
  }
  catch(error) {
    console.log(error);
    return null;
  }
};

module.exports.get = async function(event, context, callback) {
    console.log(event.queryStringParameters);

    try {

    if (event.queryStringParameters === null) {
      let params = {
          TableName : "tba21",
          ProjectionExpression:"ocean, #tm, itemId, #p, description, #u, artistId",
          ExpressionAttributeNames:{
              "#p": "position",
              "#u": "url",
              "#tm": "timestamp"
          }
      };

      let data = await docClient.scan(params).promise();
      let withNames = await addArtistNames(data);

      const response = {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify(withNames),
      };
      callback(null, response);

    } else if (typeof (event.queryStringParameters.ocean) === 'undefined') {
        const response = {
            statusCode: 400,
            headers: headers,
            body: 'invalid query parameter, try ?ocean=Pacific'
        };
        callback(null,response);
    } else {
        let params = {
            TableName : "tba21",
            ProjectionExpression:"ocean, #tm, itemId, #p, description, #u, artistId",
            KeyConditionExpression: "ocean = :o",
            ExpressionAttributeNames:{
                "#p": "position",
                "#u": "url",
                "#tm": "timestamp"
            },
            ExpressionAttributeValues: {
                ":o": event.queryStringParameters.ocean
            }
        };

        let data = docClient.query(params).promise();
        let withNames = await addArtistNames(data);
        const response = {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(withNames),
        };
        callback(null, response);
      }
    } catch (error) {
      const response = {
          statusCode: 503,
          headers: headers,
          body: JSON.stringify(error),
      };
      callback(null, response);
    }

};

module.exports.post = function(event, context, callback) {
    let body = JSON.parse(event.body);

    const schema = Joi.object().keys({
    ocean: Joi.any().valid(ocean).required(),
    description: Joi.string().required(),
    url: Joi.string().uri().required(),
    position: Joi.array().ordered([
          Joi.number().min(-180).max(180).required(),
          Joi.number().min(-90).max(90).required()
      ]),
    artist: Joi.string()
    });

    if (!Joi.validate(body, schema).error) {
        body.itemId = uuid();
        body.timestamp = new Date() / 1000;
        let putParams = {
          TableName: "tba21",
          Item: body
        };
        docClient.put(putParams, (error) => {
            if (error) {
                    const response = {
                        statusCode: 503,
                        headers: headers,
                        body: JSON.stringify({ "message": "Server error " + error.toString() })
                    };
                    callback(null, response);
                } else {
                    console.log(event);
                    const response = {
                        statusCode: 200,
                        headers: headers,
                        body: JSON.stringify({ "message": "Item stored"})
                    };
                    callback(null, response);
                }
            });
    } else {
        const response = {
            statusCode: 422,
            headers: headers,
            body: JSON.stringify({ "message": "Bad request, error validating body" })
        };
        callback(null, response);
    }

};
