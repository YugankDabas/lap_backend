const app = require('./app');
const env = require('./config/env');

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Legal Agreement Portal API listening on http://localhost:${env.PORT}`);
});
