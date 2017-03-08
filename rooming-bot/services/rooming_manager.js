var bluebird = require('bluebird');
var fs = require('fs');
var readFileAsync = bluebird.promisify(fs.readFile);
var GoogleAuth = require('google-auth-library');
var request = bluebird.promisifyAll(require('request'));

var URL = "http://ec2-52-88-210-60.us-west-2.compute.amazonaws.com:8088/rooming/v1";
// var URL = "http://127.0.0.1:8088/rooming/v1";
var roomsMap = undefined;
var bookMap = new Map();
var auth = undefined

var rooming_manager = {

  /*******************************************
   *                FETCHS                    *
   *******************************************/

    // Fetch Rooms giving an access_token
    fetchRooms: function(access_token) {
        return request.getAsync(`${URL}/rooms?access_token=${access_token}`)
        .then( response => {      
            if (response.statusCode === 200) {
                return response.body;
            } else if (response.statusCode === 400) {
                return bluebird.reject("Token expired");
            }
        });
    },

    // Fetch Room giving an access_token and ID
    fetchOneRoom: function(access_token, roomId) {
        return request.getAsync(`${URL}/rooms/${roomId}?access_token=${access_token}`)
        .then( response => {    
            if (response.statusCode === 201) {
                return response.body;
            } else if (response.statusCode === 400) {
                return bluebird.reject("Token expired");
            }
        });
    },

    // Book Room from now to MIN, giving an access_token and ID
    bookRoomForMinutes: function(access_token, roomId, minutes, userEmail) {
        var startDate = new Date();
        var endDate = new Date((new Date()).getTime() + minutes*60000);
        var attendees = [];
        if (userEmail !== undefined) {
            attendees.push(userEmail);
        }
        var body = {
            "roomId": parseInt(roomId),
            "calendar": {
                "startingTime": startDate.toString(),
      	        "endingTime": endDate.toString()
            },
            "attendees": attendees
        }

        return request.postAsync({
            headers: {'content-type' : 'application/json'},
            url: `${URL}/book?access_token=${access_token}`,
            body: body,
            json: true,
        })
        .then( response => {    
            if (response.statusCode === 201) {
                this.saveBook(userEmail, response.body.name.toLowerCase(), response.body.eventId);
                return response.body.name.concat(" booked for: ").concat(minutes).concat(" minutes");
            } else if (response.statusCode === 406) {
                return " CANT be booked for: ".concat(minutes).concat(" minutes");
            } else if (response.statusCode === 400) {
                return bluebird.reject("Token expired");
            }
        });
    },

    // Filter rooms by parameters
    filterRooms: function(access_token, parameters) {
        var people = (parameters.people === undefined) ? 0:parameters.people;
        var features = (parameters.features === undefined) ? []:parameters.features;
        var office = (parameters.office === undefined) ? 'BA':parameters.office;

        var body = {
            "people": parseInt(people),
            "features": features,
            "office": office,
        }

        return request.postAsync({
            headers: {'content-type' : 'application/json'},
            url: `${URL}/rooms/filter?access_token=${access_token}`,
            body: body,
            json: true,
        })
        .then( response => {    
            if (response.statusCode === 201) {
                return response.body;
            } else if (response.statusCode === 400) {
                return bluebird.reject("Token expired");
            }
        });
    },

    // Delete meeting giving an access token, user email and roomName (where meeting will take place)
    deleteMeeting: function(access_token, userEmail, roomName) {
        if (!bookMap.has(userEmail) || !bookMap.get(userEmail).has(roomName)) {
            return bluebird.resolve("You have not meetings in this room");
        }
        var eventId = bookMap.get(userEmail).get(roomName);

        return request.deleteAsync({
            headers: {'content-type' : 'application/json'},
            url: `${URL}/meetings/${eventId}?access_token=${access_token}`,
        })
        .then( response => {    
            if (response.statusCode === 200) {
                bookMap.get(userEmail).delete(roomName);
                return "Meeting in '".concat(roomName).concat("' has been deleted");
            } else if (response.statusCode === 400) {
                return bluebird.reject("Token expired");
            }
        });
    },


  /*******************************************
   *             ROOMS HELPERS               *
   *******************************************/

    // Giving a roomId, return the roomName associated 
    getRoomId: function(office, roomName) {
        office = office.toLowerCase();
        roomName = roomName.toLowerCase();
        var key = office.concat('-').concat(roomName);
        return this.getRoomsMap()
        .then( roomsMap => {
            if (!roomsMap.has(key)) {
                return bluebird.reject("Invalid Room");
            }
            return roomsMap.get(key);
        })
    },

    // Return a RoomsMap{office-roomName: roomId}
    getRoomsMap: function() {
        if (roomsMap !== undefined) {
            return bluebird.resolve(roomsMap);
        }
        roomsMap = new Map();

        return this.getOauth2()
        .then( oauth2Client => this.fetchRooms(oauth2Client.credentials.access_token))
        .then( JSON.parse )
        .then( rooms => this.updateRoomsMap(rooms))
    },

    // Update rooms Map giving a list of rooms
    updateRoomsMap: function(rooms) {
        for (room in rooms) {
            var roomId = rooms[room].roomId;
            var office = rooms[room].office.toLowerCase();
            var roomName = rooms[room].name.toLowerCase();

            roomsMap.set(office.concat('-').concat(roomName), roomId);
        }
        return bluebird.resolve(roomsMap);
    },


    // Generate Oauth2 Object with credentials
    getOauth2: function() {
        if (auth !== undefined) {
            return bluebird.resolve(auth);
        }
        return readFileAsync('credentials.json')
        .then(JSON.parse)
        .then( credentials => {
            var clientSecret = credentials.web.client_secret;
            var clientId = credentials.web.client_id;
            var redirectUrl = credentials.web.redirect_uris[0];
            var auth = new GoogleAuth();
            var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
            oauth2Client.setCredentials(credentials.web.tokens);
            auth = bluebird.promisifyAll(oauth2Client);
            
            return oauth2Client;
        })
    },

    // Refresh Tokens
    refreshToken: function(oauth2Client) {
        return oauth2Client.refreshAccessTokenAsync()
        .then((tokens) => {
            console.log("Refresh Tokens", tokens);
            oauth2Client.setCredentials(tokens);
            auth = oauth2Client;

            return oauth2Client;
        }).catch((err) => {
            console.log(err);

            return bluebird.reject('Invalid refresh token');
        });
    },

    // Save book
    saveBook: function(userEmail, roomName, eventId) {
        if (!bookMap.has(userEmail)) {
            bookMap.set(userEmail, new Map());
        }

        bookMap.get(userEmail).set(roomName, eventId);
    }
};

module.exports = rooming_manager;