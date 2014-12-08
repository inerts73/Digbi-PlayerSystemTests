module.exports.obj_schema = function() {
	var schema = {
		"id": "/campstat_obj_schema",
		name : "campaign playback",
		type : "object",
		additionalProperties : false,
		properties : {
			"camp_id" : {
				type : "string",
				// format : "mongodbid",
				required : true
			},
			"rep_ts" : {
				description : "timestamp of the event (UTC-Date)",
				type : "string",
				format : "date-time",
				required : true
			},
			"res_id" : {
				type : "string",
				// format : "mongodbid",
				required : true
			},
			"trigger" : {
				type : "string",
				enum : ['D', 'S', 'R'], //demog', 'sched', 'rand'
				required : true,
			}
		}
	};

	return schema;
};

module.exports.schema = function() {
	var schema = {
		name : "campaign statistics",
		type : "array",
		items : {"$ref": "/campstat_obj_schema"},
		minItems : 1,
		maxItems : 100,
		required : true
	};

	return schema;
};
