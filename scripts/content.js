var views_container; // Elemment that holds the views.
let view_title; // The title of the active view.
const subdomain = window.location.origin.replace("https://", '').split(".")[0];

$(document).ready(function() {
    $("#z-icon").addClass("pb-5");
})

var checkExist = setInterval(function() {
    if ($("[data-test-id=views_views-list_row]").length) {
        view_title = $("[data-test-id=views_views-header]").parent();
        $("[data-test-id=views_views-list_header]").children().eq(0).empty();
        let views_options = $("[data-test-id=views_views-list_header]").children().eq(1);
        let view_assigned = $("<button/>", {"id":"view_assigned", "class":"page-link", "text":"Assigned"});
        let view_personal = $("<button/>", {"id":"view_personal", "class":"page-link", "text":"Personal"});
        let view_watching = $("<button/>", {"id":"view_watching", "class":"page-link", "text":"Watching"});
        views_options.prepend($("<ul/>", {"id":"view_list", "class":"pagination pagination-sm pe-2 pt-1 m-0"}).append([
            $("<li/>", {"class":"page-item h4 active"}).append(view_assigned),
            $("<li/>", {"class":"page-item h4"}).append(view_personal),
            $("<li/>", {"class":"page-item h4"}).append(view_watching)
        ]));

        views_container = $("[data-test-id=views_views-list_row]").parent().parent()
        $(views_container).css("all","unset").removeAttr("style");

        view_load_setting();

        view_assigned.click(view_setting_change);
        view_personal.click(view_setting_change);
        view_watching.click(view_setting_change);

        clearInterval(checkExist);

        chrome.runtime.sendMessage({loaded: "Ready"});
    }
}, 10);

function view_load_setting() {
    console.log("Read", "view_type");
    chrome.storage.sync.get("view_type", function(result) {
        console.log("Read", "view_type", result["view_type"]);
        if(result["view_type"] == "User") {
            $("#view_assigned").parent().removeClass('active');
            $("#view_personal").parent().addClass('active');
            $("#view_watching").parent().removeClass('active');
            update_views("User");
        } else if(result["view_type"] == "Group") {
            $("#view_assigned").parent().addClass('active');
            $("#view_personal").parent().removeClass('active');
            $("#view_watching").parent().removeClass('active');
            update_views("Group");
        } else if(result["view_type"] == "Checked") {
            $("#view_assigned").parent().removeClass('active');
            $("#view_personal").parent().removeClass('active');
            $("#view_watching").parent().addClass('active');
            update_views("Checked");
        }
    });
}

async function load_title(title) {
    const title_var = title.replaceAll(" ","-");
    return load_setting(`title_${title_var}`);
}

async function update_views(type) {
    //alerting_views_sync();
    views_container.empty();
    let data = await get_views();
    $("[data-test-id=views_views-list_header-refresh]").hide();
    let list = $("<ul/>", {"class":"list-group overflow-auto my-2 pe-4"});
    if(type === "User") {
        list.append($("<a/>", {
            "class":"link-primary text-center h6",
            "href":`https://${subdomain}.zendesk.com/admin/workspaces/agent-workspace/views?access=personal`,
            "target":"_blank",
            "text":"Manage Your Views"
        }));
    } else if(type === "Group") {
        let brand = await get_brand();
        list.append($("<a/>", {
            "class":"link-primary text-center h6",
            "href": brand.brand_url,
            "target":"_blank",
            "text":`Managed by ${brand.name}`
        }));
    } else {
        list.append($("<h2/>", {
            "class":"link-primary text-center h6",
            "text":"Your Focused Views",
            "style":"margin-left: 10px !important;"
        }));
    }
    for(view in data.views) {
        if(data.views[view].restriction && (data.views[view].restriction.type === type || !type)) {
            let title = data.views[view].title;
            let loaded_title = await load_title(data.views[view].title);
            if(loaded_title) {
                title = loaded_title;
            }
            let ticket_alert = $("<input/>", {"class":"me-2", "type":"checkbox", "id":"view_"+ data.views[view].id});
            let ticket_link = $("<a/>", {
                "class":"form-check-label link-primary text-start",
                "data-view-id":+data.views[view].id,
                "href":"/agent/filters/"+data.views[view].id,
                "title": data.views[view].title,
                "id": `a_${data.views[view].title.replaceAll(" ","-")}`,
                "text":title
            });
            let ticket_count = $("<span/>", {"class":"badge rounded-pill"});
            list.append($("<li/>", {"class":"list-group-item d-flex border border-0 justify-content-between align-items-center"}).append([
                $("<div/>", {
                    "class":"pe-2",
                    "style":"overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
                }).append([ticket_alert, ticket_link]),
                    ticket_count
            ]));

            ticket_link.click(view_clicked);

            set_ticket_count(ticket_count, data.views[view].id);
            ticket_alert.change(checkbox_setting_change);
            checkbox_set_setting(ticket_alert, "view_"+data.views[view].id);
        } else if(data.views[view].restriction && type === "Checked" && await load_setting(`view_${data.views[view].id}`)) {
            let title = data.views[view].title;
            let ticket_link = $("<a/>", {
                "class":"form-check-label link-primary text-start",
                "data-view-id":+data.views[view].id,
                "href":"/agent/filters/"+data.views[view].id,
                "title": title,
                "id": `a_${data.views[view].title.replaceAll(" ","-")}`,
                "text":title
            });
            let ticket_count = $("<span/>", {"class":"badge rounded-pill"});
            list.append($("<li/>", {"class":"list-group-item d-flex border border-0 justify-content-between align-items-center"}).append([
                $("<div/>", {
                    "class":"pe-2",
                    "style":"overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
                }).append(ticket_link),
                    ticket_count
            ]));

            ticket_link.click(view_clicked);
            set_ticket_count(ticket_count, data.views[view].id);
        }
    }
    if(type === "Checked") {
        list.append($("<section/>", {"class":"border-top", "style":"margin-top: 10px !important; padding-top: 10px !important;"})).append([
            $("<p/>", {"class":"text-muted font-italic mb-1", "text":"Select the type of alert notifications would like...", "style":"margin-left: 10px !important;"}),
            $("<ul/>", {"class":"list-group overflow-auto ps-1"}).append([
                $("<li/>", {"class":"form-check-control form-switch my-1"}).append([
                    $("<input/>", { "style":"line-height: 1 !important; height: 15px !important; margin-left: 0px !important;", "class":"form-check-input", "type":"checkbox", "id":"push"}),
                    $("<label/>", { "style":"display: inline-block;", "class":"form-check-label ps-2", "type":"checkbox", "for":"push", "text":"Push Notification"})
                ]),
                $("<li/>", {"class":"form-check-control form-switch my-1"}).append([
                    $("<input/>", { "style":"line-height: 1 !important; height: 15px !important; margin-left: 0px !important;", "class":"form-check-input", "type":"checkbox", "id":"Sound"}),
                    $("<label/>", { "style":"display: inline-block;", "class":"form-check-label ps-2", "type":"checkbox", "for":"Sound", "text":"Sound Notification"})
                ])
            ])
        ]);
    }

    if(!views_container.html()){
        views_container.append(list);
    }
}

