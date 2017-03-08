var bluebird = require('bluebird');
var path = require('path');
var rooming_manager = require('../services/rooming_manager.js')
var fs = require('fs');
var readFileAsync = bluebird.promisify(fs.readFile);

const REFRESH_TOKEN_INITIAL_COUNT = 0;
const CANNOT_PROCCESS_MESSAGE = "Can Not Proccess your Request";

var show_rooms_count = 0;
var available_rooms_count = 0; 
var filter_rooms_count = 0; 
var show_rooms_count = 0; 
var show_room_count = 0;
var book_room_count = 0;
var delete_meeting_count = 0;
var show_help_count = 0;


// Initial rooms Map Load
rooming_manager.getOauth2()
.then(rooming_manager.refreshToken)
.then(oauth2Client => {
    rooming_manager.getRoomsMap(); 
})

module.exports = function (robot) {

  /*******************************************
   *                HEARS                    *
   *******************************************/

  // Listen for Show rooms with complete information
  // robot.hear(/rooms\s*$/i, function(res) {
  //   show_rooms_count += 1;
  //   console.log("Show rooms: ", show_rooms_count, res.message.user.profile.email);

  //   showRooms(res, REFRESH_TOKEN_INITIAL_COUNT, completeFormatToRooms);
  // });

  // Listen for Show rooms with complete information filtering by Office
  robot.hear(/rooms\s+[a-z]+\s*[0-9]*$/i, function(res) {
    show_rooms_count += 1;
    console.log("Show rooms: ",show_rooms_count, res.message.user.profile.email);

    var match = /rooms\s+([a-z]+\s*[0-9]*)$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      filterRooms(res, {"office": office}, REFRESH_TOKEN_INITIAL_COUNT, completeFormatToRooms);
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  }); 

  // Listen for Show rooms with available information
  // robot.hear(/available\s*$/i, function(res) {
  //   available_rooms_count += 1;
  //   console.log("Show Available Rooms: ", available_rooms_count, res.message.user.profile.email);

  //   showRooms(res, REFRESH_TOKEN_INITIAL_COUNT, availableFormatToRooms);
  // });

  // Listen for Show available rooms with complete information filtering by Office
  robot.hear(/available\s+[a-z]+\s*[0-9]*$/i, function(res) {
    available_rooms_count += 1;
    console.log("Show Available Rooms: ", available_rooms_count, res.message.user.profile.email);

    var match = /available\s+([a-z]+\s*[0-9]*)$/i.exec(res.match[0].toLowerCase());   
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      filterRooms(res, {"office": office}, REFRESH_TOKEN_INITIAL_COUNT, availableFormatToRooms);
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  }); 

  // Listen for Show only one room with complete information 
  // giving room ID
  robot.hear(/room\s+[0-9]+$/i, function(res) {
    show_room_count += 1;
    console.log("Show Room id: ", show_room_count, res.message.user.profile.email);

    var match = /room\s+([0-9]+)/i.exec(res.match[0]);
    if (match) {
      var roomId = match[1];
      showOneRoom(res, roomId, REFRESH_TOKEN_INITIAL_COUNT);
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Listen for Show only one room with complete information 
  // giving room Name
  robot.hear(/room\s+[a-z]+\s*[0-9]*\s+[a-z\s0-9]+$/i, function(res) {
    show_room_count += 1;
    console.log("Show Room id: ", show_room_count, res.message.user.profile.email);

    var match = /room\s+([a-z]+\s*[0-9]*)\s+([a-z\s0-9]+)$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      var roomName = match[2].trim();
      rooming_manager.getRoomId(office, roomName)
      .then( roomId => showOneRoom(res, roomId, REFRESH_TOKEN_INITIAL_COUNT))
      .catch( error => res.send(error));
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  }); 

  // Listen Book a room giving the room ID and min Minutes
  robot.hear(/book\s+[0-9]+\s+[0-9]+$/i, function(res) {
    book_room_count += 1;
    console.log("Book Room: ", book_room_count, res.message.user.profile.email);

    const user = res.message.user;
    var match = /book\s+([0-9]+)\s+([0-9]+)$/i.exec(res.match[0]);
    if (match) {
      var roomId = match[1];
      var min = match[2];
      var userEmail = user.profile.email;
      bookRoomForMinutes(res, roomId, min, userEmail, REFRESH_TOKEN_INITIAL_COUNT);
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Listen Book a room giving the room Name and min Minutes
  robot.hear(/book\s+[a-z]+\s*[0-9]*\s+[a-z\s0-9]+\s+[0-9]+$/i, function(res) {
    book_room_count += 1;
    console.log("Book Room id: ", book_room_count, res.message.user.profile.email);

    const user = res.message.user;
    var match = /book\s+([a-z]+\s*[0-9]*)\s+([a-z\s0-9]+)\s+([0-9]+)$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      var roomName = match[2].trim();
      var min = match[3];
      var userEmail = user.profile.email;

      rooming_manager.getRoomId(office, roomName)
      .then( roomId => bookRoomForMinutes(res, roomId, min, userEmail, REFRESH_TOKEN_INITIAL_COUNT))
      .catch( error => res.send(error));
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Delete meeting giving the room name where the meeting will take place
  robot.hear(/delete\s+[a-z\s0-9]+\s*$/i, function(res) {
    delete_meeting_count += 1;
    console.log("Delete Room: ", delete_meeting_count, res.message.user.profile.email);

    const user = res.message.user;
    var match = /delete\s+([a-z\s0-9]+)\s*$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var roomName = match[1].trim();
      var userEmail = res.message.user.profile.email;

      deleteMeeting(res, roomName, userEmail, REFRESH_TOKEN_INITIAL_COUNT)
      .catch( error => res.send(error));
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Filter Rooms by People and Features
  robot.hear(/filter\s+[a-z]+\s*[0-9]*\speople:\s*[0-9]+\s+features:((\s*[a-z]+\s*,?)+)\s*$/i, function(res) {
    filter_rooms_count += 1;
    console.log("Filter Rooms: ", filter_rooms_count, res.message.user.profile.email);

    var match = /filter\s+([a-z]+\s*[0-9]*)\speople:\s*([0-9]+)\s+features:((\s*[a-z]+\s*,?)+)\s*$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      var people = match[2];
      var features = match[3].trim().split(/,|\s*,?\s+/).filter(s => s!== '');
      var parameters = {
        "people": people,
        "features": features,
        "office": office,
      }
      filterRooms(res, parameters, REFRESH_TOKEN_INITIAL_COUNT, completeFormatToRooms); 

    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Filter Rooms by People
  robot.hear(/filter\s+[a-z]+\s*[0-9]*\speople:\s*[0-9]+$/i, function(res) {
    filter_rooms_count += 1;
    console.log("Filter Rooms: ", filter_rooms_count, res.message.user.profile.email);

    var match = /filter\s+([a-z]+\s*[0-9]*)\speople:\s*([0-9]+)$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      var people = match[2];
      var parameters = {
        "people": people,
        "office": office,
      }
      filterRooms(res, parameters, REFRESH_TOKEN_INITIAL_COUNT, completeFormatToRooms);      
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Filter Rooms by Features
  robot.hear(/filter\s+[a-z]+\s*[0-9]*\sfeatures:((\s*[a-z]+\s*,?)+)\s*$/i, function(res) {
    filter_rooms_count += 1;
    console.log("Filter Rooms: ", filter_rooms_count, res.message.user.profile.email);

    var match = /filter\s+([a-z]+\s*[0-9]*)\sfeatures:((\s*[a-z]+\s*,?)+)\s*$/i.exec(res.match[0].toLowerCase());
    if (match) {
      var office = match[1].trim().replace(/\s/g, '');
      var features = match[2].trim().split(/,|\s*,?\s+/).filter(s => s!== '');
      var parameters = {
        "features": features,
        "office": office,
      }
      filterRooms(res, parameters, REFRESH_TOKEN_INITIAL_COUNT, completeFormatToRooms);      
    } else {
      res.send(CANNOT_PROCCESS_MESSAGE);
    }
  });

  // Show Help information
  robot.respond(/help/, function(res) {
    show_help_count += 1;
    console.log("Show Help: ", show_help_count, res.message.user.profile.email);
    showHelp(res);
  });


  /*******************************************
   *                FUNCTIONS                 *
   *******************************************/

  function showOneRoom(res, roomId, refreshTokenCount) {
    return rooming_manager.getOauth2()
    .then( oauth2Client => rooming_manager.fetchOneRoom(oauth2Client.credentials.access_token, roomId))
    .then( JSON.parse )
    .then( room => {
      var roomInArray = [];
      roomInArray.push(room);
      return completeFormatToRooms(roomInArray); 
    })
    .then( rooms => { res.send(rooms); })
    .catch( (err) => {
        console.log("ERROR",err);
        if (refreshTokenCount >= 1) {
            res.send(CANNOT_PROCCESS_MESSAGE);
            return;
        }
        return rooming_manager.getOauth2()
        .then(rooming_manager.refreshToken)
        .then(oauth2Client => {
            showOneRoom(res, roomId, refreshTokenCount + 1); 
        })
    })
  }

  // Shows rooms with available time
  function showRooms(res, refreshTokenCount, formatFunction) {
    return rooming_manager.getOauth2()
    .then( oauth2Client => rooming_manager.fetchRooms(oauth2Client.credentials.access_token))
    .then( JSON.parse )
    .then( rooms => {
        //rooming_manager.updateRoomsMap(rooms);
        return formatFunction(rooms);
    })
    .then( rooms => {
        res.send(rooms);
    })
    .catch( (err) => {
        console.log("ERROR",err);
        if (refreshTokenCount >= 1) {
            res.send(CANNOT_PROCCESS_MESSAGE);
            return;
        }
        return rooming_manager.getOauth2()
        .then(rooming_manager.refreshToken)
        .then(oauth2Client => {
            showRooms(res, refreshTokenCount + 1, formatFunction);
        })
    })
  }

  // Giving a Room id, a min count and email, book a room
  function bookRoomForMinutes(res, roomId, min, userEmail, refreshTokenCount) {
    return rooming_manager.getOauth2()
    .then( oauth2Client => rooming_manager.bookRoomForMinutes(oauth2Client.credentials.access_token, roomId, min, userEmail))
    .then( response => {
        res.send(response);
    })
    .catch( (err) => {
        console.log("ERROR",err);
        if (refreshTokenCount >= 1) {
            res.send(CANNOT_PROCCESS_MESSAGE);
            return;
        }
        return rooming_manager.getOauth2()
        .then(rooming_manager.refreshToken)
        .then(oauth2Client => {
            bookRoomForMinutes(res, roomId, min, refreshTokenCount + 1);
        })
    })
  }

  // Filter rooms by people and features and send this rooms in the response
  function filterRooms(res, parameters, refreshTokenCount, formatFunction) {
    return rooming_manager.getOauth2()
    .then( oauth2Client => rooming_manager.filterRooms(oauth2Client.credentials.access_token, parameters))
    .then( formatFunction )
    .then( rooms => {
        res.send(rooms);
    })
    .catch( (err) => {
        console.log("ERROR",err);
        if (refreshTokenCount >= 1) {
            res.send(CANNOT_PROCCESS_MESSAGE);
            return;
        }
        return rooming_manager.getOauth2()
        .then(rooming_manager.refreshToken)
        .then(oauth2Client => {
            filterRooms(res, parameters, refreshTokenCount + 1, formatFunction);
        })
    })
  }

  // Delete meeting
  function deleteMeeting(res, roomName, userEmail, REFRESH_TOKEN_INITIAL_COUNT) {
    return rooming_manager.getOauth2()
    .then( oauth2Client => rooming_manager.deleteMeeting(oauth2Client.credentials.access_token, userEmail, roomName))
    .then( message => {
        res.send(message);
    })
    .catch( (err) => {
        console.log("ERROR",err);
        if (refreshTokenCount >= 1) {
            res.send(CANNOT_PROCCESS_MESSAGE);
            return;
        }
        return rooming_manager.getOauth2()
        .then(rooming_manager.refreshToken)
        .then(oauth2Client => {
            deleteMeeting(res, roomName, userEmail, refreshTokenCount + 1);
        })
    })
  }

  // Shows Help to use Slack Bot
  function showHelp(res) {
    const helpPath = path.join(__dirname, '../assets/help.txt');
    const helps = fs.readFileSync(helpPath);
    res.send(helps.toString());
  }
  

  // Format rooms to showRooms with complete information
  function completeFormatToRooms(rooms) {
    let attachments = [];

    if (rooms.length <= 0) {
      return bluebird.resolve("```".concat("\n").concat("NO ROOMS").concat("\n").concat("```"));
    }
    for (var pos in rooms) {
      let roomAttachText = "";
      let roomAttachTitle;
      let roomAttachColor;
      var room = rooms[pos];

      // Name
      roomAttachTitle = room.name;
      // ID
      roomAttachText = roomAttachText.concat("Id: ").concat(room.roomId).concat("\n");
      // Office
      // roomAttachText = roomAttachText.concat("_Office:_ ").concat(room.office).concat("\n");
      // People
      roomAttachText = roomAttachText.concat("People: ").concat(room.people).concat("\n");
      // Features
      roomAttachText = roomAttachText.concat("Features: ");
      for (var feature in room.features) {
         if (room.features[feature] === room.features[0]) {
            roomAttachText = roomAttachText.concat(room.features[feature]);
         } else {
            roomAttachText = roomAttachText.concat(" - ").concat(room.features[feature]);
         }
      }
      roomAttachText = roomAttachText.concat("\n\n");

      // Calendar
      if (room.calendar.isAvailable) {
        var roomTime = calculateHours(new Date(room.calendar.availableAt), new Date(room.calendar.nextBooking));
        roomAttachText = roomAttachText.concat("Available for: ").concat(roomTime);
        roomAttachColor = '#439639';
      } else {
        var roomTime = calculateHours(new Date(), new Date(room.calendar.availableAt)); 
        roomAttachText = roomAttachText.concat("Not Available. Free in: ").concat(roomTime);
        roomAttachColor = '#cc0000';
      }

      attachments.push({
        title:     roomAttachTitle,
        color:     roomAttachColor,
        text:      roomAttachText,
        mrkdwn_in: ["text"]
      })      
    }
    return bluebird.resolve({ attachments });
  }

  // Format rooms to showRooms with available information
  function availableFormatToRooms(rooms) {
    var filterRooms = rooms.filter( room => room.calendar.isAvailable);
    return completeFormatToRooms(filterRooms);
  }

 // Giving an start and end time, calculate the hours
 // and minutes beetween them.
  function calculateHours(startTime, endTime) {
    var startTimeDay = startTime.getDay();
    if (startTimeDay !== endTime.getDay()) {
      endTime = (new Date(startTime.getTime())).setHours(23,59,59,999);
    }

    var diffMiliseconds = (endTime - startTime);
    var minutes = Math.round(((diffMiliseconds % 86400000)) / 60000);
    var hours = 0;
    hours = Math.floor(minutes / 60);
    minutes = minutes % 60;

    if (hours === 0) {
        if (minutes <= 1) {
          return (minutes).toString() + " min";
        }
        return (minutes - 1).toString() + " min";
    }
    if (minutes === 0) {
        return hours.toString() + " Hours";
    }

    return hours.toString() + " Hours, " + minutes.toString() + " min";
  };
}
