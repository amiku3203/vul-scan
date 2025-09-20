
const lodash = require('lodash');
const minimist = require('minimist');
const axios = require('axios');
const express = require('express');
const moment = require('moment');

console.log('Demo app with vulnerable dependencies');
console.log('Lodash version:', lodash.VERSION);
console.log('Current time:', moment().format());

const app = express();
const args = minimist(process.argv.slice(2));

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from vulnerable demo app!',
    timestamp: moment().toISOString(),
    args: args
  });
});

const port = args.port || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
