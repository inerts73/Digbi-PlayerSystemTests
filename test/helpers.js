var assert = require('assert');
var json_schema_validator = require('../lib/modules/objects/json_schema_check.js');
var WS_msg = require('../lib/modules/objects/ws_dscs_msg.js');

module.exports.connect = function(options) {
    var test = {};
    test.topic = function(websocket) {
        console.log("Testing WS connection..");
        var that = this;
        var resp = false;

        var requester = function(request) {
            console.log("new request from " + request.origin);
            // request.reject("403", msg);
            if (!resp) {
                var socket = request.accept(null, request.origin);
                that.callback(null, {
                    connection : socket,
                    websocket : websocket
                });
                resp = true;
            }
        };
        websocket.once('request', requester);

        setTimeout(function() {
            if (!resp) {
                websocket.removeListener("request", requester);
                that.callback(null, {
                   err : "Timed Out: No client connection!"
                });
            }
            resp = true;
        }, (options.timeout || 5) * 1000);
    };
    test.connection_error = function(err, data) {
        if( data.err )
            console.log( "error msg in connection_error: " + data.err );
        /* assert errors */
        assert.ifError(data.err);
        assert.ok(data.connection);
        assert.ok(data.websocket);
    };
    return test;
};

module.exports.msg = function(options) {
    var test = {};
    test.topic = function(data) {
        console.log("Testing WS message..");
        var that = this;
        var resps = [];

        var msg_handle = function(msg_received) {
            // console.log("Got message(raw).." + msg_received);
            var err = null;
            var msg_received = msg_received.utf8Data;
            console.log("Got message(decoded).." + msg_received);
            try {
                msg_received = JSON.parse(msg_received);
            } catch (_e) {
                err = _e;
            } finally {
                if (err)
                    return that.callback(null, {
                        err : err
                    });

                // collect all data until timeout
                resps.push(msg_received);
            }

            // send back ack
            var result = json_schema_validator.validate(msg_received);
            if( result.type !== "ack" ) {
                var resp = new WS_msg(result.ack.type, result.ack.err, result.ack.msg_id);
                console.log("about to send ack: " + resp);
                data.connection.sendUTF(resp);
            }
        };
        // when we collect enough data, pass those to all test cases
        setTimeout(function() {
            data.connection.removeListener('message', msg_handle);
            if( resps.length == 0 )
            {
                that.callback(null, {
                    websocket : data.websocket,
                    connection : data.connection,
                    resps : resps,
                    err : "Timed Out: No message received!"
                });
            }
            else
            {
                // pregroup them to make the test faster
                var grouped_resps = { mediadeploy:[], campstat:[], ack:[] };
                // classify resps
                var got_invalid_msg = false;
                for( var i=0; i<resps.length; ++i )
                {
                    var msg = resps[i];
                    if( typeof msg === "object" && typeof msg.type !== "undefined" )
                    {
                        if( msg.type === "mediadeploy" )
                        {
                            grouped_resps.mediadeploy.push(msg);
                            continue;
                        }
                        else if( msg.type === "campstat" )
                        {
                            grouped_resps.campstat.push(msg);
                            continue;
                        }
                        else if( typeof msg.type === "string" )
                        {
                            grouped_resps.ack.push(msg);
                            continue;
                        }
                    }

                    console.log( "Got invalid msgs: " + JSON.stringify(msg) );
                    got_invalid_msg = true;
                    break;
                }

                if( got_invalid_msg === false )
                {
                    that.callback(null, {
                        websocket : data.websocket,
                        connection : data.connection,
                        grouped_resps : grouped_resps
                    });
                }
                else
                {
                    that.callback(null, {
                        websocket : data.websocket,
                        connection : data.connection,
                        grouped_resps : grouped_resps,
                        err : "Got invalid msgs"
                    });
                }
            }
        }, (options.timeout || 5) * 1000);

        data.connection.on('message', msg_handle);

        for( var i=0; i<options.length; ++i )
        {
            // no idea why these two have to be defined outside setTimeout()
            var new_msg = options[i].msg_send_by_dscs;
            var delay = options[i].delay;
            setTimeout(function() {
                if (typeof new_msg == 'object')
                {
                    new_msg_str = JSON.stringify(new_msg);
                    console.log("about to send data: " + new_msg_str);
                    data.connection.sendUTF(new_msg_str);
                }
            }, delay);
        }
    };

    var set_func = function( test_case_index, type_name, test_sent_msg, test_func ) {
        test_case_name = 'test_received_msg_' + type_name + "_" + test_case_index;
        test[test_case_name] = function(err, data) {
            if( data.err )
                console.log( "error msg in " + test_case_name + ": " + data.err );

            assert.ifError(data.err);
            assert.ok( typeof test_func === "function" );
            assert.ok( typeof data.grouped_resps.mediadeploy === "object" );
            assert.ok( typeof data.grouped_resps.campstat === "object" );
            assert.ok( typeof data.grouped_resps.ack === "object" );
            //assert.ok( typeof data.grouped_resps.timeout === "object" );

            // this means once you defines a test function but there's no corresponding data, the test will fail
            //assert.ok( grouped_resps.length > 0, test_case_name + " doesn't have any valid msgs fed in" );

            if( type_name === "mediadeploy" )
            {
                var resps = data.grouped_resps.mediadeploy;
                var receive_msg = false;
                for ( var i=0; i<resps.length; i++ )
                {
                    assert.ok( typeof resps[i].obj[0].media !== "undefined" && typeof test_sent_msg.obj.media._id !== "undefined" );
                    if( resps[i].obj[0].media === test_sent_msg.obj.media._id )
                    {
                        receive_msg = true;
                        test_func( resps[i] );
                    }
                }

                assert.ok( receive_msg === true );
            }
            else if( type_name === "campstat" )
            {
                var resps = data.grouped_resps.campstat;
                var receive_msg = false;
                for ( var i=0; i<resps.length; i++ )
                {
                    assert.ok( typeof resps[i].obj[0].res_id !== "undefined" && typeof test_sent_msg.obj.sched[0].res_id !== "undefined" );
                    if( resps[i].obj[0].res_id === test_sent_msg.obj.sched[0].res_id )
                    {
                        receive_msg = true;
                        test_func( resps[i] );
                    }
                }

                assert.ok( receive_msg === true );
            }
            else if( type_name === "ack" )
            {
                var resps = data.grouped_resps.ack;
                var receive_msg = false;
                for ( var i=0; i<resps.length; i++ )
                {
                    assert.ok( typeof resps[i].headers.msg_id !== "undefined" && typeof test_sent_msg.headers.msg_id !== "undefined" );
                    if( resps[i].headers.msg_id === test_sent_msg.headers.msg_id )
                    {
                        receive_msg = true;
                        test_func( resps[i] );
                    }
                }

                assert.ok( receive_msg === true );
            }
            else
                assert.ifError("unknown type_name" + type_name);
  //          else if( type_name == "timeout" )
  //              start_test( data.grouped_resps.timeout );
           // if( return_msg )
           //     data.connection.sendUTF( JSON.stringify(return_msg) );
        };
    };

    for( var i=0; i<options.length; i++ )
    {
        var fail_func = function(msg) {
            assert.ifError("this is a fail function...maybe you've instantiated an assertion function which should not be used");
        };

        // if one of the functions is not defined, it means the test case
        // should not receive these kind of msgs
        if( typeof options[i].resp.mediadeploy === "function" )
           set_func( i, "mediadeploy", options[i].msg_send_by_dscs, options[i].resp.mediadeploy );
        else
           set_func( i, "mediadeploy", options[i].msg_send_by_dscs, fail_func );

        if( typeof options[i].resp.campstat === "function" )
            set_func( i, "campstat", options[i].msg_send_by_dscs, options[i].resp.campstat );
        else
            set_func( i, "campstat", options[i].msg_send_by_dscs, fail_func );

        if( typeof options[i].resp.ack === "function" )
            set_func( i, "ack", options[i].msg_send_by_dscs, options[i].resp.ack );
        else
            set_func( i, "ack", options[i].msg_send_by_dscs, fail_func );
    }

    return test;
};


module.exports.final_assert = function(options) {
    var test = {};
    test.topic = function(data) {
        console.log("Final assertion..");

        return data;
    };

    for( var i=0; i<options.length; i++ )
    {
        if( typeof options[i].resp.final_assert === "function" ) {
            (function(option){
                test["final_assert_" + i] = function(err, data) {
                    if( data.err )
                        console.log( "error msg in final_assert: " + data.err );
                    option.resp.final_assert();
                };
            })(options[i])
        }
    }

    return test;
};
