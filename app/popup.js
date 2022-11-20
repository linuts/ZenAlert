$(document).ready(function() {
    $("#push").change(checkbox_setting_change);
    $("#sound").change(checkbox_setting_change);

    checkbox_load_setting($("#push"), "push");
    checkbox_load_setting($("#sound"), "sound");
    set_user_info();
});

function update_views(type) {
    $("#views").hide();
    $("#views").empty();
    $.getJSON("https://insourceservices.zendesk.com/api/v2/views.json?active=true&sort_by=alphabetical", function( data ) { 
        $("#views").empty();
        for(view in data.views) {
            if(data.views[view].restriction != null && data.views[view].restriction.type == type) {
                let input = $("<input/>", {"class":"form-check-input", "type":"checkbox", "id":"view_"+ data.views[view].id});
                let link = $("<a/>", {"class":"form-check-label link-primary ps-2", "href":"https://insourceservices.zendesk.com/agent/filters/"+data.views[view].id, "text":data.views[view].title});
                let count = $("<span/>", {"class":"badge bg-primary rounded-pill"})
                $("#views").append($("<li/>", {"class":"list-group-item d-flex justify-content-between align-items-center"}).append([
                    $("<divn/>", {"class":"form-switch"}).append([input, link]), count
                ]));
                input.change(checkbox_setting_change);
                set_ticket_count(count, data.views[view].id);
                chrome.runtime.sendMessage({addView: data.views[view]});
                checkbox_load_setting(input, "view_"+data.views[view].id);
                $(link).click(function(){
                    chrome.tabs.create({url:$(this).attr('href')});
                });
            }
        }
    });
}

function set_user_info() {
    $("#user").hide();
    $.getJSON("https://insourceservices.zendesk.com/api/v2/users/me.json", function( me ) {
        $("#user").show();
        $("#user").append(me.user.name);
        $("#user img").prop("src", me.user.photo.mapped_content_url);
        chrome.runtime.sendMessage({loggedin: true});
    }).fail(function() {
        chrome.tabs.create({url:"https://insourceservices.zendesk.com/access/sso?role=agent"});
    });
}

function checkbox_load_setting(element, key) {
    chrome.storage.sync.get(key, function(result) {
    console.log("Read", key, result[key]);
    $(element).prop('checked', result[key]);
    });
}

function checkbox_setting_change() {
    let save = {};
    save[$(this).attr('id')] = $(this).is(':checked');
    console.log("Save", save);
    chrome.storage.sync.set(save);

    if($(this).attr('id') == "push" && $(this).is(':checked')) {
        chrome.notifications.create('example_'+Math.floor((Math.random() * 1000) + 1), {
            type: 'basic',
            iconUrl: '/images/Zendesk.png',
            title: 'Zen Alert',
            contextMessage: 'You have a new ticket!',
            message: 'Example push message...',
            priority: 2
        });
    } else if($(this).attr('id') == "sound" && $(this).is(':checked')) {
            var notification = new Audio(chrome.runtime.getURL("/sounds/E6thChord.wav"));
            notification.volume = .04;
            notification.play();
    } else {
        var notification = null;

        if ($(this).is(':checked')) {
            var change = new Audio(chrome.runtime.getURL("/sounds/SettingOn.wav"));
        } else {
            var change = new Audio(chrome.runtime.getURL("/sounds/SettingOff.wav"));
        }
        change.volume = .01;
        change.play();
    }
}
