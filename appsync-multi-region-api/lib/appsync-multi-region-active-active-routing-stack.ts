import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as certificatemaanger from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as path from 'path'

interface AppSyncMultiRegionActiveActiveRoutingStackProps extends cdk.StackProps {
    graphqlAPIDomainNameCertARN?: string,
    todoGlobalAPIDomainName?: string,
    placeholderCFOrigin: string,
    todoAPIHostedZoneID?: string,
    todoAPIHostedZoneName?: string,
    regionLatencyRoutingDNS?: string,
    primaryAppSyncAPIRegionName?: string,
    secondaryAppSyncAPIRegionName?: string,
}
export class AppsyncMultiRegionActiveActiveRoutingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: AppSyncMultiRegionActiveActiveRoutingStackProps) {
      super(scope, id, props);

      const currentGraphqlAPICertARN = props?.graphqlAPIDomainNameCertARN? props.graphqlAPIDomainNameCertARN: ''
      const graphqlAPIDomainNameCert = certificatemaanger.Certificate.fromCertificateArn(this,'GraphqlAPIDomainNameCert', currentGraphqlAPICertARN)
      const currentTodoGlobalAPIDomainName = props?.todoGlobalAPIDomainName? props.todoGlobalAPIDomainName: ''
      const currentPlaceholderCFOrigin = props?.placeholderCFOrigin? props.placeholderCFOrigin: ''
      const currentTodoAPIHostedZoneID = props?.todoAPIHostedZoneID? props.todoAPIHostedZoneID:''
      const currentTodoAPIHostedZoneName = props?.todoAPIHostedZoneName? props.todoAPIHostedZoneName:''
      const currentRegionLatencyRoutingDNS = props?.regionLatencyRoutingDNS? props.regionLatencyRoutingDNS:''
      const currentPrimaryAppSyncAPIRegionName = props?.primaryAppSyncAPIRegionName? props.primaryAppSyncAPIRegionName:''
      const currentSecondaryAppSyncAPIRegionName = props?.secondaryAppSyncAPIRegionName? props.secondaryAppSyncAPIRegionName:''
      
      /** LAMBDA @ EDGE FUNCTION FOR THE CLOUDFRONT DISTRIBUTION ROUTING */
      const routingLambda = new lambda.Function(this, 'TodoAPIRoutingLambda',{
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(path.resolve('./'),'/lambdas/appsync-globalapi-router')),
        tracing: lambda.Tracing.ACTIVE
      });

      /** CLOUDFRONT DISTRIBUTION FOR THE GLOBAL API ENDPOINT */
      const todoAPICFDist = new cloudfront.Distribution(this,'TodoAPICFDist',{
        defaultBehavior: {
            origin: new origins.HttpOrigin(currentPlaceholderCFOrigin),
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
            compress: true,
            smoothStreaming: false,
            cachePolicy:cloudfront.CachePolicy.CACHING_DISABLED,
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

      const todoGlobalAPIDNSConfig = new route53.CnameRecord(this, 'TodoGlobalAPIDNSConfig',{
        recordName: currentTodoGlobalAPIDomainName.split('.')[0],
        zone: todoAPIDomainNameHostedZone,
        domainName: todoAPICFDist.domainName
      })

      /** CREATE LATENCY RECORD SETS */
      const primaryRegionLatencyRoutingConfig = new route53.CfnRecordSet(this, 'PrimaryRegionLatencyRoutingConfig',{
          hostedZoneId: currentTodoAPIHostedZoneID,
          name: currentRegionLatencyRoutingDNS,
          type: route53.RecordType.CNAME,
          region: currentPrimaryAppSyncAPIRegionName,
          setIdentifier: '1',
          resourceRecords: [currentPrimaryAppSyncAPIRegionName],
          ttl: '300'
      })

      const secondaryRegionLatencyRoutingConfig = new route53.CfnRecordSet(this, 'SecondaryRegionLatencyRoutingConfig',{
        hostedZoneId: currentTodoAPIHostedZoneID,
        name: currentRegionLatencyRoutingDNS,
        type: route53.RecordType.CNAME,
        region: currentSecondaryAppSyncAPIRegionName,
        setIdentifier: '2',
        resourceRecords: [currentSecondaryAppSyncAPIRegionName],
        ttl: '300'
      })
    }
}