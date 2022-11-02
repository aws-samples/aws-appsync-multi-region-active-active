"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppsyncMultiRegionActiveActiveStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const iam = require("aws-cdk-lib/aws-iam");
const appsync = require("@aws-cdk/aws-appsync-alpha");
const certificatemaanger = require("aws-cdk-lib/aws-certificatemanager");
const route53 = require("aws-cdk-lib/aws-route53");
const path = require("path");
class AppsyncMultiRegionActiveActiveStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const currentSecondaryRegion = (props === null || props === void 0 ? void 0 : props.secondaryRegion) ? props.secondaryRegion : '';
        const currentGraphqlAPICertARN = (props === null || props === void 0 ? void 0 : props.graphqlAPIDomainNameCertARN) ? props.graphqlAPIDomainNameCertARN : '';
        const currentAppSyncCustomDomain = (props === null || props === void 0 ? void 0 : props.appSyncCustomDomain) ? props.appSyncCustomDomain : '';
        const currentTodoAPIHostedZoneID = (props === null || props === void 0 ? void 0 : props.todoAPIHostedZoneID) ? props.todoAPIHostedZoneID : '';
        const currentTodoAPIHostedZoneName = (props === null || props === void 0 ? void 0 : props.todoAPIHostedZoneName) ? props.todoAPIHostedZoneName : '';
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
            code: lambda.Code.fromAsset(path.join(path.resolve('./'), '/lambdas/appsync-auth')),
            tracing: lambda.Tracing.ACTIVE
        });
        /** APPSYNC LOG CONFIG */
        const logConfig = {
            excludeVerboseContent: false,
            fieldLogLevel: appsync.FieldLogLevel.ALL,
        };
        /** APPSYNC API */
        const todoGraphQLAPI = new appsync.GraphqlApi(this, 'TodoGraphQLAPI', {
            name: 'TodoGraphQLAPI',
            schema: appsync.Schema.fromAsset(path.join(path.resolve('./'), '/appsync-api/schema.graphql')),
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
        const todoNoneDataSource = todoGraphQLAPI.addNoneDataSource('TodoNoneDataSource');
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
        const graphqlAPIDomainNameCert = certificatemaanger.Certificate.fromCertificateArn(this, 'GraphqlAPIDomainNameCert', currentGraphqlAPICertARN);
        const graphqlAPICustomDomain = new cdk.aws_appsync.CfnDomainName(this, 'GraphqlAPICustomDomain', {
            certificateArn: graphqlAPIDomainNameCert.certificateArn,
            domainName: currentAppSyncCustomDomain
        });
        const appSyncCustomDomainAssoc = new cdk.aws_appsync.CfnDomainNameApiAssociation(this, 'AppSyncCustomDomainAssoc', {
            apiId: todoGraphQLAPI.apiId,
            domainName: graphqlAPICustomDomain.domainName
        });
        appSyncCustomDomainAssoc.addDependsOn(graphqlAPICustomDomain);
        //Adding Route 53 Records for the custom domain
        const todoAPIDomainNameHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'TodoAPIDomainNameHostedZone', {
            hostedZoneId: currentTodoAPIHostedZoneID,
            zoneName: currentTodoAPIHostedZoneName
        });
        const appSyncDNSConfigs = new route53.CnameRecord(this, 'AppSyncDNSConfigs', {
            recordName: currentAppSyncCustomDomain.split('.')[0],
            zone: todoAPIDomainNameHostedZone,
            domainName: graphqlAPICustomDomain.attrAppSyncDomainName
        });
        /**  LAMBDA STREAM PROCESSOR EXECUTION ROLE */
        const todoDDStreamLambdaExecRole = new iam.Role(this, 'TodoDDStreamLambdaExecRole', {
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
            code: lambda.Code.fromAsset(path.join(path.resolve('./'), '/lambdas/ddb-stream-processor')),
            role: todoDDStreamLambdaExecRole,
            environment: {
                'AppSyncAPIEndpoint': todoGraphQLAPI.graphqlUrl,
                'AppSyncAPILambdaAuthKey': 'custom-authorized'
            },
            tracing: lambda.Tracing.ACTIVE
        });
        /**  ADD DYNAMO DB STREAM AS EVENT SOURCE TO LAMBDA */
        todoDDStreamLambda.addEventSource(new aws_lambda_event_sources_1.DynamoEventSource(todoGlobalTable, {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        }));
        /** OUTPUT STACK VALUES */
        const todoTableStreamARN = (todoGlobalTable === null || todoGlobalTable === void 0 ? void 0 : todoGlobalTable.tableStreamArn) ? todoGlobalTable.tableStreamArn : '';
        new cdk.CfnOutput(this, 'API URL', { value: todoGraphQLAPI.graphqlUrl });
        new cdk.CfnOutput(this, 'TODO TABLE STREAM ARN', { value: todoTableStreamARN });
    }
}
exports.AppsyncMultiRegionActiveActiveStack = AppsyncMultiRegionActiveActiveStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwc3luYy1tdWx0aS1yZWdpb24tYWN0aXZlLWFjdGl2ZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcHN5bmMtbXVsdGktcmVnaW9uLWFjdGl2ZS1hY3RpdmUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLGlEQUFpRDtBQUNqRCxtRkFBeUU7QUFDekUscURBQXFEO0FBQ3JELDJDQUEyQztBQUMzQyxzREFBc0Q7QUFDdEQseUVBQXlFO0FBQ3pFLG1EQUFtRDtBQUNuRCw2QkFBNkI7QUFXN0IsTUFBYSxtQ0FBb0MsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNoRSxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdEO1FBQ3hGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsZUFBZSxFQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakYsTUFBTSx3QkFBd0IsR0FBRyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSwyQkFBMkIsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDMUcsTUFBTSwwQkFBMEIsR0FBRyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxtQkFBbUIsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUE7UUFDM0YsTUFBTSwwQkFBMEIsR0FBRyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxtQkFBbUIsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUE7UUFD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Q2hDLFdBQVcsRUFBRTtnQkFDWCxvQkFBb0IsRUFBRSxjQUFjLENBQUMsVUFBVTtnQkFDL0MseUJBQXlCLEVBQUUsbUJBQW1CO2FBQy9DO1lBQ0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTTtTQUMvQixDQUFDLENBQUM7UUFFSCxzREFBc0Q7UUFDdEQsa0JBQWtCLENBQUMsY0FBYyxDQUFDLElBQUksNENBQWlCLENBQUMsZUFBZSxFQUFDO1lBQ3RFLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZO1NBQ3ZELENBQUMsQ0FBQyxDQUFBO1FBRUgsMEJBQTBCO1FBQzFCLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQSxlQUFlLGFBQWYsZUFBZSx1QkFBZixlQUFlLENBQUUsY0FBYyxFQUFBLENBQUMsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFBLENBQUMsQ0FBQSxFQUFFLENBQUE7UUFFN0YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBQyxTQUFTLEVBQUUsRUFBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLFVBQVUsRUFBQyxDQUFDLENBQUE7UUFDckUsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBQyx1QkFBdUIsRUFBRSxFQUFDLEtBQUssRUFBQyxrQkFBa0IsRUFBQyxDQUFDLENBQUE7SUFDN0UsQ0FBQztDQUNGO0FBbkxELGtGQW1MQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IER5bmFtb0V2ZW50U291cmNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ0Bhd3MtY2RrL2F3cy1hcHBzeW5jLWFscGhhJztcbmltcG9ydCAqIGFzIGNlcnRpZmljYXRlbWFhbmdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuaW50ZXJmYWNlIEFwcFN5bmNNdWx0aVJlZ2lvbkFjdGl2ZUFjdGl2ZVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHByaW1hcnlSZWdpb24/OiBzdHJpbmcsXG4gIHNlY29uZGFyeVJlZ2lvbj86IHN0cmluZyxcbiAgYXBwU3luY0N1c3RvbURvbWFpbj86IHN0cmluZyxcbiAgZ3JhcGhxbEFQSURvbWFpbk5hbWVDZXJ0QVJOPzogc3RyaW5nLFxuICB0b2RvQVBJSG9zdGVkWm9uZUlEPzogc3RyaW5nLFxuICB0b2RvQVBJSG9zdGVkWm9uZU5hbWU/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIEFwcHN5bmNNdWx0aVJlZ2lvbkFjdGl2ZUFjdGl2ZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBBcHBTeW5jTXVsdGlSZWdpb25BY3RpdmVBY3RpdmVTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgXG4gICAgY29uc3QgY3VycmVudFNlY29uZGFyeVJlZ2lvbiA9IHByb3BzPy5zZWNvbmRhcnlSZWdpb24/IHByb3BzLnNlY29uZGFyeVJlZ2lvbjogJyc7XG4gICAgY29uc3QgY3VycmVudEdyYXBocWxBUElDZXJ0QVJOID0gcHJvcHM/LmdyYXBocWxBUElEb21haW5OYW1lQ2VydEFSTj8gcHJvcHMuZ3JhcGhxbEFQSURvbWFpbk5hbWVDZXJ0QVJOOiAnJ1xuICAgIGNvbnN0IGN1cnJlbnRBcHBTeW5jQ3VzdG9tRG9tYWluID0gcHJvcHM/LmFwcFN5bmNDdXN0b21Eb21haW4/IHByb3BzLmFwcFN5bmNDdXN0b21Eb21haW46JydcbiAgICBjb25zdCBjdXJyZW50VG9kb0FQSUhvc3RlZFpvbmVJRCA9IHByb3BzPy50b2RvQVBJSG9zdGVkWm9uZUlEPyBwcm9wcy50b2RvQVBJSG9zdGVkWm9uZUlEOicnXG4gICAgY29uc3QgY3VycmVudFRvZG9BUElIb3N0ZWRab25lTmFtZSA9IHByb3BzPy50b2RvQVBJSG9zdGVkWm9uZU5hbWU/IHByb3BzLnRvZG9BUElIb3N0ZWRab25lTmFtZTonJ1xuXG5cbiAgICAvKiogRFlOQU1PREIgR0xPQkFMIFRBQkxFICovXG4gICAgY29uc3QgdG9kb0dsb2JhbFRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdUb2RvR2xvYmFsVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHJlcGxpY2F0aW9uUmVnaW9uczogW2N1cnJlbnRTZWNvbmRhcnlSZWdpb25dLFxuICAgICAgdGFibGVOYW1lOiBcIlRvZG9HbG9iYWxUYWJsZVwiLFxuICAgICAgc3RyZWFtOiBkeW5hbW9kYi5TdHJlYW1WaWV3VHlwZS5ORVdfQU5EX09MRF9JTUFHRVMsXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VEXG4gICAgfSk7XG4gICAgXG4gICAgLyoqIEFQUFNZTkMgTEFNQkRBIEFVVEhPUklaRVIgKi9cbiAgICBjb25zdCBhcHBTeW5jTGFtYmRhQXV0aCA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FwcFN5bmNMYW1iZGFBdXRoJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE2X1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKHBhdGgucmVzb2x2ZSgnLi8nKSwnL2xhbWJkYXMvYXBwc3luYy1hdXRoJykpLFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFXG4gICAgfSk7XG5cbiAgICAvKiogQVBQU1lOQyBMT0cgQ09ORklHICovICAgIFxuICAgIGNvbnN0IGxvZ0NvbmZpZzogYXBwc3luYy5Mb2dDb25maWcgPSB7XG4gICAgICBleGNsdWRlVmVyYm9zZUNvbnRlbnQ6IGZhbHNlLFxuICAgICAgZmllbGRMb2dMZXZlbDogYXBwc3luYy5GaWVsZExvZ0xldmVsLkFMTCxcbiAgICB9OyAgXG5cbiAgICAvKiogQVBQU1lOQyBBUEkgKi9cbiAgICBjb25zdCB0b2RvR3JhcGhRTEFQSSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywnVG9kb0dyYXBoUUxBUEknLCB7XG4gICAgICBuYW1lOiAnVG9kb0dyYXBoUUxBUEknLFxuICAgICAgc2NoZW1hOiBhcHBzeW5jLlNjaGVtYS5mcm9tQXNzZXQocGF0aC5qb2luKHBhdGgucmVzb2x2ZSgnLi8nKSwnL2FwcHN5bmMtYXBpL3NjaGVtYS5ncmFwaHFsJykpLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLkxBTUJEQSxcbiAgICAgICAgICBsYW1iZGFBdXRob3JpemVyQ29uZmlnOiB7XG4gICAgICAgICAgICBoYW5kbGVyOiBhcHBTeW5jTGFtYmRhQXV0aFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGxvZ0NvbmZpZyxcbiAgICAgIHhyYXlFbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdG9kb0R5bmFtb0RCRGF0YVNvdXJjZSA9IHRvZG9HcmFwaFFMQVBJLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnVG9kb0R5bmFtb0RCRGF0YVNvdXJjZScsIHRvZG9HbG9iYWxUYWJsZSk7XG4gICAgY29uc3QgdG9kb05vbmVEYXRhU291cmNlID0gdG9kb0dyYXBoUUxBUEkuYWRkTm9uZURhdGFTb3VyY2UoJ1RvZG9Ob25lRGF0YVNvdXJjZScpXG5cbiAgICAvKiogQVBQU1lOQyBSRVNPTFZFUlMgKi9cbiAgICB0b2RvRHluYW1vREJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnYWRkVG9kbycsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL011dGF0aW9uLkFkZFRvZG8ucmVxLnZ0bCcpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvTXV0YXRpb24uQWRkVG9kby5yZXNwLnZ0bCcpXG4gICAgfSk7XG5cbiAgICB0b2RvRHluYW1vREJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAndXBkYXRlVG9kbycsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL011dGF0aW9uLlVwZGF0ZVRvZG8ucmVxLnZ0bCcpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvTXV0YXRpb24uVXBkYXRlVG9kby5yZXNwLnZ0bCcpXG4gICAgfSk7XG5cbiAgICB0b2RvRHluYW1vREJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZGVsZXRlVG9kbycsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL011dGF0aW9uLkRlbGV0ZVRvZG8ucmVxLnZ0bCcpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvTXV0YXRpb24uRGVsZXRlVG9kby5yZXNwLnZ0bCcpXG4gICAgfSk7XG5cbiAgICB0b2RvTm9uZURhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoe1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdhZGRUb2RvR2xvYmFsU3luYycsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL011dGF0aW9uLkFkZFRvZG9HbG9iYWxTeW5jLnJlcS52dGwnKSxcbiAgICAgIHJlc3BvbnNlTWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL011dGF0aW9uLkFkZFRvZG9HbG9iYWxTeW5jLnJlc3AudnRsJylcbiAgICB9KTtcblxuICAgIHRvZG9Ob25lRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcih7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2RlbGV0ZVRvZG9HbG9iYWxTeW5jJyxcbiAgICAgIHJlcXVlc3RNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvTXV0YXRpb24uRGVsZXRlVG9kb0dsb2JhbFN5bmMucmVxLnZ0bCcpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvTXV0YXRpb24uRGVsZXRlVG9kb0dsb2JhbFN5bmMucmVzcC52dGwnKVxuICAgIH0pO1xuXG4gICAgdG9kb05vbmVEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAndXBkYXRlVG9kb0dsb2JhbFN5bmMnLFxuICAgICAgcmVxdWVzdE1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbUZpbGUoJ2FwcHN5bmMtYXBpL3Jlc29sdmVycy9NdXRhdGlvbi5VcGRhdGVUb2RvR2xvYmFsU3luYy5yZXEudnRsJyksXG4gICAgICByZXNwb25zZU1hcHBpbmdUZW1wbGF0ZTogYXBwc3luYy5NYXBwaW5nVGVtcGxhdGUuZnJvbUZpbGUoJ2FwcHN5bmMtYXBpL3Jlc29sdmVycy9NdXRhdGlvbi5VcGRhdGVUb2RvR2xvYmFsU3luYy5yZXNwLnZ0bCcpXG4gICAgfSk7XG5cbiAgICB0b2RvRHluYW1vREJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0VG9kbycsXG4gICAgICByZXF1ZXN0TWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL1F1ZXJ5LkdldFRvZG8ucmVxLnZ0bCcpLFxuICAgICAgcmVzcG9uc2VNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvUXVlcnkuR2V0VG9kby5yZXNwLnZ0bCcpXG4gICAgfSk7XG5cbiAgICB0b2RvRHluYW1vREJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnbGlzdFRvZG9zJyxcbiAgICAgIHJlcXVlc3RNYXBwaW5nVGVtcGxhdGU6IGFwcHN5bmMuTWFwcGluZ1RlbXBsYXRlLmZyb21GaWxlKCdhcHBzeW5jLWFwaS9yZXNvbHZlcnMvUXVlcnkuTGlzdFRvZG9zLnJlcS52dGwnKSxcbiAgICAgIHJlc3BvbnNlTWFwcGluZ1RlbXBsYXRlOiBhcHBzeW5jLk1hcHBpbmdUZW1wbGF0ZS5mcm9tRmlsZSgnYXBwc3luYy1hcGkvcmVzb2x2ZXJzL1F1ZXJ5Lkxpc3RUb2Rvcy5yZXNwLnZ0bCcpXG4gICAgfSk7XG5cbiAgICAvKiogIENPTkZJR1VSRSBDVVNUT00gRE9NQUlOICovXG4gICAgY29uc3QgZ3JhcGhxbEFQSURvbWFpbk5hbWVDZXJ0ID0gY2VydGlmaWNhdGVtYWFuZ2VyLkNlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCdHcmFwaHFsQVBJRG9tYWluTmFtZUNlcnQnLCBjdXJyZW50R3JhcGhxbEFQSUNlcnRBUk4pXG4gICAgY29uc3QgZ3JhcGhxbEFQSUN1c3RvbURvbWFpbiA9IG5ldyBjZGsuYXdzX2FwcHN5bmMuQ2ZuRG9tYWluTmFtZShcbiAgICAgIHRoaXMsXG4gICAgICAnR3JhcGhxbEFQSUN1c3RvbURvbWFpbicsXG4gICAgICB7XG4gICAgICAgIGNlcnRpZmljYXRlQXJuOiBncmFwaHFsQVBJRG9tYWluTmFtZUNlcnQuY2VydGlmaWNhdGVBcm4sXG4gICAgICAgIGRvbWFpbk5hbWU6IGN1cnJlbnRBcHBTeW5jQ3VzdG9tRG9tYWluXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IGFwcFN5bmNDdXN0b21Eb21haW5Bc3NvYyA9IG5ldyBjZGsuYXdzX2FwcHN5bmMuQ2ZuRG9tYWluTmFtZUFwaUFzc29jaWF0aW9uKFxuICAgICAgdGhpcywgXG4gICAgICAnQXBwU3luY0N1c3RvbURvbWFpbkFzc29jJyxcbiAgICAgIHtcbiAgICAgICAgYXBpSWQ6IHRvZG9HcmFwaFFMQVBJLmFwaUlkLFxuICAgICAgICBkb21haW5OYW1lOiBncmFwaHFsQVBJQ3VzdG9tRG9tYWluLmRvbWFpbk5hbWVcbiAgICAgIH1cbiAgICApO1xuXG4gICAgYXBwU3luY0N1c3RvbURvbWFpbkFzc29jLmFkZERlcGVuZHNPbihncmFwaHFsQVBJQ3VzdG9tRG9tYWluKTtcblxuICAgIC8vQWRkaW5nIFJvdXRlIDUzIFJlY29yZHMgZm9yIHRoZSBjdXN0b20gZG9tYWluXG4gICAgY29uc3QgdG9kb0FQSURvbWFpbk5hbWVIb3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCAnVG9kb0FQSURvbWFpbk5hbWVIb3N0ZWRab25lJywge1xuICAgICAgaG9zdGVkWm9uZUlkOiBjdXJyZW50VG9kb0FQSUhvc3RlZFpvbmVJRCxcbiAgICAgIHpvbmVOYW1lOiBjdXJyZW50VG9kb0FQSUhvc3RlZFpvbmVOYW1lXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcHBTeW5jRE5TQ29uZmlncyA9IG5ldyByb3V0ZTUzLkNuYW1lUmVjb3JkKHRoaXMsICdBcHBTeW5jRE5TQ29uZmlncycse1xuICAgICAgcmVjb3JkTmFtZTogY3VycmVudEFwcFN5bmNDdXN0b21Eb21haW4uc3BsaXQoJy4nKVswXSxcbiAgICAgIHpvbmU6IHRvZG9BUElEb21haW5OYW1lSG9zdGVkWm9uZSxcbiAgICAgIGRvbWFpbk5hbWU6IGdyYXBocWxBUElDdXN0b21Eb21haW4uYXR0ckFwcFN5bmNEb21haW5OYW1lXG4gICAgfSlcblxuXG4gICAgLyoqICBMQU1CREEgU1RSRUFNIFBST0NFU1NPUiBFWEVDVVRJT04gUk9MRSAqL1xuICAgIGNvbnN0IHRvZG9ERFN0cmVhbUxhbWJkYUV4ZWNSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsJ1RvZG9ERFN0cmVhbUxhbWJkYUV4ZWNSb2xlJyx7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FXU0FwcFN5bmNJbnZva2VGdWxsQWNjZXNzJyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQ2xvdWRXYXRjaExvZ3NGdWxsQWNjZXNzJylcbiAgICAgIF1cbiAgICB9KTtcblxuICAgIC8qKiAgTEFNQkRBIFNUUkVBTSBQUk9DRVNTT1IgKi9cbiAgICBjb25zdCB0b2RvRERTdHJlYW1MYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUb2RvRERTdHJlYW1MYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTZfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKCcuLycpLCcvbGFtYmRhcy9kZGItc3RyZWFtLXByb2Nlc3NvcicpKSxcbiAgICAgIHJvbGU6IHRvZG9ERFN0cmVhbUxhbWJkYUV4ZWNSb2xlLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgJ0FwcFN5bmNBUElFbmRwb2ludCc6IHRvZG9HcmFwaFFMQVBJLmdyYXBocWxVcmwsXG4gICAgICAgICdBcHBTeW5jQVBJTGFtYmRhQXV0aEtleSc6ICdjdXN0b20tYXV0aG9yaXplZCdcbiAgICAgIH0sXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkVcbiAgICB9KTtcblxuICAgIC8qKiAgQUREIERZTkFNTyBEQiBTVFJFQU0gQVMgRVZFTlQgU09VUkNFIFRPIExBTUJEQSAqL1xuICAgIHRvZG9ERFN0cmVhbUxhbWJkYS5hZGRFdmVudFNvdXJjZShuZXcgRHluYW1vRXZlbnRTb3VyY2UodG9kb0dsb2JhbFRhYmxlLHtcbiAgICAgIHN0YXJ0aW5nUG9zaXRpb246IGxhbWJkYS5TdGFydGluZ1Bvc2l0aW9uLlRSSU1fSE9SSVpPTixcbiAgICB9KSlcblxuICAgIC8qKiBPVVRQVVQgU1RBQ0sgVkFMVUVTICovXG4gICAgY29uc3QgdG9kb1RhYmxlU3RyZWFtQVJOID0gdG9kb0dsb2JhbFRhYmxlPy50YWJsZVN0cmVhbUFybj8gdG9kb0dsb2JhbFRhYmxlLnRhYmxlU3RyZWFtQXJuOicnXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCdBUEkgVVJMJywge3ZhbHVlOiB0b2RvR3JhcGhRTEFQSS5ncmFwaHFsVXJsfSlcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCdUT0RPIFRBQkxFIFNUUkVBTSBBUk4nLCB7dmFsdWU6dG9kb1RhYmxlU3RyZWFtQVJOfSlcbiAgfVxufVxuIl19