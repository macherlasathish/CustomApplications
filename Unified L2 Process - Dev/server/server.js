var validateticket =  require('./validateTicket');
var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');


exports = {

  events: [
    { event: 'onTicketUpdate', callback: 'onTicketUpdateHandler'},
  ],

onTicketUpdateHandler: function(args){
  if(args.data.ticket.changes.status[1] == 10 && args.data.ticket.changes.status[0]!= 10 && args.data.ticket.custom_fields.cf_platform_teams_920504 != null){
  	console.log(args);
    validateticket.get_platforms_ticket(args);
    }
}
}; 