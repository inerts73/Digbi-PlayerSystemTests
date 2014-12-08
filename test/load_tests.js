var files = [ "gen_test_cases.js" ];

var async = require('async');
var Reporter = require('./XUnit_Reporter.js');

/* vows XUnit reporter */
var reporter = new Reporter('Payer_System_Tests');

/* load web_socket tests */
var suites = {};
for ( var i = 0; i < files.length; i++) {
	var suite = require('./test_suite/' + files[i]);

	var options = {
		'vows_opt' : {
			'reporter' : reporter
		}
	};

	suites[files[i]] = async.apply(suite, options);
}

async.series(suites, function(errors, results) {	
	console.log(results);
	reporter.print();
	if (errors)
		throw errors;

	if (results.errors)
		process.exit(1);
	else
		process.exit(0);
});
