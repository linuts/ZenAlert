$(document).ready(function() {
    $("#view_insource").click(view_setting_change);
    $("#view_personal").click(view_setting_change);
    $("#push").change(checkbox_setting_change);
    $("#sound").change(checkbox_setting_change);

    checkbox_load_setting($("#push"), "push");
    checkbox_load_setting($("#sound"), "sound");
    set_user_info();
    view_load_setting();
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
                    $("<div/>", {"class":"form-switch"}).append([input, link]), count
                ]));
                input.change(checkbox_setting_change);
                set_ticket_count(count, data.views[view].id);
                checkbox_load_setting(input, "view_"+data.views[view].id);
                $(link).click(function(){
                    chrome.tabs.create({url:$(this).attr('href')});
                });
            }
        }
    });
    $("#views").slideDown(1000);
}

    function set_user_info() {
        $("#user").hide();
        $.getJSON("https://insourceservices.zendesk.com/api/v2/users/me.json", function( me ) {
            $("#user").show();
            $("#user").append(me.user.name);
            $("#user img").prop("src", me.user.photo.mapped_content_url);
        }).fail(function() {
            chrome.tabs.create({url:"https://insourceservices.zendesk.com/access/sso?role=agent"});
        });
    }

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
                title: 'Zen Alert!',
                contextMessage: 'You have a new ticket.',
                message: 'Example push message...',
                priority: 2,
                requireInteraction: true
            });
        }

        if($(this).attr('id') == "sound" && $(this).is(':checked')) {
            var notification = new Audio(chrome.runtime.getURL("/sounds/E6thChord.wav"));
            notification.volume = .05;
            notification.play();
        }
}

function view_load_setting() {
    chrome.storage.sync.get("view_type", function(result) {
        console.log("Read", "view_type", result["view_type"]);
        if(result["view_type"] == "User") {
            $("#view_insource").parent().removeClass('active');
            $("#view_personal").parent().addClass('active');
            update_views("User");
        } else {
            $("#view_insource").parent().addClass('active');
            $("#view_personal").parent().removeClass('active');
            update_views("Group");
        }
    });
}

function view_setting_change() {
    console.log( "Click", $(this).attr('id'));
    let save = {};
    if($(this).attr('id') == "view_insource") {
        save["view_type"] = "Group";
        update_views("Group");
        chrome.storage.sync.set(save);
        console.log("view_insource");
        $("#view_insource").parent().addClass('active');
        $("#view_personal").parent().removeClass('active');
    } 
    if($(this).attr('id') == "view_personal") {
        save["view_type"] = "User";
        update_views("User");
        chrome.storage.sync.set(save);
        console.log("view_personal");
        $("#view_insource").parent().removeClass('active');
        $("#view_personal").parent().addClass('active');
    }
}