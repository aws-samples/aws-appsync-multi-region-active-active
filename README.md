## AWS AppSync Multi-Region Active Active Deployment

This repository contains two applications
1. [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) app that will create a sample GraphQL schema for a Todo App deployed in AppSync across two AWS Regions

2. A sample React application setup using [AWS Amplify](https://aws.amazon.com/amplify/) that will consume the multi-region active active AppSync API via a single endpoint and showcase how you can query the API endpoint for Queries, Mutations and Subscription

| :exclamation:  This implementation will setup up AppSync in only two AWS regions. If you need to deploy AppSync in 3 or more regions, you will need to follow similar implementation used to deploy in the second region to setup the new regions.   |
|-----------------------------------------|

### High Level Architecture

The architecture diagram below shows what the CDK application will be deploying in your AWS account. AppSync will be deployed in two AWS Regions with [Amazon DynamoDB global tables](https://aws.amazon.com/dynamodb/global-tables/) as the datasource. To setup the routing to a single API endpoint for your clients, we will be using [Amazon CloudFront](https://aws.amazon.com/cloudfront/) configured with [AWS Lambda@Edge](https://aws.amazon.com/lambda/edge/) to route traffic to AppSync endpoints based on the routing policy setup in [Amazon Route 53](https://aws.amazon.com/route53/) (for example latency based routing or weighted routing etc.)

![AppSync Multi-Region Active Active](images/appsync-multi-region-active-active.png?raw=true "AppSync Multi-Region Active Active")

Source [AWS Reference Architecture - Multi-Region GraphQL API with CloudFront](https://d1.awsstatic.com/architecture-diagrams/ArchitectureDiagrams/multi-region-graphQL-api-with-cloudfront-ra.pdf)


## Pre-Requisites
To deploy the CDK app, you will need the following:

1. Command line interface (CLI) to deploy the CDK. You can use a CLI in your location workstation or [AWS Cloud9](https://aws.amazon.com/cloud9/). Follow the guide [here](https://docs.aws.amazon.com/cloud9/latest/user-guide/create-environment-main.html) to launch a new Cloud9 environment

2. CDK version 2 installed. You can use the command below to install CDK.
```bash
npm install -g aws-cdk
```

3. You will need [jq](https://stedolan.github.io/jq/) to filter out outputs from CLI. You can download it [here](https://stedolan.github.io/jq/download/)

4. The CDK app requires the following global parameters
   * A hosted zone in Amazon Route 53. You will need the hosted zone domain name and hosted zone ID
   * Custom domains for AppSync in the two regions. This is usually a subdomain of the hosted zone domain name
   * AWS Region code for the two AppSync regions (for example us-east-1)
   * ARN of the wildcard certificate for the hosted zone domain name created using [Amazon Certificate Manager](https://aws.amazon.com/certificate-manager/)
   * DNS of the global API endpoint that will be used by the client. This is usually a subdomain of the hosted zone domain name
   * DNS for the Amazon Route 53 routing policy. This is usually a subdomain of the hosted zone domain name


To deploy the React app, you will need the following: 

1. AWS Amplify installed using the command below.
```bash
npm install -g @aws-amplify/cli
```

## Setting up the infrastructure
1. Clone the CDK App and install dependencies
```bash
git clone https://github.com/aws-samples/aws-appsync-multi-region-active-active.git
cd aws-appsync-multi-region-active-active/appsync-mutli-region-api
npm install
```

2. Update the global parameters. Note, you only need to create the Hosted Zone in Amazon Route 53, you do not need to create the DNS entries for the other domain name requested below. The CDK App will create the DNS entries in Route 53
   * Navigate to the file `aws-appsync-multi-region-active-active/appsync-mutli-region-api/parameters/globalVariables.ts`
   * Update the parameter values with the values specific to your API and AWS Account
   ```bash
    route53HostedZoneName: '<example.com>',
    route53HostedZoneID:'<XXXXXXXXXXXXXXXXXXXXX>',
    primaryRegionAppSyncCustomDomain: '<primary.example.com>',
    secondaryRegionAppSyncCustomDomain: '<secondary.example.com>',
    primaryRegion: '<region_code>',
    secondaryRegion: '<region_code>',
    domainCertARN:'<certificate_arn>',
    globalAPIEndpoint: '<globalapiendpoint.example.com>',
    route53RoutingPolicyDomainName: '<routingpolicy.example.com>',
    ```
    * Save the changes to the file

3. Boostrap CDK in the target regions by running the commands below. You will need to specify the primary and secondary region code (e.g. eu-west-1 and us-east-1)
```bash
cdk bootstrap <AWS_Account_ID>/<primary_region_code> <AWS_Account_ID>/<secondary_region_code> <AWS_Account_ID>/us-east-1
```

4. Deploy the CDK stacks providing the value for the primary region code (e.g. eu-west-1)
```bash
chmod +x global_appsync_setup.sh
./global_appsync_setup.sh <primary_region_code>
```
   
## Testing your APIs
We will be using [Postman](https://www.postman.com/) to test the API so if not already setup, you can download via the link [here](https://www.postman.com/downloads/)

###  Testing GraphQL Mutation and Query via the Global API endpoint. Find below the settings on Postman to test out GraphQL Mutation.

  1. To test GraphQL Mutation, change the request to "Post" request and paste the global API endpoint URL e.g. "https://todoglobalapi.codeforevery.com/graphql"
  2. Click on the "Header" tab and add the key "Authorization" and the token for your Lambda Authorizer which in this case we are using "custom-authorized"
  ![Postman Header Configs](images/postman-header-config.png?raw=true "Postman Header Configs")
  3. Click on the "Body" tab and past the GraphQL mutation as shown below.
  ![Postman Body Configs](images/postman-body-config.png?raw=true "Postman Body Configs")
  4. You can see the GraphQL response to indicate the mutation is successful as shown below.
  ![Postman GraphQL Response](images/postman-mutation-result.png?raw=true "Postman GraphQL Response")
  5. To test GraphQL Query, you only need to change the "Body" with the GraphQL query which will return the results as shown below
  ![Postman GraphQL Response](images/postman-query-result.png?raw=true "Postman GraphQL Response")

### Testing GraphQL Subscription via the Global API endpoint. Find below the settings on Postman to test out GraphQL Subcription.
  1. Follow the instructions [here](https://blog.postman.com/postman-supports-websocket-apis/) to get started with setting up GraphQL Subscription on Postman
  2. Paste the GraphQL API subscription endpoint as shown below
  ![Postman Subscription URL](images/postman-subscription-url.png?raw=true "Postman Subscription URL")
  3. Click on the "Params" tab and provide the "payload" and "header" params. Follow the documentation [here](https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html) on how these values where derived.
  ![Postman Subscription Params](images/postman-subscription-params.png?raw=true "Postman Subscription Params")
  4. Click on the "Headers" tab and the key as shown in the diagram below
  ![Postman Subscription Headers](images/postman-subscription-headers.png?raw=true "Postman Subscription Headers")
  5. Click on "Connect" button on the right hand corner to establish a subscription connection to one of the AppSync API endpoints. 
  ![Postman Subscription Connect](images/postman-subscription-connection.png?raw=true "Postman Subscription Connect")
  6. Subscribe to the onAddTodo mutation by adding the query below to the "New Message" section as shown below, then click on "Send"
  ```bash
  {"id":"abc123","payload":{"data":"{\"query\":\"subscription MySubscription {\\n onAddTodo {\\n id \\n name \\n description\\n priority\\n status\\n }\\n}\\n\",\"variables\":null}","extensions":{"authorization":{"Authorization":"custom-authorized","host":"todoglobalapi.codeforevery.com"}}},"type":"start"}
  ```
  ![Postman Subscription Subscribe](images/postman-subscription-query.png?raw=true "Postman Subscription Subscribe")
  7. Send the message show below to initialize the connection. 
  ![Postman Subscription Init Connect](images/postman-subscription-init-connection.png?raw=true "Postman Subscription Init Connect")
  8. Create a new todo via a GraphQL mutation as described above and you will be able to see a new notification with the details of the new todo as shown below.
  ![Postman Subscription Notification](images/postman-subscription-notification.png?raw=true "Postman Subscription Notification")


## Setting up the Sample Todo App

1. Navigate to the Todo App directory
```bash
cd aws-appsync-multi-region-active-active/sample-todo-app
```

2. Install dependencies
```bash
npm install
```

3. Initialize Amplify and use the default options
```bash
amplify init
```

4. Use Amplify to generate the GraphQL statements for Query, Mutation and Subscription. Replace the API ID with the AppSync API ID from one of the regions. While running the command you will need to specify the `region` the API is deployed and you can generate the code in `javascript`. Leave other options as default.
```bash
amplify add codegen --apiId <APPSYNC_API_ID_FROM_ONE_REGION>
```

5. Update `aws-exports.js` file with the configuration for the API. The region can be one of the regions where your AppSync endpoint is deployed (not used). See below sample content for the file.

```bash
const awsmobile = {
    "aws_project_region": "<one_of_the_appsync_regions>",
    "aws_appsync_graphqlEndpoint": "<global_api_endpoint>",
    "aws_appsync_region": "<one_of_the_appsync_regions>",
    "aws_appsync_authenticationType": "AWS_LAMBDA"
};
export default awsmobile;
```

6. Launch the Todo App.
```bash
npm run start
```

7. Create new todos and observe new todos created via GraphQL Subscription
![Sample Todo App](images/sample-todo-app.png?raw=true "Sample Todo App")


## Clean up
Run the command below to clean up the stacks created.
```bash
cd aws-appsync-multi-region-active-active/appsync-mutli-region-api
chmod +x global_appsync_cleanup.sh
./global_appsync_cleanup.sh
```