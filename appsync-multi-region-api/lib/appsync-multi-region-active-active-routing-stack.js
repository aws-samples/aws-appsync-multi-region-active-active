"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppsyncMultiRegionActiveActiveRoutingStack = void 0;
const cdk = require("aws-cdk-lib");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const lambda = require("aws-cdk-lib/aws-lambda");
const certificatemaanger = require("aws-cdk-lib/aws-certificatemanager");
const route53 = require("aws-cdk-lib/aws-route53");
const path = require("path");
class AppsyncMultiRegionActiveActiveRoutingStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const currentGraphqlAPICertARN = (props === null || props === void 0 ? void 0 : props.graphqlAPIDomainNameCertARN) ? props.graphqlAPIDomainNameCertARN : '';
        const graphqlAPIDomainNameCert = certificatemaanger.Certificate.fromCertificateArn(this, 'GraphqlAPIDomainNameCert', currentGraphqlAPICertARN);
        const currentTodoGlobalAPIDomainName = (props === null || props === void 0 ? void 0 : props.todoGlobalAPIDomainName) ? props.todoGlobalAPIDomainName : '';
        const currentPlaceholderCFOrigin = (props === null || props === void 0 ? void 0 : props.placeholderCFOrigin) ? props.placeholderCFOrigin : '';
        const currentTodoAPIHostedZoneID = (props === null || props === void 0 ? void 0 : props.todoAPIHostedZoneID) ? props.todoAPIHostedZoneID : '';
        const currentTodoAPIHostedZoneName = (props === null || props === void 0 ? void 0 : props.todoAPIHostedZoneName) ? props.todoAPIHostedZoneName : '';
        const currentRegionLatencyRoutingDNS = (props === null || props === void 0 ? void 0 : props.regionLatencyRoutingDNS) ? props.regionLatencyRoutingDNS : '';
        const currentPrimaryAppSyncAPIRegionName = (props === null || props === void 0 ? void 0 : props.primaryAppSyncAPIRegionName) ? props.primaryAppSyncAPIRegionName : '';
        const currentSecondaryAppSyncAPIRegionName = (props === null || props === void 0 ? void 0 : props.secondaryAppSyncAPIRegionName) ? props.secondaryAppSyncAPIRegionName : '';
        /** LAMBDA @ EDGE FUNCTION FOR THE CLOUDFRONT DISTRIBUTION ROUTING */
        const routingLambda = new lambda.Function(this, 'TodoAPIRoutingLambda', {
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(path.resolve('./'), '/lambdas/appsync-globalapi-router')),
            tracing: lambda.Tracing.ACTIVE
        });
        /** CLOUDFRONT DISTRIBUTION FOR THE GLOBAL API ENDPOINT */
        const todoAPICFDist = new cloudfront.Distribution(this, 'TodoAPICFDist', {
            defaultBehavior: {
                origin: new origins.HttpOrigin(currentPlaceholderCFOrigin),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
                compress: true,
                smoothStreaming: false,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
                edgeLambdas: [
                    {
                        functionVersion: routingLambda.currentVersion,
                        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                        includeBody: true,
                    }
                ]
            },
            certificate: graphqlAPIDomainNameCert,
            domainNames: [currentTodoGlobalAPIDomainName]
        });
        /** ROUTE 53 CONFIGS FOR THE GLOBAL API ENDPOINT AND APPSYNC CUSTOM DOMAINS */
        const todoAPIDomainNameHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'TodoAPIDomainNameHostedZone', {
            hostedZoneId: currentTodoAPIHostedZoneID,
            zoneName: currentTodoAPIHostedZoneName
        });
        const todoGlobalAPIDNSConfig = new route53.CnameRecord(this, 'TodoGlobalAPIDNSConfig', {
            recordName: currentTodoGlobalAPIDomainName.split('.')[0],
            zone: todoAPIDomainNameHostedZone,
            domainName: todoAPICFDist.domainName
        });
        /** CREATE LATENCY RECORD SETS */
        const primaryRegionLatencyRoutingConfig = new route53.CfnRecordSet(this, 'PrimaryRegionLatencyRoutingConfig', {
            hostedZoneId: currentTodoAPIHostedZoneID,
            name: currentRegionLatencyRoutingDNS,
            type: route53.RecordType.CNAME,
            region: currentPrimaryAppSyncAPIRegionName,
            setIdentifier: '1',
            resourceRecords: [currentPrimaryAppSyncAPIRegionName],
            ttl: '300'
        });
        const secondaryRegionLatencyRoutingConfig = new route53.CfnRecordSet(this, 'SecondaryRegionLatencyRoutingConfig', {
            hostedZoneId: currentTodoAPIHostedZoneID,
            name: currentRegionLatencyRoutingDNS,
            type: route53.RecordType.CNAME,
            region: currentSecondaryAppSyncAPIRegionName,
            setIdentifier: '2',
            resourceRecords: [currentSecondaryAppSyncAPIRegionName],
            ttl: '300'
        });
    }
}
exports.AppsyncMultiRegionActiveActiveRoutingStack = AppsyncMultiRegionActiveActiveRoutingStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwc3luYy1tdWx0aS1yZWdpb24tYWN0aXZlLWFjdGl2ZS1yb3V0aW5nLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwc3luYy1tdWx0aS1yZWdpb24tYWN0aXZlLWFjdGl2ZS1yb3V0aW5nLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELGlEQUFpRDtBQUNqRCx5RUFBeUU7QUFDekUsbURBQW1EO0FBQ25ELDZCQUE0QjtBQVk1QixNQUFhLDBDQUEyQyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3JFLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUQ7UUFDL0YsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSx3QkFBd0IsR0FBRyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSwyQkFBMkIsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDMUcsTUFBTSx3QkFBd0IsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFDLDBCQUEwQixFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFDN0ksTUFBTSw4QkFBOEIsR0FBRyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSx1QkFBdUIsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDeEcsTUFBTSwwQkFBMEIsR0FBRyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxtQkFBbUIsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDNUYsTUFBTSwwQkFBMEIsR0FBRyxDQUFBLEtBQUssYUFB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LENBQUMsVUFBVTtTQUNyQyxDQUFDLENBQUE7UUFFRixpQ0FBaUM7UUFDakMsTUFBTSxpQ0FBaUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLG1DQUFtQyxFQUFDO1lBQ3pHLFlBQVksRUFBRSwwQkFBMEI7WUFDeEMsSUFBSSxFQUFFLDhCQUE4QjtZQUNwQyxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLO1lBQzlCLE1BQU0sRUFBRSxrQ0FBa0M7WUFDMUMsYUFBYSxFQUFFLEdBQUc7WUFDbEIsZUFBZSxFQUFFLENBQUMsa0NBQWtDLENBQUM7WUFDckQsR0FBRyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUE7UUFFRixNQUFNLG1DQUFtQyxHQUFHLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUscUNBQXFDLEVBQUM7WUFDL0csWUFBWSxFQUFFLDBCQUEwQjtZQUN4QyxJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUs7WUFDOUIsTUFBTSxFQUFFLG9DQUFvQztZQUM1QyxhQUFhLEVBQUUsR0FBRztZQUNsQixlQUFlLEVBQUUsQ0FBQyxvQ0FBb0MsQ0FBQztZQUN2RCxHQUFHLEVBQUUsS0FBSztTQUNYLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDSjtBQTdFRCxnR0E2RUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBjZXJ0aWZpY2F0ZW1hYW5nZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuaW50ZXJmYWNlIEFwcFN5bmNNdWx0aVJlZ2lvbkFjdGl2ZUFjdGl2ZVJvdXRpbmdTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAgIGdyYXBocWxBUElEb21haW5OYW1lQ2VydEFSTj86IHN0cmluZyxcbiAgICB0b2RvR2xvYmFsQVBJRG9tYWluTmFtZT86IHN0cmluZyxcbiAgICBwbGFjZWhvbGRlckNGT3JpZ2luOiBzdHJpbmcsXG4gICAgdG9kb0FQSUhvc3RlZFpvbmVJRD86IHN0cmluZyxcbiAgICB0b2RvQVBJSG9zdGVkWm9uZU5hbWU/OiBzdHJpbmcsXG4gICAgcmVnaW9uTGF0ZW5jeVJvdXRpbmdETlM/OiBzdHJpbmcsXG4gICAgcHJpbWFyeUFwcFN5bmNBUElSZWdpb25OYW1lPzogc3RyaW5nLFxuICAgIHNlY29uZGFyeUFwcFN5bmNBUElSZWdpb25OYW1lPzogc3RyaW5nLFxufVxuZXhwb3J0IGNsYXNzIEFwcHN5bmNNdWx0aVJlZ2lvbkFjdGl2ZUFjdGl2ZVJvdXRpbmdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBBcHBTeW5jTXVsdGlSZWdpb25BY3RpdmVBY3RpdmVSb3V0aW5nU3RhY2tQcm9wcykge1xuICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAgIGNvbnN0IGN1cnJlbnRHcmFwaHFsQVBJQ2VydEFSTiA9IHByb3BzPy5ncmFwaHFsQVBJRG9tYWluTmFtZUNlcnRBUk4/IHByb3BzLmdyYXBocWxBUElEb21haW5OYW1lQ2VydEFSTjogJydcbiAgICAgIGNvbnN0IGdyYXBocWxBUElEb21haW5OYW1lQ2VydCA9IGNlcnRpZmljYXRlbWFhbmdlci5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywnR3JhcGhxbEFQSURvbWFpbk5hbWVDZXJ0JywgY3VycmVudEdyYXBocWxBUElDZXJ0QVJOKVxuICAgICAgY29uc3QgY3VycmVudFRvZG9HbG9iYWxBUElEb21haW5OYW1lID0gcHJvcHM/LnRvZG9HbG9iYWxBUElEb21haW5OYW1lPyBwcm9wcy50b2RvR2xvYmFsQVBJRG9tYWluTmFtZTogJydcbiAgICAgIGNvbnN0IGN1cnJlbnRQbGFjZWhvbGRlckNGT3JpZ2luID0gcHJvcHM/LnBsYWNlaG9sZGVyQ0ZPcmlnaW4/IHByb3BzLnBsYWNlaG9sZGVyQ0ZPcmlnaW46ICcnXG4gICAgICBjb25zdCBjdXJyZW50VG9kb0FQSUhvc3RlZFpvbmVJRCA9IHByb3BzPy50b2RvQVBJSG9zdGVkWm9uZUlEPyBwcm9wcy50b2RvQVBJSG9zdGVkWm9uZUlEOicnXG4gICAgICBjb25zdCBjdXJyZW50VG9kb0FQSUhvc3RlZFpvbmVOYW1lID0gcHJvcHM/LnRvZG9BUElIb3N0ZWRab25lTmFtZT8gcHJvcHMudG9kb0FQSUhvc3RlZFpvbmVOYW1lOicnXG4gICAgICBjb25zdCBjdXJyZW50UmVnaW9uTGF0ZW5jeVJvdXRpbmdETlMgPSBwcm9wcz8ucmVnaW9uTGF0ZW5jeVJvdXRpbmdETlM/IHByb3BzLnJlZ2lvbkxhdGVuY3lSb3V0aW5nRE5TOicnXG4gICAgICBjb25zdCBjdXJyZW50UHJpbWFyeUFwcFN5bmNBUElSZWdpb25OYW1lID0gcHJvcHM/LnByaW1hcnlBcHBTeW5jQVBJUmVnaW9uTmFtZT8gcHJvcHMucHJpbWFyeUFwcFN5bmNBUElSZWdpb25OYW1lOicnXG4gICAgICBjb25zdCBjdXJyZW50U2Vjb25kYXJ5QXBwU3luY0FQSVJlZ2lvbk5hbWUgPSBwcm9wcz8uc2Vjb25kYXJ5QXBwU3luY0FQSVJlZ2lvbk5hbWU/IHByb3BzLnNlY29uZGFyeUFwcFN5bmNBUElSZWdpb25OYW1lOicnXG4gICAgICBcbiAgICAgIC8qKiBMQU1CREEgQCBFREdFIEZVTkNUSU9OIEZPUiBUSEUgQ0xPVURGUk9OVCBESVNUUklCVVRJT04gUk9VVElORyAqL1xuICAgICAgY29uc3Qgcm91dGluZ0xhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RvZG9BUElSb3V0aW5nTGFtYmRhJyx7XG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNl9YLFxuICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4ocGF0aC5yZXNvbHZlKCcuLycpLCcvbGFtYmRhcy9hcHBzeW5jLWdsb2JhbGFwaS1yb3V0ZXInKSksXG4gICAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRVxuICAgICAgfSk7XG5cbiAgICAgIC8qKiBDTE9VREZST05UIERJU1RSSUJVVElPTiBGT1IgVEhFIEdMT0JBTCBBUEkgRU5EUE9JTlQgKi9cbiAgICAgIGNvbnN0IHRvZG9BUElDRkRpc3QgPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywnVG9kb0FQSUNGRGlzdCcse1xuICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuSHR0cE9yaWdpbihjdXJyZW50UGxhY2Vob2xkZXJDRk9yaWdpbiksXG4gICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19BTEwsXG4gICAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5BTExPV19BTEwsXG4gICAgICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgICAgIHNtb290aFN0cmVhbWluZzogZmFsc2UsXG4gICAgICAgICAgICBjYWNoZVBvbGljeTpjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfRElTQUJMRUQsXG4gICAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUixcbiAgICAgICAgICAgIGVkZ2VMYW1iZGFzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvblZlcnNpb246IHJvdXRpbmdMYW1iZGEuY3VycmVudFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50VHlwZTogY2xvdWRmcm9udC5MYW1iZGFFZGdlRXZlbnRUeXBlLk9SSUdJTl9SRVFVRVNULFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlQm9keTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGNlcnRpZmljYXRlOiBncmFwaHFsQVBJRG9tYWluTmFtZUNlcnQsXG4gICAgICAgIGRvbWFpbk5hbWVzOiBbY3VycmVudFRvZG9HbG9iYWxBUElEb21haW5OYW1lXVxuICAgICAgfSk7XG5cbiAgICAgIC8qKiBST1VURSA1MyBDT05GSUdTIEZPUiBUSEUgR0xPQkFMIEFQSSBFTkRQT0lOVCBBTkQgQVBQU1lOQyBDVVNUT00gRE9NQUlOUyAqL1xuICAgICAgY29uc3QgdG9kb0FQSURvbWFpbk5hbWVIb3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCAnVG9kb0FQSURvbWFpbk5hbWVIb3N0ZWRab25lJywge1xuICAgICAgICBob3N0ZWRab25lSWQ6IGN1cnJlbnRUb2RvQVBJSG9zdGVkWm9uZUlELFxuICAgICAgICB6b25lTmFtZTogY3VycmVudFRvZG9BUElIb3N0ZWRab25lTmFtZVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHRvZG9HbG9iYWxBUElETlNDb25maWcgPSBuZXcgcm91dGU1My5DbmFtZVJlY29yZCh0aGlzLCAnVG9kb0dsb2JhbEFQSUROU0NvbmZpZycse1xuICAgICAgICByZWNvcmROYW1lOiBjdXJyZW50VG9kb0dsb2JhbEFQSURvbWFpbk5hbWUuc3BsaXQoJy4nKVswXSxcbiAgICAgICAgem9uZTogdG9kb0FQSURvbWFpbk5hbWVIb3N0ZWRab25lLFxuICAgICAgICBkb21haW5OYW1lOiB0b2RvQVBJQ0ZEaXN0LmRvbWFpbk5hbWVcbiAgICAgIH0pXG5cbiAgICAgIC8qKiBDUkVBVEUgTEFURU5DWSBSRUNPUkQgU0VUUyAqL1xuICAgICAgY29uc3QgcHJpbWFyeVJlZ2lvbkxhdGVuY3lSb3V0aW5nQ29uZmlnID0gbmV3IHJvdXRlNTMuQ2ZuUmVjb3JkU2V0KHRoaXMsICdQcmltYXJ5UmVnaW9uTGF0ZW5jeVJvdXRpbmdDb25maWcnLHtcbiAgICAgICAgICBob3N0ZWRab25lSWQ6IGN1cnJlbnRUb2RvQVBJSG9zdGVkWm9uZUlELFxuICAgICAgICAgIG5hbWU6IGN1cnJlbnRSZWdpb25MYXRlbmN5Um91dGluZ0ROUyxcbiAgICAgICAgICB0eXBlOiByb3V0ZTUzLlJlY29yZFR5cGUuQ05BTUUsXG4gICAgICAgICAgcmVnaW9uOiBjdXJyZW50UHJpbWFyeUFwcFN5bmNBUElSZWdpb25OYW1lLFxuICAgICAgICAgIHNldElkZW50aWZpZXI6ICcxJyxcbiAgICAgICAgICByZXNvdXJjZVJlY29yZHM6IFtjdXJyZW50UHJpbWFyeUFwcFN5bmNBUElSZWdpb25OYW1lXSxcbiAgICAgICAgICB0dGw6ICczMDAnXG4gICAgICB9KVxuXG4gICAgICBjb25zdCBzZWNvbmRhcnlSZWdpb25MYXRlbmN5Um91dGluZ0NvbmZpZyA9IG5ldyByb3V0ZTUzLkNmblJlY29yZFNldCh0aGlzLCAnU2Vjb25kYXJ5UmVnaW9uTGF0ZW5jeVJvdXRpbmdDb25maWcnLHtcbiAgICAgICAgaG9zdGVkWm9uZUlkOiBjdXJyZW50VG9kb0FQSUhvc3RlZFpvbmVJRCxcbiAgICAgICAgbmFtZTogY3VycmVudFJlZ2lvbkxhdGVuY3lSb3V0aW5nRE5TLFxuICAgICAgICB0eXBlOiByb3V0ZTUzLlJlY29yZFR5cGUuQ05BTUUsXG4gICAgICAgIHJlZ2lvbjogY3VycmVudFNlY29uZGFyeUFwcFN5bmNBUElSZWdpb25OYW1lLFxuICAgICAgICBzZXRJZGVudGlmaWVyOiAnMicsXG4gICAgICAgIHJlc291cmNlUmVjb3JkczogW2N1cnJlbnRTZWNvbmRhcnlBcHBTeW5jQVBJUmVnaW9uTmFtZV0sXG4gICAgICAgIHR0bDogJzMwMCdcbiAgICAgIH0pXG4gICAgfVxufSJdfQ==