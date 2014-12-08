var js2xmlparser = require("js2xmlparser");
var fs = require('fs');

function xmlEnc(value) {
	return !value ? value : String(value).replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(
			/\u001b\[\d{1,2}m/g, '');
}
function cdata(data) {
	return '<![CDATA[' + xmlEnc(data) + ']]>';
}

// xunit outoput for vows, so we can run things under hudson
//
// The translation to xunit is simple. Most likely more tags/attributes can be
// added, see: http://ant.1045680.n5.nabble.com/schema-for-junit-xml-output-td1375274.html
function XUReporter(SerieName, fileName) {
	this.SerieName = SerieName || "Vows Tests";
	this.results = [];
	this.ping = (new Date()).getTime();
	this.fileName = fileName || "./tests_results.xml";
}
XUReporter.prototype.name = 'xunit';
XUReporter.prototype.report = function(data) {
	try {
		var now = (new Date()).getTime();
		var event = data[1];
		switch (data[0]) {
		case 'subject':
			this.results.push({
				'@' : {
					'name' : event,
					'tests' : 0,
					'errors' : 0,
					'failures' : 0,
					'skip' : 0,
					'time' : 0
				},
				'testcase' : []
			});
			break;
		case 'context':
			break;
		case 'vow':
			var query = event.context.split('?');
			event.context = query[0].replace(/\./g, '_').replace(/ A /, '_').replace(/ to /, '_').replace(/ /g, '.');
			if (query.length > 1)
				event.title += " (" + xmlEnc(query[1]) + ")";

			event.context = this.results[this.results.length - 1]['@'].name + "." + event.context;

			this.results[this.results.length - 1]['@'].tests++;
			this.results[this.results.length - 1]['@'].time += now - this.ping;

			switch (event.status) {
			case 'honored':
				this.results[this.results.length - 1]['testcase'].push({
					'@' : {
						classname : event.context,
						name : event.title,
						time : now - this.ping
					}
				});
				break;
			case 'broken':
				this.results[this.results.length - 1]['@'].failures++;
				this.results[this.results.length - 1]['testcase'].push({
					'@' : {
						classname : event.context,
						name : event.title,
						time : now - this.ping
					},
					'failure' : {
						'@' : {
							type : 'vows.event.broken',
							message : 'Broken test'
						},
						'#' : cdata(event.exception)
					}
				});
				break;
			case 'errored':
				this.results[this.results.length - 1]['@'].errors++;
				this.results[this.results.length - 1]['testcase'].push({
					'@' : {
						classname : event.context,
						name : event.title,
						time : now - this.ping
					},
					'error' : {
						'@' : {
							type : 'vows.event.errored',
							message : 'Errored test'
						},
						'#' : cdata(event.exception)
					}
				});
				break;
			case 'pending':
				this.results[this.results.length - 1]['@'].skip++;
				this.results[this.results.length - 1]['testcase'].push({
					'@' : {
						classname : event.context,
						name : event.title,
						time : now - this.ping
					},
					'skip' : {
						'@' : {
							type : 'vows.event.skipped',
							message : 'Skipped test'
						}
					}
				});
				break;
			default:
				console.log("<=========Unknown=========>");
				console.log(event);
			}
			break;
		case 'end':
			break;
		case 'finish':
			this.results[this.results.length - 1]['@'] = {
				name : this.results[this.results.length - 1]['@'].name,
				tests : event.total || this.results[this.results.length - 1]['@'].tests,
				timestamp : (new Date()).toUTCString(),
				errors : event.errored || this.results[this.results.length - 1]['@'].errors,
				failures : event.broken || this.results[this.results.length - 1]['@'].failures,
				skip : event.pending || this.results[this.results.length - 1]['@'].skip,
				time : event.time || this.results[this.results.length - 1]['@'].time
			};
			break;
		case 'error':
			this.results[this.results.length - 1]['@'].errors++;
			this.results[this.results.length - 1]['testcase'].push({
				'@' : {
					classname : this.results[this.results.length - 1]['@'].name,
					name : "Unknown",
					time : now - this.ping
				},
				'error' : {
					'@' : {
						type : 'vows.event.errored',
						message : event.error
					},
					'#' : cdata(event.error)
				}
			});
			console.log(this.results[this.results.length - 1]);
			break;
		default:
			console.log("<=========Unknown=========>");
			console.log(event.suite);
		}		
		this.ping = (new Date()).getTime();
	} catch (err) {
		console.error("Reporter error :" + err);
	}
};

XUReporter.prototype.print = function(cb) {
	/* make top level element */
	var report = {
		'@' : {
			name : this.SerieName,
			tests : 0,
			errors : 0,
			failures : 0,
			skip : 0,
			time : 0
		},
		'testsuite' : []
	};
	for ( var t = 0; t < this.results.length; t++) {
		report['@'].tests += Number(this.results[t]['@'].tests);
		report['@'].errors += Number(this.results[t]['@'].errors);
		report['@'].failures += Number(this.results[t]['@'].failures);
		report['@'].skip += Number(this.results[t]['@'].skip);
		report['@'].time += Number(this.results[t]['@'].time);
	}
	report['testsuite'] = this.results;

	/* convert to XML */
	var xml = js2xmlparser("testsuites", report);
	/* save file */
	console.log('Writing Test results in ' + this.fileName + " Total_Errors=" + (report['@'].errors + report['@'].failures) + "/" + report['@'].tests);
	if (typeof cb == 'function')
		fs.writeFile(this.fileName, xml, cb);
	else
		fs.writeFileSync(this.fileName, xml);

	return xml;
};

module.exports = XUReporter;
