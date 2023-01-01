var VIEW_TRACKER = {}; // Holds last view sync, may not be completed
var VIEW_TRACKER_SYNCED = {}; // Holds last completed view sync
var SUBDOMAIN = "";

// Load counts for a view
async function get_ticket_count(viewId) {
  const response = await fetch(`https://${SUBDOMAIN}.zendesk.com/api/v2/views/${viewId}/count.json`);
  return (await response.json()).view_count.value;
}

async function fetch_active_views(get) {
  const response = await fetch(get);
  const views_data = await response.json();
  let views = views_data.views;

  // NOT TESTED! Load view next pages...
  if(views_data.next_page) {
    const next = await fetch_active_views(views_data.next_page);
    for(let view in next) {
      views[view] = next[view];
    }
  }

  return views;
}

// Load clients into VIEW_TRACKER var
async function load_active_views() {
  const views = await fetch_active_views(`https://${SUBDOMAIN}.zendesk.com/api/v2/views.json?active=true&sort_by=alphabetical`);
  for(let view in views) {
    view = views[view];

    // Some client (Group) views are not restricted...
    let type = "Group";
    if(view.restriction) {
      type = view.restriction.type;
    }

    let title = "";
    const loaded_title = await load_setting(`title_${view.id}`);
    if(loaded_title) {
      title = loaded_title;
    }

    // Create a data object for the view
    VIEW_TRACKER[view.id] = {
      "url": view.url,
      "raw_title": view.title,
      "user_title": title,
      "type": type,
      "count": await get_ticket_count(view.id)
    }
  }
}

// OS push notification
function push_message(message, viewTitle) {
  console.log("OS Notification: ", message, viewTitle);
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/images/Zendesk.png',
    title: 'Zen Alert!',
    contextMessage: message,
    message: viewTitle,
    priority: 1
  })
}

// Create a ticket count update alarm
chrome.alarms.create("sync-count-alarm", {
  delayInMinutes: 0.1, // Hold while views load...
  periodInMinutes: 1.5 // Update count every 90 seconds
});

chrome.alarms.onAlarm.addListener(async function(alarm) {
  console.log("Alarm call:", alarm.name);
  switch (alarm.name) {

    case "sync-count-alarm":
      console.log("Views", VIEW_TRACKER);
      for(let view in VIEW_TRACKER) {
        const last_count = VIEW_TRACKER[view].count;
        const this_count = await get_ticket_count(view);
        if(last_count != this_count) {
          let title = VIEW_TRACKER[view].raw_title;
          if(VIEW_TRACKER[view].user_title) {
            title = VIEW_TRACKER[view].user_title
          }
          // The count changed... send message to user (if watching)
          if(await load_setting(`view_${view}`)) {
            if(last_count < this_count) {
              // A new ticket has been created
              push_message("A ticket has been opened for:", title);
            } else if(last_count > this_count) {
              // A ticket has been closed, update count
              push_message( "A ticket has been closed for:", title);
            }
          }
          // Update the VIEW_TRACKER count
          VIEW_TRACKER[view].count = this_count;
        }
        VIEW_TRACKER_SYNCED = VIEW_TRACKER
      }
      break;

    default:
      // Not Used
      break;
  }
});

// Needs cleanup, may create an error for some subdomains
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("message:", message);
  if (message === 'Sync_Views') {
    // This will send view data to content.js on request
    sendResponse(VIEW_TRACKER_SYNCED);
  } else if(message[0].includes("title_")) {
    // Update if the user sets a title
    // ( this code is yucky and hacked together, needs work!)
    const viewId = message[0].split("_")[1];
    const viewUserTitle = message[1];
    VIEW_TRACKER_SYNCED[viewId].user_title = viewUserTitle;
  } else {
    if(! SUBDOMAIN) {
      SUBDOMAIN = message;
      load_active_views();
    }
  }
});

async function load_setting(key) {
  return new Promise(function(resolve, reject){
      chrome.storage.sync.get(key, function(result) {
          resolve(result[key]);
      })
  });
}