module.exports.schema = function() {
	var schema = {
		name : "WebSocketObjects",
		type : "object",
		additionalProperties : false,
		properties : {
			"type" : {
				type : ["string", "number"],
				enum : ['400', '401', '201', '200', 400, 401, 201, 200],
				require : true
			},
			"obj" : {
				description : "padding stuff",
				type : "string",
				required : true
			},
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