const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrreviewmakernvr = onRequest({"codebase":"default"}, (req, res) => server.then(it => it.handle(req, res)));
  