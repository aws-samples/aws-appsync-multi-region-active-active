# Deploy CDK stacks
cdk destroy AppsyncMultiRegionActiveActiveRoutingStack
cdk destroy SecondaryAppsyncMultiRegionActiveActiveStack
cdk destroy AppsyncMultiRegionActiveActiveStack

# Done
echo "Stacks successfully destroyed"
