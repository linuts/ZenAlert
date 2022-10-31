let knownTickets = [];

chrome.runtime.onMessage.addListener( function(request,sender,sendResponse)
{
    if( request.addView )
    {
        fetch('https://insourceservices.zendesk.com/api/v2/views/'+ request.addView.id +'/tickets').then(response => {
            return response.json();
          }).then(data => {
            for(let index=1; index < data.tickets.length; index++) {
                let ticket = data.tickets[index];
                if(ticket.status === "new") {
                    knownTickets += ticket.id;
                    console.log(request.addView.title, ticket.id, ticket.created_at, ticket.subject);
                }
            }
          }).catch(err => {
            // Do something for an error here
          });
    }
});