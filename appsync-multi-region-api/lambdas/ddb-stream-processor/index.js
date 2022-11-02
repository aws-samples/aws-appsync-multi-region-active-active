const axios = require('axios');
const gql = require('graphql-tag');
const graphql = require('graphql');
const { print } = graphql;
const util = require('util');

const addTodoGlobalSync = gql`
  mutation AddTodoGlobalSyncMutation($id: ID!, $name: String, $description: String, $priority: Int, $status: TodoStatus) {
    addTodoGlobalSync(input: {id: $id, name: $name, description: $description, priority: $priority, status: $status}) {
      id
      name
      description
      priority
      status
    }
  }
`

const executeMutation = async(id, name, description, priority, status) => {
  console.info("Executing Mutation")
  const mutation = {
    query: print(addTodoGlobalSync),
    variables: {
      name: name,
      id: id,
      description: description,
      priority: parseInt(priority),
      status: status
    },
  };

  try {
    console.info("Attempting Axios")
    let response = await axios({
      url: process.env.AppSyncAPIEndpoint,
      method: 'post',
      headers: {
        'Authorization': process.env.AppSyncAPILambdaAuthKey
      },
      data: JSON.stringify(mutation)
    });
    console.info("Logging Response");
    console.log(response);
  } catch (error) {
    console.info("Error caught")
    throw error;
  }
};

exports.handler = async(event) => {
  for (let record of event.Records) {
    console.info("Printing record")
    console.info(JSON.stringify(record))
    switch (record.eventName) {
      case 'INSERT':
        // Grab the data we need from stream...
        let id = record.dynamodb.Keys.id.S;
        let name = record.dynamodb.NewImage.name.S;
        let description = record.dynamodb.NewImage.description.S;
        let priority = record.dynamodb.NewImage.priority.N;
        let status = record.dynamodb.NewImage.status.S;
        // ... and then execute the publish mutation
        await executeMutation(id, name, description, priority, status);
        break;
      case 'UPDATE':
        break;
      case 'DELETE':
        break;
      default:
        break;
    }
  }
  return { message: `Finished processing ${event.Records.length} records` }
}