async function load_setting(key) {
    return data = new Promise(function(resolve, reject){
        try {
            chrome.storage.sync.get(key, function(result) {
                resolve(result[key]);
            })
        }
        catch (e) {
            reject(e);
        }
    });
}

async function checkbox_set_setting(element, key) {
   const data = await load_setting(key);
    console.log("Read", key, data);
    $(element).prop('checked', data);
}

function checkbox_setting_change() {
    let save = {};
    save[$(this).attr('id')] = $(this).is(':checked');
    console.log("Save", save);
    chrome.storage.sync.set(save);
}

function view_setting_change() {
    console.log( "Click", $(this).attr('id'));
    let save = {};
    if($(this).attr('id') == "view_assigned") {
        save["view_type"] = "Group";
        update_views("Group");
        chrome.storage.sync.set(save);
        console.log("view_assigned");
        $("#view_assigned").parent().addClass('active');
        $("#view_personal").parent().removeClass('active');
        $("#view_watching").parent().removeClass('active');
    } else if($(this).attr('id') == "view_personal") {
        save["view_type"] = "User";
        update_views("User");
        chrome.storage.sync.set(save);
        console.log("view_personal");
        $("#view_assigned").parent().removeClass('active');
        $("#view_personal").parent().addClass('active');
        $("#view_watching").parent().removeClass('active');
    } else if($(this).attr('id') == "view_watching") {
        save["view_type"] = "Checked";
        update_views("Checked");
        chrome.storage.sync.set(save);
        console.log("view_watching");
        $("#view_assigned").parent().removeClass('active');
        $("#view_personal").parent().removeClass('active');
        $("#view_watching").parent().addClass('active');
    }
}

async function set_ticket_count(element, viewId) {
    let count = await get_ticket_count(viewId);
    console.log("Count: ",count);
    if (element.length) {
        element.append(""+count+"");
        if(count == 0) {
            element.addClass('bg-secondary');
        } else if(count <= 5) {
            element.addClass('bg-success');
        } else if(count <= 10) {
            element.addClass('bg-warning');
        } else {
            element.addClass('bg-danger');
        }
    }
}

async function get_brand() {
    let brands = await new Promise(function(resolve, reject){
        $.getJSON(`https://${subdomain}.zendesk.com/api/v2/brands.json`, function( viewData ) {
            resolve(viewData);
        });
    });
    console.log(await brands);
    for(brand in brands.brands) {
        if(brands.brands[brand].subdomain == subdomain) {
            return brands.brands[brand];
        }
    }
}

async function get_views() {
    return data = new Promise(function(resolve, reject){
        $.getJSON(`https://${subdomain}.zendesk.com/api/v2/views.json?active=true&sort_by=alphabetical`, function( viewData ) {
            resolve(viewData);
        });
    });
}

async function get_ticket_count(viewId) {
    return data = new Promise(function(resolve, reject){
        $.getJSON(`https://${subdomain}.zendesk.com/api/v2/views/${viewId}/count.json`, function( ticketView ) {
            resolve(ticketView.view_count.value);
        });
    });
}

function view_clicked() {
    view_title.empty().removeClass();
    view_title.append($("<div/>", {"class":"container"}))
        .append($("<input/>", {
            "class":"form-control border-0 fs-3 p-0",
            "id": $(this).attr("title").replaceAll(" ","-"),
            "placeholder": $(this).attr("title"),
            "style":"overflow: hidden; white-space: nowrap; text-overflow: ellipsis;",
            "value": $(this).text()
    }));

    view_title.focusout(function (e) {
        let new_title = $(e.target).val();
        if(!new_title.length) {
            new_title = $(e.target).attr('placeholder');
        }
        let save = {};
        save[`title_${$(e.target).attr('id')}`] = new_title;
        chrome.storage.sync.set(save);
        $(`#a_${$(e.target).attr("id")}`).text(new_title);
    });
}