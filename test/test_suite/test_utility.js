var assert = require('assert');
var json_schema_validator = require('../../lib/modules/objects/json_schema_check.js');

var mediadeploy_default_assert =  function(msg_opt){
    return function(msg_received) {
        console.log("mediadeploy: " + JSON.stringify(msg_received));

        result = json_schema_validator.validate(msg_received);
        assert.ok( result.valid );

        assert.equal(msg_received.obj.length, 1 );
        assert.equal(msg_received.obj[0].uri + "?torrent", msg_opt.msg_send_by_dscs.obj.media.uri[0] );
        assert.equal(msg_received.obj[0].media, msg_opt.msg_send_by_dscs.obj.media._id, "msg.obj.media != msg_opt.msg_send_by_dscs.obj.media._id" );

        if( Number(msg_received.obj[0].progress) < 100 && Number(msg_received.obj[0].progress) >= 0 )
        {
            // todo although D is not recommened
            assert.ok( "NSPWCED".indexOf(msg_received.obj[0].status) > -1, "msg_received.obj.status is not one of NSPWCED" );
        }
        else if ( Number(msg_received.obj[0].progress) == 100 )
        {
            assert.equal( msg_received.obj[0].status, "D", "msg_received.obj.status is not D" );
        }
        else
        {
            assert.ifError( "msg_received.obj.progress is not a number between 0 and 100" );
        }

        assert.ok( Number(msg_received.obj[0].trials) >= 1, "msg_received.obj.trials is not a number >= 1" ); // digit >= 1
    };
};


var campstat_default_assert = function(msg_opt) {
    return function(msg_received) {
        console.log("campstat: " + JSON.stringify(msg_received));

        result = json_schema_validator.validate(msg_received);
        assert.ok( result.valid );

        var num_successfully_played_cam = 0;
        for( var i=0; i<msg_received.obj.length; ++i ) {
            assert.equal( msg_received.obj[i].camp_id, msg_opt.msg_send_by_dscs.obj._id );
            assert.equal( msg_received.obj[i].res_id, msg_opt.msg_send_by_dscs.obj.sched[0].res_id );

            if( msg_received.obj[i].trigger === "S" ) {
                ++num_successfully_played_cam;
            }
        }
        return num_successfully_played_cam;
    };
};

var ack_default_assert = function(msg_opt, type) {
    return function(msg_received) {
        console.log("ack: " + JSON.stringify(msg_received));

        result = json_schema_validator.validate(msg_received);
        assert.ok( result.valid );

        assert.equal(type, msg_received.type);
        assert.equal(msg_opt.msg_send_by_dscs.headers.msg_id, msg_received.headers.msg_id);
    };
};



var get_msg_opt = function(test_case, msg)
{
    //////////////////////////////////////////////////////////////////////// mediadeploy
    var set_final_assert_mediadeploy = false;
    if( test_case.assert_mediadeploy === "default" ) {
        msg.resp.mediadeploy = function(msg_received) {
            mediadeploy_default_assert(msg)(msg_received);
            if( msg.final_media_status !== "D" )
                msg.final_media_status = msg_received.obj[0].status;
        };

        set_final_assert_mediadeploy = true;
    }
    else if( typeof test_case.assert_mediadeploy === "function" ) {
        msg.resp.mediadeploy = function(msg_received) {
            mediadeploy_default_assert(msg)(msg_received);
            test_case.assert_mediadeploy(msg_received);

            if( msg.final_media_status !== "D" )
                msg.final_media_status = msg_received.obj[0].status;
        };

        set_final_assert_mediadeploy = true;
    }

    var final_assert_mediadeploy = function() {}
    if( set_final_assert_mediadeploy === true ) {
        final_assert_mediadeploy = function() {
            assert.equal(msg.final_media_status, "D");
        };
    }

    //////////////////////////////////////////////////////////////////////// campstat
    var set_final_assert_campstat = false;
    if( test_case.assert_campstat === "default" ) {
        msg.resp.campstat = function(msg_received) {
            msg.actually_played_cam_count += campstat_default_assert(msg)(msg_received);
        };

        msg.expected_played_cam_count = msg.msg_send_by_dscs.obj.sched[0].slots.length;
        set_final_assert_campstat = true;
    }
    else if( typeof test_case.assert_campstat === "function" ) {
        msg.resp.campstat = function(msg_received) {
            msg.actually_played_cam_count += campstat_default_assert(msg)(msg_received);
            test_case.assert_campstat(msg_received);
        };

        msg.expected_played_cam_count = msg.msg_send_by_dscs.obj.sched[0].slots.length;
        set_final_assert_campstat = true;
    }

    var final_assert_campstat = function() {}
    if( set_final_assert_campstat === true ) {
        final_assert_campstat = function() {
            assert.equal(msg.expected_played_cam_count, msg.actually_played_cam_count);
        };
    }

    //////////////////////////////////////////////////////////////////////// ack
    if( typeof test_case.assert_ack === "number" ) {
        msg.resp.ack = ack_default_assert(msg, test_case.assert_ack);
    }
    else {
        console.log("test_case.assert_ack should be a number, invalid syntax of test suite...exit" );
        process.exit(1);
    }

    //////////////////////////////////////////////////////////////////////// final_assert
    // final_assert is a special assertion function that lets you to confirm semantic things
    msg.resp.final_assert = function()  {
        final_assert_mediadeploy();
        final_assert_campstat();
    }

    return msg;
}


module.exports.gen_template_camp_msg_opt = function(test_case, config) {
    var msg =
    {
        'expected_played_cam_count' : -1,
        'actually_played_cam_count' : 0,
        'final_media_status' : "uninitialized",
        'msg_send_by_dscs' : {
            'type' : 'campaign',
            'headers' : {
                "msg_id" : config.msg_id,
            },
            'obj' : {
                "_id" : config.campaign_id,
                "ts" : config.today,
                "sched" : [ {
                    "res_id" : config.res_id,
                    "ts" : config.today,
                    "day" : config.today_YMD,
                    "slots" : []
                } ],
                "stat" : 2,
                "cdate" : config.today,
                "name" : config.name,
                "media" : {
                    "_id" : config.media_id,
                    "cdate" : config.today,
                    "ts" : config.today,
                    "len" : test_case.media_len,
                    "name" : config.media_name,
                    "res" : "360",
                    "size" : test_case.media_size,
                    "uri" : [ test_case.media_uri ],
                },
                "lay" : [
                ],
                "ctype" : test_case.cam_type
            }
        },
        'resp' : {
        },
    };

    var arr = test_case.cam_sched_slot_num;
    for(var i = 0 ; i < arr.length ; i++) {
        msg.msg_send_by_dscs.obj.sched[0].slots.push( {med: Number(arr[i]) + config.base_slot_offset, tol: 0} );
    }

    return get_msg_opt(test_case, msg);
};


module.exports.gen_msg_opt = function(test_case, config) {
    var msg =
    {
        'expected_played_cam_count' : -1,
        'actually_played_cam_count' : 0,
        'final_media_status' : "uninitialized",
        'msg_send_by_dscs' : test_case.msg_content(),
        'resp' : {
        },
    };

    return get_msg_opt(test_case, msg);
};