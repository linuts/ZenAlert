$(document).ready(function() {
    $("#patch").change(setting_change);
    $("#push").change(setting_change);
    $("#sound").change(setting_change);
    load_setting($("#patch"), "patch");
    load_setting($("#push"), "push");
    load_setting($("#sound"), "sound");
    $.getJSON("https://insourceservices.zendesk.com/api/v2/views.json", function( data ) {
        for(view in data.views) {
            if(data.views[view].active && data.views[view].restriction != null && data.views[view].restriction.type == "Group") {
                let input = $("<input/>", { "class":"form-check-input "+data.views[view].id, "type":"checkbox", "id":"input_"+data.views[view].id});
                let label = $("<label/>", {"class":"form-check-label ps-2 "+data.views[view].id, "for":"input_"+data.views[view].id, "text":data.views[view].title});
                $("#views").append($("<li/>", {"class":"form-check-control form-switch my-1 py-1"}).append([input, label]));
                input.change(setting_change);
                set_ticket_count(label, data.views[view].id);
                load_setting(input, "input_"+data.views[view].id);
            }
        }
    });

function set_ticket_count(element, viewId) {
    $.getJSON("https://insourceservices.zendesk.com/api/v2/views/"+viewId+"/tickets.json", function( ticketView ) {
        var checkExist = setInterval(function() {
            if (element.length) {
               element.append(" ("+ticketView.count+")");
               clearInterval(checkExist);
            }
        }, 10);
    });
}

});

function load_setting(element, key) {
    chrome.storage.sync.get(key, function(result) {
       console.log("Read", key, result[key]);
        $(element).prop('checked', result[key]);
    });
}

function setting_change() {
    let save = {};
    save[$(this).attr('id')] = $(this).is(':checked');
    console.log("Save", save);
    chrome.storage.sync.set(save);
}