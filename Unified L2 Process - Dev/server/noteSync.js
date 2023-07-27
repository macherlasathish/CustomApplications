var handler = require('./lib/handle-response');
var request = require('request');
var base64 = require('base-64');

function get_last_added_private_note(args, platformsticketid){
  let pageNumber = 1;

  function getLastConvoOfPage(){
    var ticket_url = "https://freshdeskl2dev.freshdesk.com/api/v2/tickets/"+args.data.ticket.id+"/conversations?page=" + pageNumber;
  
    var req = {
     url: ticket_url,
     method: 'GET',
     headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + base64.encode(args.iparams.dev_portal_key + ":X")
     }
   }

   
  request(req,function (error, response){
    if(response.statusCode == 200)
    {
      if(response.headers['link']){
        pageNumber++;
        getLastConvoOfPage();
      }
      else{
        responseObject = JSON.parse(response.body);
        extractLastNote(responseObject);
      }

    }
    else{
      console.error(error)
    }
  })
  }

  function extractLastNote(notes){
    var last_note = notes[notes.length - 1]
    if(!last_note.body.includes("Note pushed from Platforms Portal")){
      noteSync(last_note, platformsticketid,args);
    }
  }
  getLastConvoOfPage();
}   

function noteSync(note, platformsticketid, args){
    var platform_ticket = "https://"+args.iparams.platforms_portal_domain+".freshdesk.com/api/channel/v2/tickets/"+platformsticketid;

    var note_data = {
        "body": note.body,
        "private": true,
        "import_id": note.id
    }

    var properties = {
      "status": 2,
      "custom_fields":{
        "cf_product_side_issue":null
      },
      "import_id": note.id + 1
    }
    
    //to sync note from dev portal to platform portal

    var note_sync = {
          url: platform_ticket + "/notes",
          body: JSON.stringify(note_data),
          method: 'POST',
          headers: {
           "Content-Type": "application/json",
           "Authorization": "Basic " + base64.encode(args.iparams.platforms_portal_key + ":X")
          }
    }

    //to set platform portal ticket as open once the note is added (the note addition will not trigger an observer
    // as channel API us used and hence an manual update is required)

    var ticket_update = {
      url: platform_ticket,
      body: JSON.stringify(properties),
      method: 'PUT',
      headers: {
       "Content-Type": "application/json",
       "Authorization": "Basic " + base64.encode(args.iparams.platforms_portal_key + ":X")
      }
    }
    
    request(note_sync,function (error, response){
      if(response.statusCode == 200){
        console.info(response.body)
      }
      else{
        console.error(error)
      }
    })

    request(ticket_update,function (error, response){
      if(response.statusCode == 200){
        console.info(response.body)
      }
      else{
        console.error(error)
      }
    })

    //if a public note is added in dev portal, it will sync it to the support portal
    //support portal automation will reopen the support ticket
    //this is to set support ticket status to 'Awaiting L2 Response' to avoid confusion for a support agent

    // if (note.private != true) {
    //   updateSupportTicket(args)
    // }

}

// function updateSupportTicket(args){
//   var support_ticket = "https://support.freshdesk.com/api/v2/tickets/"+args.data.ticket.custom_fields.cf_freshdesk_support_ticket_id_920504;
//   let payload = {"status": 10}
//   var req = {
//             url: support_ticket,
//             body: JSON.stringify(payload),
//             method: 'PUT',
//             headers: {
//            "Content-Type": "application/json",
//            "Authorization": "Basic " + base64.encode(args.iparams.support_portal_key + ":X")
//             }
//       };
//     request(req, function (error, response) {
//     handler.handleResponse(error, response);
//     console.error(error);
//     console.info(response.body)
//     });
// }


exports = {
    get_last_added_private_note
  };
  