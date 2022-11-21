let view_tracker = {};
let is_scanning = false;

self.addEventListener('install', (event) => {
  console.log("install");
});

chrome.runtime.onMessage.addListener(function(request) {
  if(is_scanning) {
    console.log("pass");
  }
  if(!is_scanning && request.loaded == "Ready") {
    is_scanning = true;
    setInterval(function() {
      try {
        alerting_views_sync().then((live) => {
          for(let view in live) {
            if(view_tracker[view]) {
              if(view_tracker[view][1] < live[view][1]) {
                console.log(`New ticket for "${live[view][0]}"!`);
                new_ticket_alert(view, live[view][0]);
                view_tracker[view][1] = live[view][1];
              }
            } else {
              view_tracker[view] = live[view];
              console.log("Added view:", live[view]);
            }
          }
        });
      } catch (error) {
        console.log("Failed to load tickets, retry in 1 minute...");
      }
    }, 60000);
  }
});

function new_ticket_alert(viewId, viewTitle) {
  const randId = `Alert_${viewId}_${Math.floor(Math.random() * 1000)}`;
  chrome.notifications.create(randId, {
    type: 'basic',
    iconUrl: '/images/Zendesk.png',
    title: 'Zen Alert!',
    contextMessage: 'You have a new ticket for:',
    message: viewTitle,
    priority: 1
  })
}

async function alerting_views_sync() {
  const data = await load_views();
  let view = {};
  for(let data_view in data.views) {
    if(data.views[data_view].restriction && await load_setting(`view_${data.views[data_view].id}`)) {
      let id = data.views[data_view].id;
      let title = await load_setting(`title_${id}`);
      let count = await get_ticket_count(data.views[data_view].id)
      let count_value = await count.view_count;
      view[id] = [title, count_value.value];
    }
  }
  return view;
}

async function load_views() {
  const response = await fetch('https://insourceservices.zendesk.com/api/v2/views.json?active=true&sort_by=alphabetical');
  return await response.json();
}

async function get_ticket_count(viewId) {
  const response = await fetch(`https://insourceservices.zendesk.com/api/v2/views/${viewId}/count.json`);
  return await response.json();
}

async function load_setting(key) {
  return new Promise(function(resolve, reject){
      chrome.storage.sync.get(key, function(result) {
          resolve(result[key]);
      });
  });
}