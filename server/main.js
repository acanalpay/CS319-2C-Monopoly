const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});

const rooms = [{room_name: "Test", password: "123", selectedBoard: "Template - 1", users: []}];

const characters = [
    //TODO fill the placeholders with char description
    {id: 1, charName: "Character - 1", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum dictum placerat eros, at condimentum odio pretium et. Quisque pellentesque gravida tellus, eget sagittis est vulputate eu. Proin interdum vulputate eleifend. Donec laoreet id erat ac posuere. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi lobortis hendrerit augue. In feugiat congue felis, eget luctus erat ultrices euismod. "},
    {id: 2, charName: "Character - 2", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum dictum placerat eros, at condimentum odio pretium et. Quisque pellentesque gravida tellus, eget sagittis est vulputate eu. Proin interdum vulputate eleifend. Donec laoreet id erat ac posuere. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi lobortis hendrerit augue. In feugiat congue felis, eget luctus erat ultrices euismod. "},
    {id: 3, charName: "Character - 3", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum dictum placerat eros, at condimentum odio pretium et. Quisque pellentesque gravida tellus, eget sagittis est vulputate eu. Proin interdum vulputate eleifend. Donec laoreet id erat ac posuere. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi lobortis hendrerit augue. In feugiat congue felis, eget luctus erat ultrices euismod. "},
    {id: 4, charName: "Character - 4", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum dictum placerat eros, at condimentum odio pretium et. Quisque pellentesque gravida tellus, eget sagittis est vulputate eu. Proin interdum vulputate eleifend. Donec laoreet id erat ac posuere. Interdum et malesuada fames ac ante ipsum primis in faucibus. Morbi lobortis hendrerit augue. In feugiat congue felis, eget luctus erat ultrices euismod. "}
];

const messages = [];

function getUserRoom(userId){
    return rooms.find((room)=>{
        if(room.users.find((user)=>user.id === userId)){
            return true;
        }else{
            return false;
        }
    });
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected ' + rooms.length);
    socket.emit("get_rooms_sb", rooms);

    socket.on("create_room_bs", (args) => {
        // TODO change username
        args.roomModel.users = [{id: socket.id, username: args.username, characterId: -1}];
        rooms.push(args.roomModel);
        socket.join(args.roomModel.room_name);
        socket.emit("change_page_sb", {page: "roomLobbyPage", room: args.roomModel.room_name, users:args.roomModel.users});
        io.emit("get_rooms_sb", rooms);
    });

    socket.on("join_room_bs", (args) =>{
        socket.join(args.roomName);
        let joinedRoom = rooms.find((room)=>room.room_name === args.roomName);
        joinedRoom.users.push({id: socket.id, username: args.username, characterId: -1});
        socket.emit("change_page_sb", {page: "roomLobbyPage", room: args.roomName, users:joinedRoom.users});
        socket.to(args.roomName).emit("update_room_users_sb", {roomName: args.roomName, users:joinedRoom.users} );
    });

    socket.on("start_game_bs", (roomName) => {
        let joinedRoom = rooms.find((room)=>room.room_name === roomName);
        console.log("JOINED ROOM:" + JSON.stringify(joinedRoom, null, 2));
        io.in(roomName).emit("start_game_sb", joinedRoom);
    });


    /**
     * signal_from: get_characters_bs
     * signal_to: get_characters_sb
     * sending character array (s -> nm)
     * */
    socket.on('get_characters_bs', () => {
        io.emit('get_characters_sb', characters);
    });

    /**
     * signal_from: set_character_bs
     * signal_to: set_character_sb
     * setCharObj: {roomName, currentUser, selectedCharId}
     * msgObj: {success, message}
     * */
    socket.on('set_character_bs', (setCharObj) => {
        console.log("SET CHARACTER: ");
        console.log(setCharObj);
        let roomName = setCharObj.roomName;
        let currentUser = setCharObj.currentUser;
        let selectedCharId = setCharObj.selectedCharId;

        let character = characters.find(char => char.id === selectedCharId);

        let roomIndex = rooms.findIndex(room => room.room_name === roomName);
        console.log("BREAKPOINT");
        console.log("ROOMS");
        console.log(rooms);
        console.log("CURRENT USER");
        console.log(currentUser);
        console.log(roomName);
        let userIndex = rooms[roomIndex].users.findIndex(user => currentUser.id === user.id);
        rooms[roomIndex].users[userIndex].characterId = selectedCharId;
        console.log(rooms[roomIndex].users);

        socket.emit('set_character_sb', {success: 1, message: "Your character is set to character with name " + character.charName});
        // socket.emit('set_character_sb', {userId: currentUser.id, charId: selectedCharId});
    });
    socket.on("move_player_bs", (args)=>{
        let playerId = args.playerId;
        let destinationTileId = args.destinationTileId;
        io.in(getUserRoom(playerId).room_name).emit("move_player_sb", args);
    });

    socket.on("update_players_bs", (players)=>{
        console.log("update_players_bs");
        io.in(getUserRoom(players[0].id).room_name).emit("update_players_sb", players);
    });

    socket.on("auction_bs", (args)=>{
        let propertyModel = args.propertyModel;
        let bidAmount = args.bidAmount;
        let userId = args.userId;
        let currentRoom = getUserRoom(userId);
        console.log("Auction for " + propertyModel.name + ": (" + userId + ") bidded " + bidAmount);
        if(!currentRoom.auction) {
            currentRoom.auction = {};
            currentRoom.users.forEach(user=>currentRoom.auction[user.id] = 0);
            currentRoom.auctionStarter = userId;
            // FIRST BID STARTED
        }else{
            if(bidAmount === -1){
                let count = currentRoom.users.length - 2;
                for(let id in currentRoom.auction){
                    if(currentRoom.auction[id] === -1){
                        count--;
                    }
                }
                if(count === 0){
                    // SELL PROPERTY TO THE HIGHEST BID
                    let winnerId;
                    for(let id in currentRoom.auction){
                        if(currentRoom.auction[id] !== -1 && id !== userId){
                            winnerId = id;
                        }
                    }
                    io.to(currentRoom.room_name).emit("auction_sb", {winnerId: winnerId, propertyModel: propertyModel, bidAmount: currentRoom.auction[winnerId], auctionStarter: currentRoom.auctionStarter});
                    delete currentRoom.auction;
                    delete currentRoom.auctionStarter;
                    return;
                }
            }
            // NORMAL BIDDING
            currentRoom.auction[userId] = bidAmount;
        }

        let nextPlayerIndex;
        currentRoom.users.forEach((user, index)=>{
            if(user.id === userId){
                if(index === currentRoom.users.length-1){
                    nextPlayerIndex = 0;
                }else{
                    nextPlayerIndex = index + 1;
                }
            }
        });

        io.to(currentRoom.users[nextPlayerIndex].id).emit("next_state_sb", {stateName: "BidYourTurn", payload: {auction:currentRoom.auction, propertyModel:propertyModel}});
        for (let i = 0; i < currentRoom.users.length; i++) {
            if(i !== nextPlayerIndex){
                io.to(currentRoom.users[i].id).emit("next_state_sb", {stateName: "BidOtherPlayerTurn", payload: {auction:currentRoom.auction, propertyModel:propertyModel}});
            }
        }


    });

    socket.on("update_properties_bs", (args)=>{
        console.log("update_properties_bs");
        socket.to(getUserRoom(args.currentUserId).room_name).emit("update_property_sb", args.properties);
    });

    socket.on("next_state_bs", (arg)=>{
        console.log("next_state_bs");
        let currentRoom = getUserRoom(arg.lastPlayerId);
        let nextPlayerIndex;
        currentRoom.users.forEach((user, index)=>{
            if(user.id === arg.lastPlayerId){
                if(index === currentRoom.users.length-1){
                    nextPlayerIndex = 0;
                }else{
                    nextPlayerIndex = index + 1;
                }
            }
        });
        if(arg.double){
            io.to(arg.lastPlayerId).emit("next_state_sb", {stateName: "playNormalTurn", payload: {}});
            for (let i = 0; i < currentRoom.users.length; i++) {
                if(currentRoom.users[i].id !== arg.lastPlayerId){
                    io.to(currentRoom.users[i].id).emit("next_state_sb", {stateName: "waitOtherPlayerTurn", payload: {}});
                }
            }
        }else{
            io.to(currentRoom.users[nextPlayerIndex].id).emit("next_state_sb", {stateName: "playNormalTurn", payload: {}});
            for (let i = 0; i < currentRoom.users.length; i++) {
                if(i !== nextPlayerIndex){
                    io.to(currentRoom.users[i].id).emit("next_state_sb", {stateName: "waitOtherPlayerTurn", payload: {}});
                }
            }
        }
    });

    socket.on("determineStartOrder_bs", (args)=>{
        let sum = args.sum;
        let userId = args.userId;
        let currentRoom = getUserRoom(userId);
        let currentUser = currentRoom.users.find(user=>user.id===userId);
        currentUser.dice = sum;
        console.log("The player " + currentUser.username + " rolled " + sum);

        let isFinished = true;
        for(let i = 0; i < currentRoom.users.length; i++){
            if(!currentRoom.users[i].dice){
                isFinished = false;
            }
        }
        if(isFinished){
            currentRoom.users.sort((a,b)=>a.dice<b.dice ? 1 : -1);
            console.log("Game is starting. First player is " + currentRoom.users[0].username);
            io.to(currentRoom.users[0].id).emit("next_state_sb", {stateName: "playNormalTurn", payload: {}});
            for(let i = 1; i < currentRoom.users.length; i++){
                io.to(currentRoom.users[i].id).emit("next_state_sb", {stateName: "waitOtherPlayerTurn", payload: {}});
            }
        }
    });

    socket.on('get_messages_bs', () => {
        socket.emit('get_messages_sb', messages);
    });

    socket.on('send_message_bs', (messageObj) => {
        messages.push({sendBy: messageObj.sendBy, message: messageObj.message});
        console.log("MESSAGE ADDED TO MESSAGES - SERVER");
        io.emit('get_messages_sb', messages);
        socket.emit('send_message_sb', {success: 1, message: "Message send to everyone."});
    });

    socket.on('send_message_widget_bs', (messageObj) => {
        socket.broadcast.emit('send_message_widget_sb', messageObj);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});