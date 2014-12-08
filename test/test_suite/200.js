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
        // either msg_type or msg_content can exist
        // also note that if msg_content is set, the leak_time will be set to 10s mandatorily
        "msg_type" : "campstat", // used to instantiate template campstat msg
        //"msg_content" : function() {  }, // put all contents here

        "cam_sched_slot_num" : [ 0, 5, 10 ], // it's the developer's responsibility to keep the relative slot num playable based on their media_len
        "cam_type" : 3,
        "media_uri" : "http://digbil-us-west-1-stage.s3.amazonaws.com/old/cf1d1e2fc9778803c4fd3c6fb3235f34?torrent", // or https, if http doens't work
        "media_size" : 1473831, // in bytes
        "media_len" : 15.082667, // in secs

        "delay_secs_2_send_this_msg" : 1, // delay secs to send this msg, in secs

        "assert_mediadeploy" : "default", // default means it will check the schema and simple semantic errors of each received msg
        "assert_campstat" : "default", // campstat must return successfully played cam count
        "assert_ack" : 201
    }]
};

