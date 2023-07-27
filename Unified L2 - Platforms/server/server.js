var validateticket =  require('./validateTicket');
var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');
var notesync = require('./notesync');
var statusSync = require('./statusSync');

exports = {

  events: [
    { event: 'onTicketCreate', callback: 'onTicketCreateHandler' },
    { event: 'onTicketUpdate', callback: 'onTicketUpdateHandler'},
    {event: 'onConversationCreate', callback: 'onConversationCreateHandler'}
  ],

onTicketCreateHandler: function(args) {
	if(args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshdesk" || args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshsales" || args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "FreshworksCRM" || args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshmarketer" || args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshchat" || args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshcaller")
	{
	validateticket.validateTicket(args);
  }
},

onTicketUpdateHandler: function(args){
  
  if((args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshdesk" && args.data.ticket.changes.status) || (args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshsales" && args.data.ticket.changes.status) || (args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "FreshworksCRM" && args.data.ticket.changes.status) || (args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshmarketer" && args.data.ticket.changes.status) || (args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshchat" && args.data.ticket.changes.status) || (args.data.ticket.custom_fields.cf_product_reporting_the_issue_1280592 == "Freshcaller" && args.data.ticket.changes.status)){
    statusSync.sync(args);
  }
},

onConversationCreateHandler: function(args)
{
  notesync.notesync(args)
}

}; 

