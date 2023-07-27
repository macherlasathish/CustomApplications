document.addEventListener("DOMContentLoaded", appInitialized);
//API Calls Function
function checkFRTaskAPI(ticketID) {
	return new Promise(resolve => {
		var headers = {
			"Accept": "application/json",
			"Authorization": "Token <%= iparam.freshreleaseAPIKey %>",
			"Content-Type": "application/json"
		};
		var options = {
			headers: headers
		};
		var url = "https://freshworks.freshrelease.com/api/integrated_resources?integration=freshdesk&remote_resource_id=" + ticketID;
		client.request.get(url, options).then(function(data) {
			console.log('Testing App - PUT Procesed')
			resolve(data)
		}).catch(function(error) {
			console.log('Testing App - PUT Failed')
			resolve(error)
		});
	});
}

function getTicketData() {
	client.data.get("ticket").then (
		function(data) {
			ticketID = data.ticket.id
			groupID = data.ticket.group_id
			applicableGroups = [50000000179,50000000239,2,50000000241,246696,246695,50000000037,245552,50000000066]
			console.log('Testing App - getTicketData() - ',groupID)
		},
		function(error) {
			console.log('Testing App - Unable to get Ticket Details',error)
		}
		);
}

//Initialize App
function appInitialized() {
	app.initialized().then(client => {
		window.client = client;
		client.events.on("app.activated", appActivated);
		getTicketData()
		console.log('Testing App - Intiialized')
	}, function(error) {
		console.log('Testing App - Unable to initialize the app', error);
	});
}

function appActivated() {
	var groupChangeCallback = function(event) {
		console.log('Group Changed',event)
		getTicketData()
	};


	var propertyChangeCallback = async function(event) {
		if (applicableGroups.includes(groupID)){
			console.log('Testing App - APPLICABLE for this Group - ',groupID)
		var event_data = event.helper.getData();
		ticketOldStatus = event_data.old.toString();
		ticketNewStatus = event_data.new.toString();

		if (ticketNewStatus==6)
		{
			console.log('Testing App - Status Changed to Dev Fix - ',ticketNewStatus,ticketID)
			checkFRTask = await checkFRTaskAPI(ticketID)
			console.log('Testing App - checkFRTask - ',checkFRTask.status)

			if (checkFRTask.status==200) {
				console.log('Testing App - Freshrelease API Success - ',JSON.parse(checkFRTask.response).issues[0])
				if (typeof(JSON.parse(checkFRTask.response).issues[0])!='undefined')
				{
					console.log('Testing App - FR Link Found')
				}
				else {
					console.log('Testing App - FR Not Linked')
					client.interface.trigger("setValue", {id: "status", value: ticketOldStatus})
					.then(function(data) {
						console.log('Testing App - SetValue Success',data)
						client.interface.trigger("showNotify", {
							type: 'warning',
							message: "There are no Fresrelease tasks linked. Please link one to set 'Awaiting Developer Fix' status"
						});
					}).catch(function(error) {
					console.log('Testing App - SetValue Failed',error)
					});
				}
			}
			else {
				console.log('Testing App - Freshrelease API Failed',checkFRTask.status)
			}

		}
		console.log('Testing App - Status Changed - ', ticketOldStatus,ticketNewStatus)
	}
	else {
		console.log('Testing App - Not Applicable for this Group - ',groupID)
	}
	};

	var typeChangeCallback = async function(event){
		if (applicableGroups.includes(groupID)){
			console.log('Testing App - APPLICABLE for this Group - ',groupID)
			var event_data = event.helper.getData();
			ticketOldType = event_data.old.toString();
			ticketNewType = event_data.new.toString();
			if(ticketNewType == "L4 - Bug")
			{
				console.log('Testing App - Type Changed to',ticketNewType,ticketID)
				checkFRTask = await checkFRTaskAPI(ticketID)
				console.log('Testing App - checkFRTask - ',checkFRTask.status)
	
				if (checkFRTask.status==200) {
					console.log('Testing App - Freshrelease API Success - ',JSON.parse(checkFRTask.response).issues[0])
					if (typeof(JSON.parse(checkFRTask.response).issues[0])!='undefined')
					{
						console.log('Testing App - FR Link Found')
					}
					else {
						console.log('Testing App - FR Not Linked')
						client.interface.trigger("setValue", {id: "ticket_type", value: ticketOldType})
						.then(function(data) {
							console.log('Testing App - SetValue Success',data)
							client.interface.trigger("showNotify", {
								type: 'warning',
								message: "There are no Fresrelease tasks linked. Please link one to set ticket type to 'L4 - Bug'"
							});
						}).catch(function(error) {
						console.log('Testing App - SetValue Failed',error)
						});
					}
				}
				else {
					console.log('Testing App - Freshrelease API Failed',checkFRTask.status)
				}
	
			}
			console.log('Testing App - Status Changed - ', ticketOldType,ticketNewType)
		}
		else {
			console.log('Testing App - Not Applicable for this Group - ',groupID)
		}
		};
	
	client.events.on("ticket.statusChanged", propertyChangeCallback);
	client.events.on("ticket.groupChanged", groupChangeCallback);
	client.events.on("ticket.typeChanged", typeChangeCallback);
}

