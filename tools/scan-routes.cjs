const fs = require('fs');

const content = fs.readFileSync('backend/src/express-app.ts', 'utf8');

const regex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"](?:,\s*([^,]+))?/g;
let match;
const routes = [];
while ((match = regex.exec(content)) !== null) {
  routes.push({
    method: match[1].toUpperCase(),
    path: match[2],
    middleware: match[3] ? match[3].trim() : 'none',
  });
}

console.log(`Discovered ${routes.length} routes in backend/src/express-app.ts:`);
console.log(JSON.stringify(routes, null, 2));

