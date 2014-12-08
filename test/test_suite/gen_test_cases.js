var wsTestBuilder = require('../ws_tests_loader.js');
var helpers = require('../helpers.js');
var utility = require('../../lib/modules/objects/utility.js');
var assert = require('assert');
var test_suite = require(process.argv[2]);
var test_utility = require("./test_utility.js");

var MSG = helpers.msg;
var FINAL_ASSERT = helpers.final_assert;
var C = helpers.connect;

/* this test the connection to the DSCS */
var test = C({
    'timeout' : test_suite.connection_timeout
});


var get_msg_opt = function(index, test_case, today, base_time_offset) {
    // the following vars must be distinct among sent msg_opts
    var config = {
        today : today,
        today_YMD : today.toISOString().replace(/T.*/,''),
        msg_id : "DSCSid-dsid-ts-incnum_" + index, // DSCS must be capital
        campaign_id : "campaign_id_" + index,
        res_id : "res_id_" + index,
        media_id : "media_id_" + index,
        media_name : "media_name_" + index,
        name : "my_campaign_" + index,
        base_slot_offset : utility.getSlot(today, base_time_offset)
    };

    if ( test_case.msg_type === "campstat" && typeof test_case.msg_content === "undefined" )
    {
        return test_utility.gen_template_camp_msg_opt(test_case, config);
    }
    else if( typeof test_case.msg_type === "undefined" && typeof test_case.msg_content === "function" )
    {
        return test_utility.gen_msg_opt(test_case, config);
    }
    else
    {
        console.log("not supported: " + JSON.stringify(test_case));
        process.exit(1);
    }
};

var camp_msg_opt_collections = [];
var timeout = 0;
var today = new Date();
var base_slot = utility.getSlot(today, 0);

//  today(now)
//     |
//     |
//     |  test_suite.base_time_offset + med_0
//     |                |
//     |                |  test_suite.base_time_offset + med_1
//     |                |              |
//     |                |              |
//------------------------------------------------
// |--------------------> assumed_download_time for med_0
//            |-----------------------> assumed_download_time for med_1
// |-->| leak_time for med_0(denoted by leak_time_med0)
// leak_time for med_1(denoted by leak_time_med1) is 0 since it's not behind today(now), and
// therefore max_leak_time is leak_time_med0.
// (note that max_leak_time is used to give an offset for all campstat msg_opts)
// consequently, every med will be postponed by max_leak_time, as the following:
//  today(now)
//     |
//     |
//     |      test_suite.base_time_offset + med_0 + max_leak_time
//     |                    |
//     |                    |  test_suite.base_time_offset + med_1 + max_leak_time
//     |max_leak_time       |              |
//     |--->|               |              |
//------------------------------------------------
//         a1               a2            a3
// and the max_timeout is a3 plus the associated media length

var max_leak_time = 0;
var msg_opts = [];
for( var i=0; i<test_suite.msg.length; ++i )
{
    var test_case = test_suite.msg[i];
    var msg_opt = get_msg_opt(i, test_case, today, test_suite.base_time_offset);

    console.log( JSON.stringify(msg_opt) );

    var leak_time = 0;
    if ( typeof test_case.msg_content === "undefined" && test_case.msg_type === "campstat" )
    {
        // if the msg is not valid, skip this...
        var min_slot_to_play_per_test_case = msg_opt.msg_send_by_dscs.obj.sched[0].slots[0].med;
        for( var j=1; j<msg_opt.msg_send_by_dscs.obj.sched[0].slots.length; ++j ) {
            var slot_to_play = msg_opt.msg_send_by_dscs.obj.sched[0].slots[j].med;

            if( slot_to_play < min_slot_to_play_per_test_case ) {
                min_slot_to_play_per_test_case = slot_to_play;
            }
        }

        var min_slot_to_play = min_slot_to_play_per_test_case - base_slot;
        var assumed_download_time = msg_opt.msg_send_by_dscs.obj.media.size / 1024 / 100; // assume 100 kB/s
        var slot_to_download = utility.getSlot(today, assumed_download_time) - base_slot;

        leak_time = slot_to_download - min_slot_to_play + test_case.delay_secs_2_send_this_msg;
    }
    else
    {
        leak_time = 10 + test_case.delay_secs_2_send_this_msg;
    }

    if( leak_time > 0 && leak_time > max_leak_time ) {
        max_leak_time = leak_time;
    }

    msg_opt.delay = test_case.delay_secs_2_send_this_msg; // delay in seconds to send the msg
    msg_opts.push(msg_opt);
}

console.log("current date: " + today);
var max_timeout_2_play = 0;
var max_leak_slot = utility.getSecsInSlot(max_leak_time);
for( var i=0; i<msg_opts.length; ++i )
{
    var curr_timeout_2_play = 0;
    if( typeof msg_opts[i].msg_send_by_dscs !== "undefined" && msg_opts[i].msg_send_by_dscs.type === "campaign" )
    {
        var max_timeout_2_play_on_camp = 0;
        for( var j=0; j<msg_opts[i].msg_send_by_dscs.obj.sched[0].slots.length; ++j ) {
            msg_opts[i].msg_send_by_dscs.obj.sched[0].slots[j].med += max_leak_slot;

            console.log( j + "th schedule of " + i + "th msg: slot num => " + msg_opts[i].msg_send_by_dscs.obj.sched[0].slots[j].med +
                       "; play date => " + utility.getDate(today, msg_opts[i].msg_send_by_dscs.obj.sched[0].slots[j].med) );

            var curr_timeout_2_play_on_camp = utility.getSecs(msg_opts[i].msg_send_by_dscs.obj.sched[0].slots[j].med - base_slot) +
                                             msg_opts[i].msg_send_by_dscs.obj.media.len;

            if( max_timeout_2_play_on_camp < curr_timeout_2_play_on_camp )
            {
                max_timeout_2_play_on_camp = curr_timeout_2_play_on_camp;
            }
        }

        curr_timeout_2_play = max_timeout_2_play_on_camp + 5; // including len to slot precision lost and playback handling time
    }
    else
    {
        curr_timeout_2_play = msg_opts[i].delay;
    }

    if( max_timeout_2_play < curr_timeout_2_play )
    {
        max_timeout_2_play = curr_timeout_2_play;
    }

    camp_msg_opt_collections.push( msg_opts[i] );
}

timeout += max_timeout_2_play + test_suite.config_send_rpt_interval + test_suite.slot_width;
timeout += 5; // additional padding time
console.log( "our current timeout is: in sec: " + timeout + ", in date: " + utility.getDate(today, utility.getSlot(today, timeout)) );
camp_msg_opt_collections.timeout = timeout; // when timeout, all received data will fed into all test cases

/* add the message test as dependancy to the connection test */
test['campaign_msg'] = MSG(camp_msg_opt_collections);
test['campaign_msg']['final_assert'] = FINAL_ASSERT(camp_msg_opt_collections);

console.log("-------------------- test case structures");
console.dir(test);
console.log("-------------------- test case structures");

/* build the tests */
module.exports = wsTestBuilder(test);


