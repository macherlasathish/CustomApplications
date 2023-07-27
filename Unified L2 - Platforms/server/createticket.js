var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');

function createTicket(args,tags) {
    var post_ticket = "https://"+args.iparams.dev_portal_domain+".freshdesk.com/api/v2/tickets";
    var data = {
      "description": args.data.ticket.description,
      "subject": args.data.ticket.subject,
      "email": args.data.requester.email,
      "priority": args.data.ticket.priority,
      "status": 10,
      "custom_fields":{
        "cf_freshdesk_l2_teams":args.data.ticket.custom_fields.cf_freshdesk_l2_teams_1280592,
        "cf_freshdesk_support_ticket_id":args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_1280592,
        "cf_platform_teams":args.data.ticket.custom_fields.cf_freshdesk_l2_teams_1280592,
        "cf_platforms_ticket_id": args.data.ticket.id.toString(),
        "cf_bu": args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592
      }
    }
    var req = {
            url: post_ticket,
            body: JSON.stringify(data),
            method: 'POST',
            headers: {
           "Content-Type": "application/json",
           "Authorization": "Basic " + base64.encode(args.iparams.dev_portal_key + ":X")
            }
      };
    request(req, function (error, response) {
    handler.handleResponse(error, response);
   if(response.statusCode === 201){
    var body = JSON.parse(response.body);
    var platformsTicket = args.data.ticket.id;
    var devTicket = body.id;
    setValue(devTicket,platformsTicket)
    updateSupportTicket(args,devTicket,tags)
    }
  console.log(error);
});
}
function setValue(devTicket,platformsTicket){
$db.set(platformsTicket, { "devTicket": devTicket }).then (
function(data) {
 console.log(data);
},
function(error) {
console.log(error);
});
}
function updateSupportTicket(args,devTicket,tags){
  var support_ticket = "https://support.freshdesk.com/api/v2/tickets/"+args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_1280592;
  var payload = {"tags":tags.concat("Moved to L2"),"custom_fields":{"cf_l2_ticket_id":devTicket.toString()}}
  console.log(tags);
  var req = {
            url: support_ticket,
            body: JSON.stringify(payload),
            method: 'PUT',
            headers: {
           "Content-Type": "application/json",
           "Authorization": "Basic " + base64.encode(args.iparams.support_portal_key + ":X")
            }
      };
    request(req, function (error, response) {
    handler.handleResponse(error, response);
    console.log(error);
    console.log(response.body)
    });
}
exports = {
  createTicket: createTicket,
  setValue: setValue
};
