var ticket =  require('./createticket');
var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');

function validateTicket(args){
	var get_ticket = "https://support.freshdesk.com/api/v2/tickets/"+args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_1280592;
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
    console.log(error);
    var devticketid = response.body.custom_fields.cf_l2_ticket_id;
    var tags = response.body.tags;
    var teams = args.data.ticket.custom_fields.cf_freshdesk_l2_teams_1280592
    if(devticketid === null && (teams === "L2 Email" || teams === "Freshworks Analytics" || teams === "L2 Freshid" || teams === "L2 - Channels" || teams === "L2 Marketplace" || teams === "L2 Search" || teams === "Freshpipe" || teams === "L2 Billing and SignUp" || teams === "L2 UCR" || teams === "L2 IRIS" || teams === "L2 RTS" || teams === "ConvStore" || teams === "L2 Kairos" || teams === "L2 Formserv")){
    ticket.createTicket(args,tags);
    }
    else if(devticketid!= null){
     ticket.setValue(devticketid,args.data.ticket.id)
    }
});  
}
exports = {
  validateTicket: validateTicket
};
