var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');
var notesync = require('./noteSync')

function createTicket(args,tags) {
    var post_ticket = "https://"+args.iparams.platforms_portal_domain+".freshdesk.com/api/v2/tickets";
    var data = {
      "description": args.data.ticket.description,
      "subject": args.data.ticket.subject,
      "email": args.data.requester.email,
      "priority": args.data.ticket.priority,
      "status": 2,
      "custom_fields":{
        "cf_product_reporting_the_issue": args.data.ticket.custom_fields.cf_bu_920504,
        "cf_freshdesk_l2_teams":args.data.ticket.custom_fields.cf_platform_teams_920504,
        "cf_freshdesk_support_ticket_id":args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_920504
      }
    }
    var req = {
            url: post_ticket,
            body: JSON.stringify(data),
            method: 'POST',
            headers: {
           "Content-Type": "application/json",
           "Authorization": "Basic " + base64.encode(args.iparams.platforms_portal_key + ":X")
            }
      };
    request(req, function (error, response) {
    handler.handleResponse(error, response);
   if(response.statusCode === 201){
    var body = JSON.parse(response.body);
    var devTicket = args.data.ticket.id;
    var platformsTicket = body.id;

    setValue(devTicket,platformsTicket)

    updateSupportTicket(args,platformsTicket, tags)
    updateDevTicket(args,platformsTicket)
    notesync.get_last_added_private_note(args, platformsTicket)
    }
  console.error(error);
});
}

function setValue(platformsTicket,devTicket){
$db.set(devTicket, { "platformsTicket": platformsTicket }).then (
function(data) {
 console.info(data);
},
function(error) {
console.error(error);
});
}

function updateSupportTicket(args,platformsTicket,tags){
  var support_ticket = "https://support.freshdesk.com/api/v2/tickets/"+args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_920504;
  var payload = {"tags":tags.concat("Moved to Platforms"),"custom_fields":{"cf_l2_platforms_ticket_id":platformsTicket.toString()}}
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
    console.error(error);
    console.info(response.body)
    });
}

function updateDevTicket(args,platformsTicket){
var dev_ticket = "https://freshdeskl2dev.freshdesk.com/api/v2/tickets/"+args.data.ticket.id;
var dev_payload = {"custom_fields":{"cf_platforms_ticket_id":platformsTicket.toString()}}
var req = {
            url: dev_ticket,
            body: JSON.stringify(dev_payload),
            method: 'PUT',
            headers: {
           "Content-Type": "application/json",
           "Authorization": "Basic " + base64.encode(args.iparams.dev_portal_key + ":X")
            }
      };
    request(req, function (error, response) {
    handler.handleResponse(error, response);
    console.error(error);
    console.info(response.body)
    });
}

exports = {
  createTicket: createTicket,
  setValue: setValue
};
