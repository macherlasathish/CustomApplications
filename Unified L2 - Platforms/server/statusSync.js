var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');

function sync(args){

    var platformsTicket = args.data.ticket.id;
    
    $db.get(platformsTicket).then(function(data){
    var devTicket = data.devTicket;
    var ifProductIssue = args.data.ticket.custom_fields.cf_product_side_issue_1280592;

    //use below if required
    var statusOld = args.data.ticket.changes.status[0];
    var statusNow = args.data.ticket.changes.status[1];

    if (statusNow == 2){
        syncStatus(args, devTicket, 10);
     }

     else if(statusNow == 14){
        syncStatus(args, devTicket, 2);
     }

     else if (statusNow == 4 || statusNow == 5){
        if (statusOld == 4 && statusNow == 5){
            console.log("Skipping status sync since the platforms ticket was changed from resolved to closed.")
        }
        else if (ifProductIssue == "Yes"){
         syncStatus(args, devTicket, 2);
        }
        else{
            syncStatus(args, devTicket, 5);
        }
     }
     
     else if (statusNow == 6 || statusNow == 3){
         syncStatus(args, devTicket, statusNow);
     }   
    },
    function(error) {
        console.error("Failed to Fetch DB value! Key: " + platformsTicket + "Error: " + error)
    });
    }

    function syncStatus (args, devTicket,status){
        var put_ticket = "https://"+args.iparams.dev_portal_domain+".freshdesk.com/api/channel/v2/tickets/"+devTicket;
        var data = {
        "status": status,
        "type" : "Moved to Allied Team"
        };

    var req = {
            url: put_ticket,
            body: JSON.stringify(data),
            method: 'PUT',
            headers: {
           "Content-Type": "application/json",
           "Authorization": "Basic " + base64.encode(args.iparams.dev_portal_key + ":X")
            } 
      };
    request(req, function (error, response) {
        handler.handleResponse(error, response);
        if(response.statusCode != 200){
            console.error("Ticket (" + devTicket +") status update failed. Error: "+ response);  
        }
        console.info("Ticket (" + devTicket +") status updated in dev Portal");
        
});
    } 
    
    exports = {
        sync
    }
