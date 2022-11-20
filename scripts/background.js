let knownTickets = [];
let view_tracker = {};

self.addEventListener('install', (event) => {
  console.log("install");
});

chrome.runtime.onMessage.addListener(function(request) {
    if(request.loaded == "Ready") {
      console.log(alerting_views_sync());
    }
});

async function alerting_views_sync() {
  const data = await load_views();
  let view = {};
  for(let view in data.views) {
    if(data.views[view].restriction && await load_setting(`view_${data.views[view].id}`)) {
      let title = data.views[view].title;
      let count = await get_ticket_count(data.views[view].id)
      let count_value = await count.view_count;
      //view[title] = count_value.value;
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