var generate_msg_id = function() {
	return "DSCS" + Date.now();
};

/* constructor */
function obj(type_name, data, msg_id) {
	if (!msg_id)
		msg_id = generate_msg_id();

	this.type = type_name;
	this.headers = {
		'msg_id' : msg_id
	};
	this.obj = data;
};
module.exports = obj;

obj.prototype.toString = function() {
	return JSON.stringify(this);
};

obj.schema = function(types) {
	var types_name = [];
	var types_schema = [];
	for ( var tn in types) {
		types_name.push(tn);
		types_schema.push(types[tn]);
	}
	var schema = {
		name : "WebSocketObjects",
		type : "object",
		additionalProperties : false,
		properties : {
			"type" : {
				type : "string",
				enum : types_name,
				require : true
			},
			"obj" : types_schema,
			"headers" : {
				type : "object",
				require : true,
				properties : {
					"msg_id" : {
						type : "string",
						require : true
					}
				}
			}
		}
	};
	return schema;
};