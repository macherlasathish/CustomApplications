var ticket =  require('./createticket');
var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');
var notesync = require('./noteSync')

function get_platforms_ticket(args){
  var devTicket = args.data.ticket.id;
  
  $db.get(devTicket)
  .then(
    function (data) {
      console.log(data.platformsTicket)
      if(data.platformsTicket != null){
        notesync.get_last_added_private_note(args, data.platformsTicket)
      }
      else{
        console.error("There is no platform ticket linked in the DB")
        }
    },    

    function (error) {
            if(error.status == 404){
              validateTicket(args)  
            }
            else{
              console.error(error)
            }
    })
}


function validateTicket(args){
	var get_ticket = "https://support.freshdesk.com/api/v2/tickets/"+args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_920504;
	var req = {
      url: get_ticket,
      json:true,
      method: 'GET',
      headers: {
       "Content-Type": "application/json",
       "Authorization": "Basic " + base64.encode(args.iparams.support_portal_key + ":X")
      } 
    };

    request(req, function (error, response) {
    handler.handleResponse(error, response);
    console.error(error);

    var platformsticketid = response.body.custom_fields.cf_l2_platforms_ticket_id;
    var tags = response.body.tags;
    if(platformsticketid === null){
    ticket.createTicket(args,tags);
    }
    else if(platformsticketid!= null){
     ticket.setValue(platformsticketid,args.data.ticket.id)
     notesync.get_last_added_private_note(args, platformsticketid)
    }
});  
}
exports = {
  validateTicket: validateTicket,
  get_platforms_ticket: get_platforms_ticket
};
