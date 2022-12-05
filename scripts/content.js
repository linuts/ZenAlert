var views_container; // Elemment that holds the views.
var view_title; // The title of the active view.
const subdomain = window.location.origin.replace("https://", '').split(".")[0]; // Find client name

$(document).ready(async function() {
    views_container = await get_views(); // Fast data pull on load...
    $("#z-icon").addClass("pb-5"); // Fix logo padding bug after changes
})

async function get_views() {
    // Load new view data from background.js
    return data = new Promise(function(resolve, reject){
        chrome.runtime.sendMessage('Sync_Views', (response) => {
            resolve(response);
        });
    });
}

// All views have loaded, time to overide!
var checkExist = setInterval(function() {

    // If this loads the page is ready
    if ($("[data-test-id=views_views-list_row]").length) {

        // Fix section title
        $("[data-test-id=views_views-list_container]").prepend($("<h2/>", {"text":"Views", "class": "text-center"}));
        $("[data-test-id=views_views-list_header]").addClass("shiftup");
        $("[data-test-id=views_views-list_container]").addClass("shiftup");
        $("[data-test-id=views_views-list_header-refresh]").show();
        $("[data-test-id=views_views-list_header-refresh]").click(view_load_setting);

        // Prep the section for rewrite
        view_title = $("[data-test-id=views_views-header]").parent();
        $("[data-test-id=views_views-list_header]").children().eq(0).empty();
        let views_options = $("[data-test-id=views_views-list_header]").children().eq(1);
        let view_assigned = $("<button/>", {"id":"view_assigned", "class":"page-link", "text":"Clients"});
        let view_personal = $("<button/>", {"id":"view_personal", "class":"page-link", "text":"Personal"});
        let view_watching = $("<button/>", {"id":"view_watching", "class":"page-link", "text":"Watching"});
        views_options.prepend($("<ul/>", {"id":"view_list", "class":"pagination pagination-sm pe-2 pt-1 m-0"}).append([
            $("<li/>", {"class":"page-item h4 active"}).append(view_assigned),
            $("<li/>", {"class":"page-item h4"}).append(view_personal),
            $("<li/>", {"class":"page-item h4"}).append(view_watching)
        ]));
        views_container = $("[data-test-id=views_views-list_row]").parent().parent();
        $(views_container).css("all","unset").removeAttr("style");

        // Button settings
        view_load_setting();
        view_assigned.click(view_setting_change);
        view_personal.click(view_setting_change);
        view_watching.click(view_setting_change);

        // Stop loop when run 
        clearInterval(checkExist);
    }
}, 10);

function view_load_setting() {
    chrome.storage.sync.get("view_type", function(result) {
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

function view_setting_change() {
    let save = {};
    console.log("view_setting_change");
    if($(this).attr('id') == "view_assigned") {
        save["view_type"] = "Group";
        update_views("Group");
        chrome.storage.sync.set(save);
        $("#view_assigned").parent().addClass('active');
        $("#view_personal").parent().removeClass('active');
        $("#view_watching").parent().removeClass('active');
    } else if($(this).attr('id') == "view_personal") {
        save["view_type"] = "User";
        update_views("User");
        chrome.storage.sync.set(save);
        $("#view_assigned").parent().removeClass('active');
        $("#view_personal").parent().addClass('active');
        $("#view_watching").parent().removeClass('active');
    } else if($(this).attr('id') == "view_watching") {
        save["view_type"] = "Checked";
        update_views("Checked");
        chrome.storage.sync.set(save);
        $("#view_assigned").parent().removeClass('active');
        $("#view_personal").parent().removeClass('active');
        $("#view_watching").parent().addClass('active');
    }
}

async function update_views(type) {
    $("[data-test-id=views_views-list_header-refresh]").click(view_load_setting);
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

    views_container.empty();
    let data = await get_views();
    for(view in data) {

        // Set Title based on user setting
        let title = data[view].raw_title;
        if(data[view].user_title) {
            title = data[view].user_title;
        }
        let ticket_link = $("<a/>", {
            "class":"form-check-label link-primary text-start",
            "data-view-id":+view,
            "href":"/agent/filters/"+view,
            "title": data[view].raw_title,
            "id": `a_${view}`,
            "text":title
        });
        ticket_link.click(view_clicked);
        let ticket_count = $("<span/>", {"class":"badge rounded-pill"});
        set_ticket_count(ticket_count, data[view].count);
        if(data[view].type === type || !type) {
            let ticket_alert = $("<input/>", {"class":"me-2", "type":"checkbox", "id":"view_"+ view});
            ticket_alert.change(checkbox_setting_change);
            checkbox_set_setting(ticket_alert, "view_"+view);
            list.append($("<li/>", {"class":"list-group-item d-flex border border-0 justify-content-between align-items-center"}).append([
                $("<div/>", {
                    "class":"pe-2",
                    "style":"overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
                }).append([ticket_alert, ticket_link]),
                    ticket_count
            ]));
        } else if(type === "Checked" && await load_setting(`view_${view}`)) {
            list.append($("<li/>", {"class":"list-group-item d-flex border border-0 justify-content-between align-items-center"}).append([
                $("<div/>", {
                    "class":"pe-2",
                    "style":"overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
                }).append(ticket_link),
                    ticket_count
            ]));
        }
    }

    if(!views_container.html()){
        views_container.append(list);
    }
}

async function get_brand() {
    let brands = await new Promise(function(resolve, reject){
        $.getJSON(`https://${subdomain}.zendesk.com/api/v2/brands.json`, function( viewData ) {
            resolve(viewData);
        });
    });
    for(brand in brands.brands) {
        if(brands.brands[brand].subdomain == subdomain) {
            return brands.brands[brand];
        }
    }
}

function checkbox_setting_change() {
    let save = {};
    save[$(this).attr('id')] = $(this).is(':checked');
    chrome.storage.sync.set(save);
}

async function checkbox_set_setting(element, key) {
    const data = await load_setting(key);
     $(element).prop('checked', data);
 }

async function load_setting(key) {
    return new Promise(function(resolve, reject){
        chrome.storage.sync.get(key, function(result) {
            resolve(result[key]);
        })
    });
}

async function set_ticket_count(element, count) {
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

function view_clicked() {
    // Update and save a user title for a view
    // ( this code is yucky and hacked together, needs work!)
    view_title.empty().removeClass();
    view_title.append($("<div/>", {"class":"container"}))
        .append($("<input/>", {
            "class":"form-control border-0 fs-3 p-0",
            "id": `${$(this).attr("id").replaceAll("a_", "t_")}`,
            "placeholder": $(this).attr("title"),
            "style":"overflow: hidden; white-space: nowrap; text-overflow: ellipsis;",
            "value": $(this).text()
    }));

    view_title.focusout(function (e) {
        // apply the new title when the user leaves the title field
        let new_title = $(e.target).val();
        if(!new_title.length) {
            new_title = $(e.target).attr('placeholder');
        }
        let save = {};
        save[`title_${$(e.target).attr('id').replaceAll("t_", "")}`] = new_title;
        console.log(save);
        chrome.storage.sync.set(save);
        // Update background.js VIEW_TRACKER
        chrome.runtime.sendMessage([`title_${$(e.target).attr('id').replaceAll("t_", "")}`, new_title]);
        // Replace the raw_title with the user_title
        $(`#${$(e.target).attr("id").replaceAll("t_", "a_")}`).text(new_title);
    });
}