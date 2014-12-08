var sec_slot = 5; // How many seconds per slot
module.exports.getSlot = function(date, delay) {
    var newDate = new Date(date.getTime());
    if (delay)
    {
        newDate.setSeconds(newDate.getSeconds() + delay);
    }
    // return Math.floor(now.getHours() * slot_H + now.getMinutes() * slot_M + now.getSeconds() / sec_slot);
    var totalSecondsAfterMidnight = newDate.getHours() * 3600 + newDate.getMinutes() * 60 + newDate.getSeconds();
    return Math.ceil(totalSecondsAfterMidnight / sec_slot);
};

module.exports.getSecs = function(slot_num) {
    return slot_num * sec_slot;
};

module.exports.getSecsInSlot = function(secs) {
    return Math.ceil(secs / sec_slot);
};

module.exports.getDate = function(date, slot_num) {
    var newDate = new Date(date.getTime());

    newDate.setSeconds(0);
    newDate.setMinutes(0);
    newDate.setHours(0);

    newDate.setSeconds(slot_num * sec_slot);

    return newDate;
};