const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const CryptoJS = require('crypto-js');
const nconf = require('nconf');
nconf.env();

if(nconf.get("ENV") == "production"){
    var masterKey = nconf.get("FWSS__FD_SUPPORT_PASSWORD_MANAGER__FD_SUPPORT_PASSWORD_MANAGER_PASSWORD_MANAGER_MASTER_KEY");
    
}
else {
    var masterKey = "cljjcs4Gq8T3k48DIvFzzRMLc2YbxYco4gVhxYvm";
}
exports = {
    
    // Generate webhook and send it to the app notification inbox
    onAppInstallCallback : async function(data){

        console.log("OnInstallEvent Triggered");
        var webhook = await generateTargetUrl();

        await sendWebhookUrl(webhook, data.iparams.notify_email).then(function(){

            console.log(`Webhook URL sent to app admin(s)`);
            renderData(null,{});

        },function(error){

            console.log("Something went wrong while sending Webhook URL via email");
            console.error(error);

        });

    },

    onExternalEventCallback : async function(payload){
        
        // Accept Data key and store it in app DB if not present already

        if(payload.data.data_key){
            $db.get(`datakey`).then(function(){
                console.log(`Data Key already present no changes have been made`);
            },function(error){

                if(error.status == 404)
                console.log(`Registering Data key`);
                
                var encryptedDataKey = CryptoJS.AES.encrypt(payload.data.data_key, masterKey).toString();

                $db.set(`datakey`,{
                    data_key:encryptedDataKey
                }).then(function(){

                    console.log("Data key successsfully encrypted and registered");

                }, function(error){

                    console.error("Something went wrong while publishing Data key");
                    console.error(JSON.stringify(error));

                });
            });
        }

        else if(payload.data.old_master_key){

            if(payload.data.admin_email && payload.data.totp && payload.iparams.admin_emails.includes(payload.data.admin_email)){

                $db.get(`${payload.data.admin_email.split("@")[0]}`).then(function(res){
                    var verifyUser = speakeasy.totp.verify({
                        "secret": res.secret,
                        "encoding": "ascii",
                        "token":payload.data.totp
                    });

                    if(verifyUser){
                        $db.get(`datakey`).then(function(data){

                            var dataKey = CryptoJS.AES.decrypt(data.data_key, payload.data.old_master_key).toString(CryptoJS.enc.Utf8);
                            var encryptedDataKey = CryptoJS.AES.encrypt(dataKey, masterKey).toString();
                            $db.update('datakey','set',{"data_key":encryptedDataKey}).then(function(){
                                console.log("Successfully re-encrypted the data key");
                                sendNotification(payload.data.admin_email,"rotateKeys",payload.iparams.notify_email);
                            },function(error){
                                console.error(`Something went wrong ${JSON.stringify(error)}`)
                            });

                        },function(error){
                            if(error.status == 404){
                                console.error(`Data Key not registered, no changes have been made`);
                            }
                            else console.error(`Something went wrong ${JSON.stringify(error)}`);
                        });
                    }

                    else console.log(`Incorrect TOTP provided for ${payload.data.admin_email}`);
                },
                function(error){
                    if(error.status == 404){
                        console.error(`Please register the admin ${payload.data.admin_email} in the app`);
                    }
                    else console.error(`Something went wrong ${JSON.stringify(error)}`);
                })

            }
        }
    },

    verifyUser: async function(data){

        var privateKey = masterKey;
        // Verify user
        if(validateEmail(data.email)){
            console.log("Started verifying user");
            $db.get(`${data.email.split("@")[0]}`).then(function(res){

                var verifyUser = speakeasy.totp.verify({
                    "secret": res.secret,
                    "encoding": "ascii",
                    "token":data.otp
                });

                if(verifyUser){

                    $db.get(`datakey`).then(function(res){

                        var dataKey = CryptoJS.AES.decrypt(res.data_key, privateKey).toString(CryptoJS.enc.Utf8);

                        // Encrypt or decrypt depending on method
                        if(data.method == "encrypt"){
                        
                            console.log("Started encryption");

                            // Encrypt password with timestamp
                            var encryptedpw = CryptoJS.AES.encrypt(data.password + "||" + (Date.now()), dataKey).toString();
                            sendNotification(data.email, "encrypt", data.iparams.notify_email);
                            renderData(null, {status: 200, message: "Success", output: encryptedpw});

                        }
                        else if(data.method ==  "decrypt"){
                            
                            console.log("Started decryption");
                            var decryptedpw = CryptoJS.AES.decrypt(data.password, dataKey).toString(CryptoJS.enc.Utf8);
                            if(decryptedpw && checkExpiry(decryptedpw, data.iparams.expiry)){
                                sendNotification(data.email, "decrypt", data.iparams.notify_email);

                                // Remove timestamp from decrypted password
                                var password = decryptedpw.split("||");
                                password.pop();
                                renderData(null, {status: 200, message: "Success", output: password.join("||")});
                            }
                            else{
                                renderData(null, {status: 400, message: "Encrypted value has expired or is invalid"});
                            }
                        }

                    },function(error){

                        if(error.status == 404){
                            renderData(null,{ status: 404, message: "Data Key not found"});
                        }

                        else{
                            renderData(null,{ status: error.status, message: error.message})
                        }

                    });
                }

                else renderData(null, {status: 403, message: "Invalid OTP"});
                
            }, function(error){
                
                // Request User to verify themselves
                if(error.status==404){
                    console.log("Not found");
                    renderData(null,{status: 404, message: "User has not been registered in the app, please click on verify to register your email"});
                }

                else {
                    console.log("Something went wrong while finding user secret");
                    renderData(null, {status: error.status, message:error.message});
                }
            });
            return;
        }
        else{
            renderData(null, {status:403, message:"This is not a Freshworks email"})
        }
    },


    generateQR : async function(data){

        console.log(data);
        if(validateEmail(data.email)){
            var secret = speakeasy.generateSecret({
                "name":`${data.email.split("@")[0]}@${data.domain.domainName.split(".")[0]}:password-manager`
            });

            $db.get(`${data.email.split("@")[0]}`).then(function(){

                $db.update(`${data.email.split("@")[0]}`,"set",{secret:secret.ascii}).then(
                    function(){
                        
                        // Generate QR code, update user secret and send email
                        console.log(`User updated for ${data.email.split("@")[0]}`);

                        qrcode.toDataURL(secret.otpauth_url, function(err, res){

                            sendVerificationEmail(data.email,res).then(function(){
                                sendNotification(data.email, "updatedUser", data.iparams.notify_email);
                                renderData(null, {status: 200, new_user: false, message:"Success"});

                            }).catch(function(err){

                                console.error(err);
                                renderData(null, {status: 500, message:err});

                            });
                        });
                    }, function(error){
                        console.error(`Something went wrong`);
                        console.error(JSON.stringify(error));
                    }
                )
            }, function(error){

                if(error.status ==404){

                    $db.set(`${data.email.split("@")[0]}`,{
                        secret: secret.ascii
                    }).then(
                        function(){

                            // Generate QR code, register user and send email
                            console.log(`User Created for ${data.email.split("@")[0]}`)
                            qrcode.toDataURL(secret.otpauth_url, function(err, res){

                                sendVerificationEmail(data.email,res).then(function(){

                                    sendNotification(data.email, "newUser", data.iparams.notify_email);
                                    renderData(null, {status: 200, new_user: true, message:"Success"});

                                }).catch(err=>console.error(err));
                            });
            
                        }, function(error){

                            console.error("Something went wrong while setting email secret");
                            console.error(JSON.stringify(error));
                            renderData(null, {status:500 , message: error.message});

                        }
                    );
                }
                else{

                    console.error(error);
                    renderData(null, {status: 500, message:error.message});

                }
            });
        }
        else{
            renderData(null, {status:403, message:"This is not a Freshworks email"});
        }
    }
}

