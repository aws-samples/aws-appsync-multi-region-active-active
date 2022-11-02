#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppsyncMultiRegionActiveActiveStack } from '../lib/appsync-multi-region-active-active-stack';
import { SecondaryAppsyncMultiRegionActiveActiveStack } from '../lib/secondary-appsync-multi-region-active-active-stack';
import { AppsyncMultiRegionActiveActiveRoutingStack } from '../lib/appsync-multi-region-active-active-routing-stack';
import { globalVariables } from '../parameters/globalVariables';

const app = new cdk.App();

new AppsyncMultiRegionActiveActiveStack(app, 'AppsyncMultiRegionActiveActiveStack', {
  env: {region: globalVariables.primaryRegion },
  primaryRegion: globalVariables.primaryRegion,
  secondaryRegion: globalVariables.secondaryRegion,
  appSyncCustomDomain: globalVariables.primaryRegionAppSyncCustomDomain,
  graphqlAPIDomainNameCertARN: globalVariables.domainCertARN,
  todoAPIHostedZoneID: globalVariables.route53HostedZoneID,
  todoAPIHostedZoneName: globalVariables.route53HostedZoneName,
  
});

new SecondaryAppsyncMultiRegionActiveActiveStack(app, 'SecondaryAppsyncMultiRegionActiveActiveStack', {
  env: {region: globalVariables.secondaryRegion },
  primaryRegion: globalVariables.primaryRegion,
  secondaryRegion: globalVariables.secondaryRegion,
  appSyncCustomDomain: globalVariables.secondaryRegionAppSyncCustomDomain,
  graphqlAPIDomainNameCertARN: globalVariables.domainCertARN,
  todoAPIHostedZoneID: globalVariables.route53HostedZoneID,
  todoAPIHostedZoneName: globalVariables.route53HostedZoneName
});


new AppsyncMultiRegionActiveActiveRoutingStack(app, 'AppsyncMultiRegionActiveActiveRoutingStack', {
  env: {region: 'us-east-1' },

  /* Params below are required to configure the CF distribution however the params for Lambda@edge configuration are kept 
  within the lambda package  /lambdas/appsync-globalapi-router/configs.json. This is the because Lambda@edge does not support env. variables
  and given these value don't change frequently, it makes sense to place them within the lambda function vs making a network call which 
  will introduce latency */
  
  graphqlAPIDomainNameCertARN: globalVariables.domainCertARN,
  todoGlobalAPIDomainName: globalVariables.globalAPIEndpoint,
  regionLatencyRoutingDNS: globalVariables.route53RoutingPolicyDomainName,
  placeholderCFOrigin: 'aws.amazon.com', // This parameter is only required because we need to specify an origin so you can use any domain name of your choice. Lambda@Edge will anyway route the traffic to AppSync as the origin
  todoAPIHostedZoneID: globalVariables.route53HostedZoneID,
  todoAPIHostedZoneName: globalVariables.route53HostedZoneName,
  primaryAppSyncAPIRegionName: globalVariables.primaryRegion,
  secondaryAppSyncAPIRegionName: globalVariables.secondaryRegion,

});