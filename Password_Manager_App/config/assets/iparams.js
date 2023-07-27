document.addEventListener("DOMContentLoaded", appInitialized);

let email = document.querySelector('#email');
let encrypt = document.querySelector('#encryption');
let expiry = document.querySelector('#expiry');
let adminEmails = document.querySelector('#admin-email');

function appInitialized(){
    app.initialized().then(client =>{
        window.client = client;
        console.log("Woohoo Started");
    })
}

function getConfigs(configs){

    let { notify_email , encrypt, expiry, admin_emails} = configs;
    console.log("Started getConfigs");
    console.log(expiry);
    email.value = notify_email;
    encryption.checked = encrypt;
    adminEmails.value = admin_emails.toString();
    jQuery('#expiry').val(expiry);
    return;
}

function validate(){
    if(email.value == null || email.value == '' || !email.value.includes("@freshworks.com")|| expiry.value == null || expiry.value == ''){
        return false;
    }
    else return true;
}


function postConfigs(){
    return {
        notify_email: email.value,
        encrypt: encryption.checked,
        expiry: parseInt(expiry.value),
        admin_emails: adminEmails.value.split(",")
    }
}