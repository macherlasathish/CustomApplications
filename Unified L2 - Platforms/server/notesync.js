var request =  require('request')
var base64 = require('base-64')
function notesync(args){
    var ticket_id = args.data.conversation.ticket_id
    var note_content =  args.data.conversation.body
    console.log(ticket_id)
    $db.get(ticket_id)
    .then(data =>
        {
            dev_portal_url = "https://"+args.iparams.dev_portal_domain+".freshdesk.com/api/channel/v2/tickets/"+data.devTicket+"/notes"
            options = {'body': 'Note pushed from Platforms Portal:<br>' + note_content, 'private': true , 'import_id': args.data.conversation.id}
            var note_create = {
                url: dev_portal_url,
                body: JSON.stringify(options),
                method: 'POST',
                headers: {
               "Content-Type": "application/json",
               "Authorization": "Basic " + base64.encode(args.iparams.dev_portal_key + ":X")
                }
          };
          request(note_create, function(error,response)
          {
           if(response.headers.status == '201 Created')
           {
               console.info("Conversation Created in Ticket"+ data.devTicket)
           }
           else console.error(error)
          }
          
          ) },function (err)
        {
            console.log("Inside Data storage error")
            console.log(err)
        }
    )
   
}

exports ={
    notesync
}