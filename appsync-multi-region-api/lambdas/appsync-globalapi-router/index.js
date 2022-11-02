const dns = require('dns');
const routingConfigs = require('./configs.json')

let bestOrigin;
let expires = 0;
let TTL = 1;
let DNS_HOST = routingConfigs.regionLatencyRoutingDNS;

function getBestRegion() {
    console.log("inside resolver");
    const now = Date.now();
    if (now < expires)
        return Promise.resolve(bestOrigin);
    return new Promise((resolve, reject) => {
        dns.resolveCname(DNS_HOST, (err, addr) => {
            bestOrigin = addr[0];
            expires = now + TTL;
            resolve(bestOrigin);
        });
    });
}

let regions = []; // use lowercase.
    
regions[routingConfigs.primaryAppSyncAPIRegionName] = { "Host": routingConfigs.primaryAppSyncAPICustomDomain};
regions[routingConfigs.secondaryAppSyncAPIRegionName] = { "Host": routingConfigs.secondaryAppSyncAPICustomDomain};
    
function getRegionalSettings(bestRegion){
    return regions[bestRegion];
}

exports.handler = async (event, context, callback) => { 
    const request = event.Records[0].cf.request;
    console.log("request-before: "+JSON.stringify(request));
    
    let bestRegion = await getBestRegion();
    console.log("best region: "+bestOrigin);
    
    let map = getRegionalSettings(bestRegion);
    console.log("regional settings: "+JSON.stringify(map));
    
    let target_domain = map["Host"];
    
    console.log("request origin: "+JSON.stringify(request.origin));
   
    // Forward GraphQL subscription requests for WebSockets.
    request.origin.custom.domainName = target_domain;
    
    // Forward REST and GraphQL query/mutation requests.
    request.headers["host"] = [{ 
        key: "host", 
        value: target_domain 
    }];
     console.log("request-after: "+JSON.stringify(request));
    
    console.log(` Request headers set to "${request.headers}"`);
    callback(null, request);
};