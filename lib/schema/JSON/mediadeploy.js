module.exports.obj_schema = function() {
	var schema = {
		"id": "/mediadeploy_obj_schema",
		name : "media_deploy",
		type : "object",
		additionalProperties : false,
		properties : {
			"rep_ts" : {
				description : "timestamp of the event (UTC-Date)",
				type : "string",
				format : "date-time",
				required : true
			},
			"media" : {
				description : "media id",
				type : "string",
				// format : "mongodbid",
				required : true
			},
			"progress" : {
				description : "% of download",
				type : ["number", "string"],
				required : true
			},
			"status" : {
				description : "Progress, Waiting/pending, Cancelled, Done",
				type : "string",
				enum : ['N','S','P','W','C','E','D'],
				required : true
			},
			"uri" : {
				description : "file url being used",
				type : "string",
				//format : "uri",
				required : true
			},
			"trials" : {
				description : "number of trials",
				type : ["number", "string"],
				required : true
			}
		}
	};

	return schema;
}

module.exports.schema = function() {
	var schema = {
		name : "media_deploys",
		type : "array",
		items : {"$ref": "/mediadeploy_obj_schema"},
		minItems : 1,
		maxItems : 100,
		required : true
	};

	return schema;
};
