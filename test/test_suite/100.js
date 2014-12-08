module.exports = {
    // initial set up
    "clean_db" : true, // strongly recommends to be true
    "clean_video" : true,
    "config_send_rpt_interval" : 15, // value strongly recommends not to be large, in secs, this will influence mediadeploy and campstat rpt only
    "config_torrent_timeout" : 300, // in secs
    "config_http_timeout" : 5, // this one is used to download torrent via curl...in secs

    "connection_timeout" : 10, // in 10 secs, the billboard must connect to this server

    "base_time_offset" : 30, // used to allow download time tolerance, in secs
    "slot_width" : 5, // don't change this setting

    // actual sent msg
    "msg" : [ {
        //"msg_type" : "camp_sched",
        "msg_content" : function() {
            return { "hello" : "i'm fake" };
        },

        "delay_secs_2_send_this_msg" : 1, // delay secs to send this msg, in secs
        "assert_ack" : 400
    }]
};

