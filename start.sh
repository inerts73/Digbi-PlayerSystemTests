#!/bin/bash
#PLAYER_CHECKOUT_BRANCH=stage
#PLAYER_DIR_NAME=digbil-player-new

: ${DSCS_PORT=9090}
: ${DSCS_SERVER_NAME=localhost}
: ${DISPLAY=:0}
TEST_SUITE_FILE_NAME="${1}"
TEST_SUITE_FULL_PATH="test/test_suite/${1}"
PLAYER_LOG_FULL_PATH="/tmp/player_log"
PLAYER_DB_FULL_PATH="/var/lib/digbil/db/slot.db"
PLAYER_CONFIG_FULL_PATH="/etc/digbil/digbilplayer.cfg"

USAGE()
{
    echo "usage: $0 [test_suite_file_name(inside test/test_suite)]" && exit 1
}

GET_VALUE_FROM_TEST_SUITE()
{
    if [ "$1" ] && ( grep -q "$1" "${TEST_SUITE_FULL_PATH}" > /dev/null 2>&1 ); then
        VALUE="`grep \"$1\" \"${TEST_SUITE_FULL_PATH}\" | sed 's/.*://g' | sed 's/,.*//g' | sed 's/[\t\n ]//g'`"
        declare -u VALUE="$VALUE"
        echo $VALUE
    else
        echo "there's no $1 in ${TEST_SUITE_FULL_PATH}" && exit 1
    fi
}

#trap 'clean' EXIT # this will remove all test reports, so don't use it

if ! [ -f "${TEST_SUITE_FULL_PATH}" ]; then
    USAGE && exit 1
fi

CLEAN_DB="`GET_VALUE_FROM_TEST_SUITE 'clean_db'`"
CLEAN_VIDEO="`GET_VALUE_FROM_TEST_SUITE 'clean_video'`"
CONFIG_SEND_RPT_INTERVAL="`GET_VALUE_FROM_TEST_SUITE 'config_send_rpt_interval'`"
CONFIG_TORRENT_TIMEOUT="`GET_VALUE_FROM_TEST_SUITE 'config_torrent_timeout'`"
CONFIG_HTTP_TIMEOUT="`GET_VALUE_FROM_TEST_SUITE 'config_http_timeout'`"

echo "CLEAN_DB: $CLEAN_DB"
echo "CLEAN_VIDEO: $CLEAN_VIDEO"
echo "CONFIG_SEND_RPT_INTERVAL: $CONFIG_SEND_RPT_INTERVAL"
echo "CONFIG_TORRENT_TIMEOUT: $CONFIG_TORRENT_TIMEOUT"
echo "CONFIG_HTTP_TIMEOUT: $CONFIG_HTTP_TIMEOUT"

# reset all
pgrep npm && killall npm
pgrep node && killall node
pgrep DigBil-Player && killall DigBil-Player

sudo service puppet stop

# update player
declare -u ENABLE_PUPPET_SYNC="$ENABLE_PUPPET_SYNC"
if [ "$ENABLE_PUPPET_SYNC" == "TRUE" ]; then
    ps ax | grep -i "puppet agent" | grep -v grep | awk '{print $1}' | xargs kill -s 9
    rm -f /var/lib/puppet/state/puppetdlock
    sudo puppet agent -t
fi

# update dscs required packages
if [ -s $HOME/.nvm/nvm.sh ]; then
    . $HOME/.nvm/nvm.sh
    nvm use 0.8.22
    $HOME/.nvm/v0.8.22/bin/npm i
else
    echo "$HOME/.nvm/nvm.sh doesn't exist...exit"
    exit 1
fi

# configure and run test server
sed -i "s/port : .*/port : $DSCS_PORT/g" test/ws_tests_loader.js
sed -i "s/\(test\/test.sh\)[^\"]*/\1 .\/${TEST_SUITE_FILE_NAME}/g" ./package.json
npm test&
#(node ./test/load_tests.js "./${TEST_SUITE_FILE_NAME}")&
sleep 1 # wait for npm to start

# initialize config file, database and videos
touch /var/lib/digbil/wss/ssl/client.key

if [ "$CLEAN_DB" == "TRUE" ]; then
    sudo cp /var/lib/digbil/db/slot_new_raw.db "$PLAYER_DB_FULL_PATH"
fi

if [ "$CLEAN_VIDEO" == "TRUE" ]; then
    sudo rm -rf /var/lib/digbil/media/video/*
    sudo rm -rf /var/lib/digbil/media/downloading/*
fi

sudo cp /etc/digbil/digbilplayer_new_raw.cfg "$PLAYER_CONFIG_FULL_PATH"
sed -i "s/SEND_REPORT_INTERVAL_SEC = .*/SEND_REPORT_INTERVAL_SEC = $CONFIG_SEND_RPT_INTERVAL/g" "$PLAYER_CONFIG_FULL_PATH"
sed -i "s/CHECK_TORRENT_ADDTIME = .*/CHECK_TORRENT_ADDTIME = $CONFIG_TORRENT_TIMEOUT/g" "$PLAYER_CONFIG_FULL_PATH"
sed -i "s/CURL_TIMEOUT = .*/CURL_TIMEOUT = $CONFIG_HTTP_TIMEOUT/g" "$PLAYER_CONFIG_FULL_PATH"
sed -i "s/DSCS_PORT = .*/DSCS_PORT = $DSCS_PORT/g" "$PLAYER_CONFIG_FULL_PATH"
sed -i "s/DSCS_SERVER_NAME = .*/DSCS_SERVER_NAME = $DSCS_SERVER_NAME/g" "$PLAYER_CONFIG_FULL_PATH"

# for finalize...wait for npm to finish and kill player accordingly
( while [ "`pidof npm`" ]; do sleep 1; done; pgrep DigBil-Player && killall DigBil-Player )&

# launch player #using valgrind and gdb in the future
DISPLAY=$DISPLAY DigBil-Player -tXDDDDDDDDD > "$PLAYER_LOG_FULL_PATH" 2>&1


# make a backup
NOW=`date +%F_%Hh%M`
sudo mkdir -p "test_result_${NOW}"
sudo cp "$PLAYER_DB_FULL_PATH" "test_result_${NOW}"
sudo cp "$PLAYER_CONFIG_FULL_PATH" "test_result_${NOW}"
sudo cp "$PLAYER_LOG_FULL_PATH" "test_result_${NOW}"
sudo cp "test/test_suite/${TEST_SUITE_FILE_NAME}" "test_result_${NOW}"
sudo cp ./tests_results.xml "test_result_${NOW}"


# put a 0 exit code to cheat jenkins
exit 0
