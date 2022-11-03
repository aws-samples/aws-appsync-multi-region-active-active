#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Install Lambda Dependencies
cd lambdas/ddb-stream-processor/
npm install

# Build CDK app
cd ../../
npm run build 

# Install jq
sudo yum install jq -y

# Deploy CDK stacks
cdk deploy AppsyncMultiRegionActiveActiveStack
export SECONDARY_REGION=$(aws dynamodb describe-table --region $1 --table-name TodoGlobalTable | jq -r '.Table.Replicas[0].RegionName')
export DYNAMODB_STREAM_ARN_IN_SECONDARY_REGION=$(aws dynamodbstreams list-streams --region $SECONDARY_REGION --table-name TodoGlobalTable | jq -r '.Streams[0].StreamArn'
)
cdk deploy SecondaryAppsyncMultiRegionActiveActiveStack --parameters todoGlobalTableStreamARN=$DYNAMODB_STREAM_ARN_IN_SECONDARY_REGION
cdk deploy AppsyncMultiRegionActiveActiveRoutingStack

# Done
echo "Stacks successfully deployed"
