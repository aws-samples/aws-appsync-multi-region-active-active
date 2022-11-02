// Testing
exports.handler = async (event) => {
    console.log(`event =`, JSON.stringify(event, null, 2));
    const { authorizationToken } = event
    return { 
      isAuthorized: authorizationToken === 'custom-authorized', 
      resolverContext: {} 
    };
  };
  