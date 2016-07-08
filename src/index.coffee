#
# Simple Hello World app, deployable to Lambda.
#

'use strict'
AWS      = require('aws-sdk')

console.log 'Loading function'
exports.handler = (event, context, callback) ->
  # echo back 'Hello World'
  callback null, 'Hello World'
  return