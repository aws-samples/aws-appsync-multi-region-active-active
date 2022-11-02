import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as certificatemaanger from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as path from 'path';

interface AppSyncMultiRegionActiveActiveStackProps extends cdk.StackProps {
  primaryRegion?: string,
  secondaryRegion?: string,
  appSyncCustomDomain?: string,
  graphqlAPIDomainNameCertARN?: string,
  todoAPIHostedZoneID?: string,
  todoAPIHostedZoneName?: string
}

export class AppsyncMultiRegionActiveActiveStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppSyncMultiRegionActiveActiveStackProps) {
    super(scope, id, props);
    
    const currentSecondaryRegion = props?.secondaryRegion? props.secondaryRegion: '';
    const currentGraphqlAPICertARN = props?.graphqlAPIDomainNameCertARN? props.graphqlAPIDomainNameCertARN: ''
    const currentAppSyncCustomDomain = props?.appSyncCustomDomain? props.appSyncCustomDomain:''
    const currentTodoAPIHostedZoneID = props?.todoAPIHostedZoneID? props.todoAPIHostedZoneID:''
    const currentTodoAPIHostedZoneName = props?.todoAPIHostedZoneName? props.todoAPIHostedZoneName:''


    /** DYNAMODB GLOBAL TABLE */
    const todoGlobalTable = new dynamodb.Table(this, 'TodoGlobalTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      replicationRegions: [currentSecondaryRegion],
      tableName: "TodoGlobalTable",
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED
    });
    
    /** APPSYNC LAMBDA AUTHORIZER */
    const appSyncLambdaAuth = new lambda.Function(this, 'AppSyncLambdaAuth', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(path.resolve('./'),'/lambdas/appsync-auth')),
      tracing: lambda.Tracing.ACTIVE
    });

    /** APPSYNC LOG CONFIG */    
    const logConfig: appsync.LogConfig = {
      excludeVerboseContent: false,
      fieldLogLevel: appsync.FieldLogLevel.ALL,
    };  

    /** APPSYNC API */
    const todoGraphQLAPI = new appsync.GraphqlApi(this,'TodoGraphQLAPI', {
      name: 'TodoGraphQLAPI',
      schema: appsync.Schema.fromAsset(path.join(path.resolve('./'),'/appsync-api/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.LAMBDA,
          lambdaAuthorizerConfig: {
            handler: appSyncLambdaAuth
          }
        }
      },
      logConfig,
      xrayEnabled: true,
    });

    const todoDynamoDBDataSource = todoGraphQLAPI.addDynamoDbDataSource('TodoDynamoDBDataSource', todoGlobalTable);
    const todoNoneDataSource = todoGraphQLAPI.addNoneDataSource('TodoNoneDataSource')

    /** APPSYNC RESOLVERS */
    todoDynamoDBDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'addTodo',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.AddTodo.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.AddTodo.resp.vtl')
    });

    todoDynamoDBDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateTodo',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.UpdateTodo.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.UpdateTodo.resp.vtl')
    });

    todoDynamoDBDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'deleteTodo',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.DeleteTodo.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.DeleteTodo.resp.vtl')
    });

    todoNoneDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'addTodoGlobalSync',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.AddTodoGlobalSync.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.AddTodoGlobalSync.resp.vtl')
    });

    todoNoneDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'deleteTodoGlobalSync',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.DeleteTodoGlobalSync.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.DeleteTodoGlobalSync.resp.vtl')
    });

    todoNoneDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateTodoGlobalSync',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.UpdateTodoGlobalSync.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Mutation.UpdateTodoGlobalSync.resp.vtl')
    });

    todoDynamoDBDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'getTodo',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Query.GetTodo.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Query.GetTodo.resp.vtl')
    });

    todoDynamoDBDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'listTodos',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Query.ListTodos.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('appsync-api/resolvers/Query.ListTodos.resp.vtl')
    });

    /**  CONFIGURE CUSTOM DOMAIN */
    const graphqlAPIDomainNameCert = certificatemaanger.Certificate.fromCertificateArn(this,'GraphqlAPIDomainNameCert', currentGraphqlAPICertARN)
    const graphqlAPICustomDomain = new cdk.aws_appsync.CfnDomainName(
      this,
      'GraphqlAPICustomDomain',
      {
        certificateArn: graphqlAPIDomainNameCert.certificateArn,
        domainName: currentAppSyncCustomDomain
      }
    );

    const appSyncCustomDomainAssoc = new cdk.aws_appsync.CfnDomainNameApiAssociation(
      this, 
      'AppSyncCustomDomainAssoc',
      {
        apiId: todoGraphQLAPI.apiId,
        domainName: graphqlAPICustomDomain.domainName
      }
    );

    appSyncCustomDomainAssoc.addDependsOn(graphqlAPICustomDomain);

    //Adding Route 53 Records for the custom domain
    const todoAPIDomainNameHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'TodoAPIDomainNameHostedZone', {
      hostedZoneId: currentTodoAPIHostedZoneID,
      zoneName: currentTodoAPIHostedZoneName
    });

    const appSyncDNSConfigs = new route53.CnameRecord(this, 'AppSyncDNSConfigs',{
      recordName: currentAppSyncCustomDomain.split('.')[0],
      zone: todoAPIDomainNameHostedZone,
      domainName: graphqlAPICustomDomain.attrAppSyncDomainName
    })


    /**  LAMBDA STREAM PROCESSOR EXECUTION ROLE */
    const todoDDStreamLambdaExecRole = new iam.Role(this,'TodoDDStreamLambdaExecRole',{
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSAppSyncInvokeFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
      ]
    });

    /**  LAMBDA STREAM PROCESSOR */
    const todoDDStreamLambda = new lambda.Function(this, 'TodoDDStreamLambda', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(path.resolve('./'),'/lambdas/ddb-stream-processor')),
      role: todoDDStreamLambdaExecRole,
      environment: {
        'AppSyncAPIEndpoint': todoGraphQLAPI.graphqlUrl,
        'AppSyncAPILambdaAuthKey': 'custom-authorized'
      },
      tracing: lambda.Tracing.ACTIVE
    });

    /**  ADD DYNAMO DB STREAM AS EVENT SOURCE TO LAMBDA */
    todoDDStreamLambda.addEventSource(new DynamoEventSource(todoGlobalTable,{
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }))

    /** OUTPUT STACK VALUES */
    const todoTableStreamARN = todoGlobalTable?.tableStreamArn? todoGlobalTable.tableStreamArn:''

    new cdk.CfnOutput(this,'API URL', {value: todoGraphQLAPI.graphqlUrl})
    new cdk.CfnOutput(this,'TODO TABLE STREAM ARN', {value:todoTableStreamARN})
  }
}
