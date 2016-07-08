(function() {
  var AWS, Ajv, JSONPath, async, ec2Schema, validateEC2Instances;

  ec2Schema = {
    'id': '/EC2',
    'type': 'object',
    'properties': {
      'Reservations': {
        'type': 'array',
        'items': {
          '$ref': '#/definitions/Reservation'
        }
      }
    },
    'definitions': {
      'Tag': {
        'type': 'object',
        'properties': {
          'Key': {
            'type': 'string',
            'enum': ['Name', 'CostCenter']
          }
        },
        'required': ['Key', 'Value'],
        'switch': [
          {
            'if': {
              'properties': {
                'Key': {
                  'enum': ['CostCenter']
                }
              }
            },
            'then': {
              'properties': {
                'Value': {
                  'type': 'string',
                  'pattern': '^[0-9]{3}$'
                }
              }
            }
          }
        ]
      },
      'Instance': {
        'type': 'object',
        'properties': {
          'InstanceId': {
            'type': 'string',
            'minLength': 10,
            'maxLength': 19
          },
          'InstanceType': {
            'type': 'string',
            'enum': ['t2.micro']
          },
          'Tags': {
            'type': 'array',
            'items': {
              '$ref': '#/definitions/Tag'
            },
            'minItems': 2
          }
        },
        'required': ['InstanceId', 'InstanceType', 'Tags']
      },
      'Reservation': {
        'type': 'object',
        'properties': {
          'Instances': {
            'type': 'array',
            'items': {
              '$ref': '#/definitions/Instance'
            }
          }
        }
      }
    }
  };

  'use strict';

  AWS = require('aws-sdk');

  async = require('async');

  Ajv = require('ajv');

  JSONPath = require('JSONPath');

  exports.handler = function(event, context) {
    async.series([validateEC2Instances], function(error, results) {
      console.log(error);
      if (error) {
        return context.done(error, 'Error');
      } else {
        return context.done(null, 'Finished!');
      }
    });
  };

  validateEC2Instances = (function(_this) {
    return function(callback) {
      var ec2;
      ec2 = new AWS.EC2({
        apiVersion: '2016-04-01',
        region: 'us-west-2'
      });
      ec2.describeInstances(function(error, data) {
        var ajv, errors, valid;
        if (error) {
          console.log("[ERROR] " + error);
          return callback(error, null);
        } else {
          ajv = new Ajv({
            verbose: true,
            allErrors: true,
            v5: true
          });
          ajv.addSchema(ec2Schema, 'EC2');
          valid = ajv.validate('EC2', data);
          if (!valid) {
            errors = {
              size: ajv.errors.length,
              errors: []
            };
            async.each(ajv.errors, function(error) {
              var instance, instancePath;
              instancePath = error.dataPath.match(/(^.*Instances\[\d+\])\..*$/)[1];
              instance = JSONPath({
                path: "$" + instancePath,
                json: data
              })[0];
              return errors.errors.push({
                instanceId: instance.InstanceId,
                instanceState: instance.State.Name,
                instanceType: instance.InstanceType,
                instanceTags: instance.Tags,
                message: error.message
              });
            });
            callback(errors, 'Invalid');
            return;
          }
          return callback(null, 'Valid');
        }
      });
    };
  })(this);

}).call(this);
