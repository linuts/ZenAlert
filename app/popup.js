$(document).ready(function() {
    $("#push").change(setting_change);
    $("#sound").change(setting_change);
    load_setting($("#push"), "push");
    load_setting($("#sound"), "sound");

    $.getJSON("https://insourceservices.zendesk.com/api/v2/views.json?active=true&sort_by=alphabetical", function( data ) {
        for(view in data.views) {
            if(data.views[view].active && data.views[view].restriction != null && data.views[view].restriction.type == "Group") {
                
                let input = $("<input/>", {"class":"form-check-input", "type":"checkbox", "id":"push"});
                let link = $("<a/>", {"class":"form-check-label link-primary ps-2", "href":"https://insourceservices.zendesk.com/agent/filters/"+data.views[view].id, "text":data.views[view].title});
                let count = $("<span/>", {"class":"badge bg-primary rounded-pill"})
                $("#views2").append($("<li/>", {"class":"list-group-item d-flex justify-content-between align-items-center"}).append([
                    $("<div/>", {"class":"form-switch"}).append([input, link]), count
                ]));
                input.change(setting_change);
                set_ticket_count(count, data.views[view].id);
                load_setting(input, "input_"+data.views[view].id);
                $(link).click(function(){
                    chrome.tabs.create({url:$(this).attr('href')});
                });
            }
        }
    });

function set_ticket_count(element, viewId) {
    $.getJSON("https://insourceservices.zendesk.com/api/v2/views/"+viewId+"/count.json", function( ticketView ) {
        var checkExist = setInterval(function() {
            if (element.length) {
               element.append(""+ticketView.view_count.value+"");
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

    chrome.notifications.create('test', {
        type: 'basic',
        iconUrl: 'images/Zendesk.png',
        title: 'Test Message',
        message: 'You are awesome!',
        priority: 2
    });

    //var notification = new Audio(chrome.runtime.getURL("/sounds/E6thChord.wav"));
    //notification.volume = .05;
    //notification.play();
}