async function sendVerificationEmail(toEmail,qrCode){

    var name = "";
    for(word of toEmail.split("@")[0].split(".")){
        name += word.charAt(0).toUpperCase() + word.slice(1) + " ";
    }
    var email = {
        "from":
        {
            "name":"Freshworks Support",
            "email":"support@freshworks.com"
        },
        "to":[
            {
                "name":name,
                "email":toEmail
            }
        ],

        "subject": "Verification for Password encryption app",
        "html":`<html><body>Hi ${name},<br><br>Please scan the attachment in this email to enable 2FA for your profile. This will help you access the encryption app.<br><br>Regards<br>Freshdesk Support</body></html>`,
        "accountId":2,
        "attachments":[
            {
                "filename":"qrCode.png",
                "content":qrCode.split(",")[1],
                "content-type":"img/png;base64"
            }
        ]
    }

    var res = await $request.invokeTemplate('sendEmail',{
        context:{},
        body:JSON.stringify(email)
    });
    console.log(`Verification Email sent to ${toEmail}`);
    return JSON.parse(res.response);

}

async function sendWebhookUrl(url,toEmail){

    var email = {
        "from":
        {
            "name":"Freshworks Support",
            "email":"support@freshworks.com"
        },
        "to":[
            {
                "name":"2FA App admin",
                "email":toEmail
            }
        ],

        "subject": "Webhook URL for 2FA custom app",
        "html":`<html><body>Hi team,<br><br>Please find the webhook URL linked below<br><br>${url}<br><br>Regards<br>Freshdesk Support</body></html>`,
        "accountId":2
    }

    var res = await $request.invokeTemplate('sendEmail',{
        context:{},
        body:JSON.stringify(email)
    });
    console.log(`Webhook email sent to ${toEmail}`);
    return JSON.parse(res.response);
}


