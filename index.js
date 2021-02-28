const request = require('request');
const BlizzAPI = require('blizzapi');
const api = new BlizzAPI({
    region: 'eu', //BLIZZARD API SETUP https://develop.battle.net/access/
    clientId: 'xxxxxxxx',
    clientSecret: 'xxxxxx'
});
let apitoken = null;
let apitoken_create = null;
let counter = 0;

const important_ids = [ //ITEM IDS OF TCG Items
    {id:49284,name:"swift spectral tiger"},
    {id:49283,name:"spectral tiger"},
    {id:49290,name:"magic rooster egg"},
    {id:79771,name:"feldrake"},
    {id:54069,name:"blazing hippogryph"},
    {id:72582,name:"corrupted hippogryph"},
    {id:93671,name:"ghastly charger's skull"}];

function getToken(callback) {
    let curr_date = new Date();
    if (apitoken === null || apitoken_create < curr_date) { //Check if Token expired
        apitoken_create = new Date();
        apitoken_create += 3600000;
        api.getAccessToken() //API Call -> Generate Token
            .then((accessToken) => {
                BlizzAPI.validateAccessToken('eu', accessToken)
                    .then((result) => {
                        if (result) {
                            apitoken = accessToken;
                            callback(accessToken);
                        } else {
                            api.getAccessToken()
                                .then((accessToken2) => {
                                    apitoken = accessToken2;
                                    callback(accessToken2);
                                });
                        }
                    });
            });
    } else { //IF Token already exists.
        callback(apitoken);
    }

}
//
//const fs = require('fs');

//let raw_data = fs.readFileSync('auction_data.json');
//let auction_data = JSON.parse(raw_data);
//console.log(auction_data["auctions"].length);

function auction_check(id,token){
        request({headers: {'content-type': 'application/json;charset=UTF-8'},url:'https://eu.api.blizzard.com/data/wow/connected-realm/'+id+'/auctions?namespace=dynamic-eu&locale=en_EU&access_token=' + token,json: true }, function (error, response, body) {
            let resp_code = 0;
            if(response !== undefined ) {
                resp_code = parseInt(response.statusCode);
            }
            if(resp_code === 200) { //API ERROR CHECK -> Doesnt give 4xx Status Codes.
                let auction_data = body["auctions"] || [];

                    if(auction_data.length !== 0) {
                        //console.log("Data Set length: "+auction_data["auctions"].length);
                        auction_data.forEach(function(auction){
                            counter++;
                            let check = important_ids.findIndex(item => item["id"] === auction["item"]["id"]) //Get the Index of important IDS -> check if its in the list
                            if(check > -1) { //IF TRUE FOUND RARE ITEM
                                //item is im ah
                                let server_names="";
                                request({headers: {'content-type': 'application/json;charset=UTF-8'},url:'https://eu.api.blizzard.com/data/wow/connected-realm/'+id+'?namespace=dynamic-EU&locale=en_EU&access_token=' + token,json: true }, function (error, response, body) {
                                    body["realms"].forEach(function (realm) {
                                        server_names = server_names + realm["slug"]+ "/ ";
                                    })
                                    console.log(important_ids[check].name + ' up on Connected Realm-ID: ' + server_names);
                                });

                            } else {
                                //item is not in ah
                            }
                        });
                    }
            }
        });
}

let realms = function(callback){    //Getting all EU-Connected Realms
    let realm_arr = [];
    getToken(function (token) { //Get the Blizzard-API Token
        request({headers: {'content-type': 'application/json;charset=UTF-8'},url:'https://eu.api.blizzard.com/data/wow/connected-realm/index?namespace=dynamic-eu&locale=en_EU&access_token=' + token,json: true }, function (error, response, body) {
            let resp_code = 0;//Request index Site
            if(response !== undefined ) { //CHECK for Data, API DOESNT give an Error State for Failed Requests.
                resp_code = parseInt(response.statusCode);
            }
            if(resp_code === 200) {
                let realm_data = body["connected_realms"]; //Data-Set
                realm_data.forEach(function(realm){
                    //Replacing unneeded part of the Data
                    realm.href= realm.href.replace('https://eu.api.blizzard.com/data/wow/connected-realm/','');
                    realm.href= realm.href.replace('?namespace=dynamic-eu','');
                    realm_arr.push(realm.href);
                });
                callback(realm_arr);//Callback Data
            }
        });
    });
}
//Startup Run

getToken(function(token){
        realms(function(realms){
            let i =0;
            realms.forEach(function(realm){
                i++;
                setTimeout(function(){
                    auction_check(realm,token);
                },i*5*1000);
            });
            console.log("Check Started waiting 1 Hour.");
        });
});
//Every Hour
setInterval(function(){
    getToken(function(token){
        realms(function(realms){
            let i =0;
            realms.forEach(function(realm){
                i++;
                setTimeout(function(){
                    auction_check(realm,token);
                },i*5*1000);
            });
            console.log("Check Started waiting 1 Hour.");
        });
    });
    console.log("Checked "+counter+" Items.");
},60*60*1000);


