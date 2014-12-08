var Validator_ = require('jsonschema').Validator;
var validator = new Validator_();

var msg_schema_handlers = {};
var schema_handlers = {};

schema_handlers['campstat'] = require("../../schema/JSON/campstat.js");
validator.addSchema(schema_handlers['campstat'].obj_schema(), '/campstat_obj_schema');

schema_handlers['mediadeploy'] = require("../../schema/JSON/mediadeploy.js");
validator.addSchema(schema_handlers['mediadeploy'].obj_schema(), '/mediadeploy_obj_schema');

schema_handlers['ack'] = require("../../schema/JSON/ack.js");

module.exports.validate = function( msg ) {
    // console.log("resp_schema_check: " + JSON.stringify(msg));
    // console.dir(schema_handlers);
    var response = function(valid, type, ack_type, ack_msg_id, ack_err) {
        return {
            valid : valid,
            type : type,
            ack : {
                type : ack_type,
                msg_id : ack_msg_id,
                err : ack_err
            }
        };
    };

    if( typeof msg.headers === "undefined" )
        return response(false, "unknown", '401', "invalid_msg_id", "UnknownHeaderError");

    if( typeof msg.headers.msg_id !== "string" )
        return response(false, "unknown", '401', "invalid_msg_id", "InvalidMsgIDError");

    var msg_id = msg.headers.msg_id;

    // ack
    if (Number(msg.type)) {
        schema_handler = schema_handlers['ack'];
        var result = validator.validate(msg, schema_handler.schema());
        if (result.errors && result.errors.length)
            return response(false, "ack", '401', msg_id, result.errors);

        return response(true, "ack", '201', msg_id, "");
    }

    schema_handler = schema_handlers[msg.type];
    if( schema_handler ) {
        if (!msg.obj) {
            return response(false, "unknown", '401', msg_id, "NULLDataError");
        }

        // validate the input data
        var result = validator.validate(msg.obj, schema_handler.schema());
        if (result.errors && result.errors.length)
            return response(false, msg.type, '401', msg_id, result.errors);

        return response(true, msg.type, '201', msg_id, "");
    }

    return response(false, "unknown", '401', msg_id, "UnknownDataTypeError");
}