async function sendNotification(performer,type,toEmail){

    var email = {
        "from":
        {
            "name":"Freshworks Support",
            "email":"support@freshworks.com"
        },
        "to":[
            {
                "name":"2FA App admin",
                "email":toEmail
            }
        ],
        "accountId":2
    }

    if(type == "encrypt"){
        console.log("Creating encrypt email");
        email.subject = `2FA-app notification: A password was encrypted by ${performer}`;
        email.html = `<html><body>Hi team,<br><br>A password was encrypted by user with the email ${performer}<br><br>Regards<br>Freshdesk Support</body></html>`;
    }
    else if(type == "decrypt"){
        console.log("Creating decrypt email");
        email.subject = `2FA-app notification: A password was decrypted by ${performer}`;
        email.html = `<html><body>Hi team,<br><br>A password was decrypted by user with the email ${performer}<br><br>Regards<br>Freshdesk Support</body></html>`;
    }
    else if(type == "newUser"){
        console.log("Creating new user registered email");
        email.subject = `2FA-app notification: A new user was registered for ${performer}`;
        email.html = `<html><body>Hi team,<br><br>A new user was registered for ${performer}<br><br>Regards<br>Freshdesk Support</body></html>`;
    }
    else if(type == "updatedUser"){
        console.log("Creating user updated email");
        email.subject = `2FA-app notification: A new user secret was registered for ${performer}`;
        email.html = `<html><body>Hi team,<br><br>A secret was updated for user with email ${performer}<br><br>Regards<br>Freshdesk Support</body></html>`;
    }
    else if(type == "rotateKeys"){
        console.log("Creating keys rotated email");
        email.subject = `2FA-app notification: Key was updated by ${performer}`;
        email.html = `<html><body>Hi team,<br><br>Keys were updated by ${performer}<br><br>Regards<br>Freshdesk Support</body></html>`;
    }

    var res = await $request.invokeTemplate('sendEmail',{
        context:{},
        body:JSON.stringify(email)
    });
    console.log(`Notification email sent to ${toEmail}`);
    return JSON.parse(res.response);

}

function validateEmail(email){
    return email.includes("@freshworks.com");
}

function checkExpiry(password, expiry){
    if(parseInt(password.split("||").slice(-1)[0])){
        if((Date.now() - parseInt(password.split("||").slice(-1)[0]))/86400000<expiry){
            return true;
        }
        else return false;
    }
    else return false;
}