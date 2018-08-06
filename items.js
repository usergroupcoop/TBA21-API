const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const docClient = new AWS.DynamoDB.DocumentClient();
const Joi = require('joi');
const uuid = require('uuid/v1');

const ocean = ['Pacific','Atlantic','Indian','Southern','Arctic'];

const headers = {
  "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
  "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
};

const convertToGraph = async function (data) {
  let edges = new Set();
  let nodes = new Set();
  data.Items.map(item  => {
    let itemNodes = []
    item.people.map(person => {
      itemNodes.push({id: person.personId, label: person.personName});
      nodes.add({id: person.personId, label: person.personName});
    });

    // add item as undirected edge between all possible unique pairs of nodes
    // special case: only one person assigned, also attach to 'nobody'
    if (itemNodes.length === 1) {
      nodes.add({id: 'n1', label: 'nobody'}); // for items with only one person attached, need a 'nobody' to attach the other end to.
      edges.add({id: item.itemId, source: itemNodes[0].id, target: 'n1', label: item.description});
    } else {
      // handle all pairs
      for (let i = 0; i < itemNodes.length; i++) {
        for (let j = i + 1; j < itemNodes.length; j++) {
          edges.add({id: item.itemId, source: itemNodes[i].id, target: itemNodes[j].id, label: item.description});
        }
      }
    }
  });
  console.log(nodes); // tslint:disable-line:no-console
  console.log(edges); // tslint:disable-line:no-console

  return {nodes: Array.from(nodes), edges: Array.from(edges)};
};

const addPeopleNames = async (data) => {
  try {
      data.Items = await Promise.all(data.Items.map(async (item) => {
        item.people = await Promise.all(item.people.map(async (person) => {
        let params = {
          TableName: process.env.PEOPLE_TABLE,
          KeyConditionExpression: "personId = :personId",
          ExpressionAttributeValues: {
            ":personId": person.personId
          }
        };
        let result = await docClient.query(params).promise();
        person.personName=result.Items[0].name;
        return person;
      }));
      return item;
    }));
    return data;
  } catch(error) {
    console.log(error);
    return null;
  }
};

module.exports.get = async (event, context, callback) => {
  console.log(event.queryStringParameters);

  try {

    if (event.queryStringParameters === null) {
      let params = {
        TableName : process.env.ITEMS_TABLE,
        ProjectionExpression:"ocean, #tm, itemId, #p, description, #u, people, tags",
        ExpressionAttributeNames:{
          "#p": "position",
          "#u": "url",
          "#tm": "timestamp"
        }
      };

      let data = await docClient.scan(params).promise();
      let withNames = await addPeopleNames(data);

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
        TableName : process.env.ITEMS_TABLE,
        ProjectionExpression:"ocean, #tm, itemId, #p, description, #u, people, tags",
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

      let data = await docClient.query(params).promise();
      let withNames = await addPeopleNames(data);
      const response = {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify(withNames),
      };
      callback(null, response);
    }
  } catch (error) {
    console.log(error);
    const response = {
      statusCode: 503,
      headers: headers,
      body: JSON.stringify({ "message": "Server error " + error.toString() })
    };
    callback(null, response);
  }

};

module.exports.getGraph = async (event, context, callback) => {
  console.log(event.queryStringParameters);

  try {

    if (event.queryStringParameters === null) {
      let params = {
        TableName : process.env.ITEMS_TABLE,
        ProjectionExpression:"ocean, #tm, itemId, #p, description, #u, people, tags",
        ExpressionAttributeNames:{
          "#p": "position",
          "#u": "url",
          "#tm": "timestamp"
        }
      };

      let data = await docClient.scan(params).promise();
      let withNames = await addPeopleNames(data);

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
        TableName : process.env.ITEMS_TABLE,
        ProjectionExpression:"ocean, #tm, itemId, #p, description, #u, people, tags",
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

      let data = await docClient.query(params).promise();
      let withNames = await addPeopleNames(data);
      let asGraph = await convertToGraph(withNames);
      const response = {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify(asGraph),
      };
      callback(null, response);
    }
  } catch (error) {
    console.log(error);
    const response = {
      statusCode: 503,
      headers: headers,
      body: JSON.stringify({ "message": "Server error " + error.toString() })
    };
    callback(null, response);
  }

};

module.exports.post = async (event, context, callback) => {
  try {
    let body = JSON.parse(event.body);

    const schema = Joi.object().keys({
      ocean: Joi.any().valid(ocean).required(),
      description: Joi.string().required(),
      url: Joi.string().uri().required(),
      position: Joi.array().ordered([
        Joi.number().min(-180).max(180).required(),
        Joi.number().min(-90).max(90).required()
      ]),
      tags: Joi.array().items(Joi.string()),
      people: Joi.array().items(Joi.object().keys({
        personId: Joi.string().uuid().required(),
        roles: Joi.array().items(Joi.string()).required(),
      }))
    });

    if (!Joi.validate(body, schema).error) {
      body.itemId = uuid();
      body.timestamp = new Date() / 1000;
      let putParams = {
        TableName: process.env.ITEMS_TABLE,
        Item: body
      };
      let data = await docClient.put(putParams).promise();
      console.log(data);
      const response = {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({ "message": "Item stored"})
      };
      callback(null, response);
    } else {
      console.log(Joi.validate(body, schema).error);
      const response = {
        statusCode: 422,
        headers: headers,
        body: JSON.stringify({ "message": "Bad request, error validating body" })
      };
      callback(null, response);
    }
  } catch (error) {
    console.log(error);
    const response = {
      statusCode: 503,
      headers: headers,
      body: JSON.stringify({ "message": "Server error " + error.toString() })
    };
    callback(null, response);
  }
};

function flattenDeep(arr1) {
   return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
}

module.exports.tags = async (event, context, callback) => {
  try {
    let params = {
      TableName : process.env.ITEMS_TABLE,
      ProjectionExpression:"tags"
    };
    let data = await docClient.scan(params).promise();
    data = Array.from(new Set(flattenDeep(data.Items // remove unique elements from and flatten
      .filter((item) => item.hasOwnProperty('tags')) // remove all items without tags
      .map((item) => item.tags) // now just get the tags
    )));
    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(data),
    };
    callback(null, response);
  } catch (error) {
    console.log(error);
    const response = {
      statusCode: 503,
      headers: headers,
      body: JSON.stringify({ "message": "Server error " + error.toString() })
    };
    callback(null, response);
  }
};
